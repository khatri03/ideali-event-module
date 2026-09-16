# Blocker 4 — Book-Before-Settle Settlement State Machine (Design)

**Responds to:** `docs/issues-found/seatsio-backend-remediation-v2.md` Blocker 4
**Backend repo:** `D:\V4Ideas\Ideali\ideali.api`
**Affected flow:** `/events/{eventUniqueId}/register` checkout + payment settlement
**Status:** design only — no code in this document. Nothing here is "done" until its named test is green.
**Production status:** NO-GO until the checklist in §9 is fully struck.
**QA revision:** §11 records eleven bugs/gaps found on a strict QA pass against the live schema and the
existing sweep, and the fix folded into the design for each. Read §11 before building — several are
places where the *current* code actively fights book-before-settle.

---

## 1. Problem restated

Today the seat is first booked at Seats.io by a **background sweep**
(`EventSeatHoldSweepService.ConfirmSoldSeatsAsync`) *after* the order is treated as sold. For a card
charge that captures in the same second this is nearly invisible. For **asynchronous** payment methods
— ACH, PAD, cheque — settlement takes hours to days. During that window the current model has no honest
state: the seat is either wrongly on sale, or the ticket is wrongly Active on money that has not arrived.

The organizer maps payment methods per event. So one event can carry all three timing classes at once.

---

## 2. The decision (settled — do not re-litigate)

Book the seat at Seats.io **on order placement**, regardless of payment timing, because a hold expires in
minutes while settlement can take days. Booking is the only durable way to take the seat off sale for the
buyer who is mid-payment. Payment outcome is resolved later:

- **Success** — issue the ticket, confirm the reservation.
- **Failure** — release the seat back on sale, void the ticket, cancel the invoice.

Three payment classes, three settlement triggers:

| Class | Settle trigger | Reverse trigger |
|---|---|---|
| Card (immediate capture) | inline at checkout | Stripe `charge.refunded` / dispute webhook |
| ACH / PAD (delayed) | `payment_intent.succeeded` webhook | `payment_intent.payment_failed` / ACH-return / dispute webhook |
| Cheque (manual) | organizer marks paid | organizer marks bounced/unpaid (same release path) |

---

## 3. New + changed states

### 3.1 `EventTicketStatus` — add `PendingSettlement`

```
Active, CheckedIn, Cancelled, Refunded                             // today
Active, CheckedIn, Cancelled, Refunded, PendingSettlement, Voided  // proposed — APPEND, do not reorder
```

- `PendingSettlement` — seat booked at vendor, money not yet confirmed. **Not a valid admission.**
  Check-in and QR validation MUST reject it. Attendee holds no usable ticket yet.
- `Voided` — settlement failed; ticket never became valid. Distinct from `Cancelled` (a once-valid
  ticket withdrawn) and `Refunded` (a paid ticket reversed) so reporting does not conflate a payment
  that never cleared with a sale that was undone.

`[Description(...)]` attributes required on both, matching the existing pattern.

**Storage / migration (verified — QA Q3).** `EventTicket.TicketStatus` is stored **as a string**
(`HasConversion<string>()`, `NVARCHAR(50)`) — so appending values does **not** shift any persisted value
and there is no int-reorder hazard. But the table carries a check constraint
`CHK_EventTicket_Status IN ('Active','CheckedIn','Cancelled','Refunded')`
(built from `GetEnumItems<EventTicketStatus>()` at
[BaseDbContext.Configuration.cs:5126-5133](../../../ideali.api/src/Shared/Ideas.SharedKernel/Persistence/BaseDbContext.Configuration.cs#L5126)).
Inserting `PendingSettlement`/`Voided` **fails the constraint** until a migration rebuilds it. The enum
change is not complete without a migration that drops and recreates `CHK_EventTicket_Status` with the two
new names. Append the values at the end regardless, so a stray int-cast anywhere in old data keeps its
meaning.

### 3.2 `TicketReservationStatus` — unchanged, meaning tightened

`Active` now explicitly means **booked at vendor, awaiting settlement**. `Confirmed` means **settled**.
No new value. The transition `Active → Confirmed` is the settlement event; `Active → Cancelled` is the
failure event.

### 3.3 `TicketSeatClaimStatus.Booked` — doc semantics change

Current summary: *"Payment settled and the seat is booked at Seats.io."* Under book-before-settle the
seat reaches `Booked` **before** settlement. Rewrite the XML summary to: *"The seat is booked at
Seats.io and off sale. Reached on order placement; settlement of the order is tracked separately on the
reservation and ticket. Only a refund, a cancellation, or a failed settlement frees it."* The
`BookedAtVendorUtc` stamp keeps its meaning (vendor accepted the booking).

### 3.4 Which index guards against oversell (QA Q4 — do not get this wrong)

Two filtered unique indexes exist. Under book-before-settle **only the seat-claim one is the booking
guard**:

- `UX_TicketReservationSeat_SessionId_ObjectLabel`, filtered on `ClaimStatus IN ('Held','Claimed','Booked')`.
  A seat set to `Booked` at order placement occupies this slot, so a second buyer's claim on the same
  seat is refused **at the database**, not only at Seats.io. This is the real oversell backstop and it
  already covers `Booked`. No change needed.
- `UX_EventTicket_SessionId_SeatObjectLabel`, filtered on `TicketStatus IN ('Active','CheckedIn')`
  ([config:5213-5217](../../../ideali.api/src/Shared/Ideas.SharedKernel/Persistence/BaseDbContext.Configuration.cs#L5213)).
  This does **not** cover `PendingSettlement`, and it must stay that way. Two pending tickets on one seat
  are already impossible because the seat-claim `Booked` slot is unique. **Do not add `PendingSettlement`
  to this filter** — a re-sold seat legitimately has an old voided/refunded ticket and a new pending
  ticket for the same label, and widening this index would refuse the resale.

---

## 4. State machine

Invoice states are the **real** `EnumInvoiceStatus` names, not invented ones (QA Q2):
`PendingPayment → Paid` on success, `PendingPayment → Failed` on a payment that never cleared,
`Cancelled` for an order withdrawn, `Refund` for a settled sale reversed.

```
                        order placed, seats booked at vendor
  Held/Claimed  ────────────────────────────────────────────►  seat: Booked
                                                                 ticket: PendingSettlement
                                                                 reservation: Active
                                                                 invoice: PendingPayment
                        │
         ┌──────────────┴───────────────────────────────┐
         │ settlement success                            │ settlement failure (never cleared)
         ▼                                               ▼
   ticket: Active                                  seat: Released (tokenless, §5)
   reservation: Confirmed                          ticket: Voided
   invoice: Paid                                   reservation: Cancelled
   seat: stays Booked                              invoice: Failed

  ── reversal of an ALREADY-settled sale (refund / ACH return / cheque bounce arriving after Active):
     not this diagram — it is the post-settlement reversal path in §5.1 / QA Q5, and it turns on
     whether the ticket is Active or already CheckedIn.
```

- **Card**: booking + capture + settle happen inside one checkout call **only if capture mode allows
  book-before-charge** — this is unconfirmed and gated by §7.3. If booking fails, no capture. If capture
  fails, release booking. For a good card charge the ticket is written straight to `Active` in the same
  transaction and never rests in `PendingSettlement`. `PendingSettlement` is the resting state only for
  delayed/manual methods. Until §7.3 is proven by a call-order test, do not build the card path on the
  assumption that booking precedes charge.
- **ACH/PAD**: checkout ends at `PendingSettlement`. Webhook drives the split.
- **Cheque**: checkout ends at `PendingSettlement`. Organizer action drives the split. No deadline by
  default → see §7.

---

## 5. Webhook contract (both directions)

Two independent idempotency layers, not one (QA Q7 — the two do different jobs):

1. **Event-replay dedupe** — a processed-events record keyed on the Stripe **event id**. Stops the
   *exact same* event being handled twice on redelivery.
2. **State-precondition guard** — every transition is written only when the row is still in the state
   the transition expects (settle only a `PendingSettlement` ticket; release only a seat still `Booked`
   under *this* reservation). This is what stops two *different* events, or an event and the reconcile
   job, both driving the same outcome — event-id dedupe alone cannot, because a failure can arrive as
   `payment_intent.payment_failed` **or** `charge.refunded` with different ids. Reuse the existing
   already-freed guard pattern (`IsAlreadyFreed`).

The state-precondition write is guarded by **optimistic concurrency** (row version / `WHERE status =
expected`) so a webhook and the reconcile job (§6) racing the same `PendingSettlement` row settle it
**once**, not twice (QA Q6).

| Stripe event | Action |
|---|---|
| `payment_intent.succeeded` | settle **iff ticket still `PendingSettlement`**: ticket `Active`, reservation `Confirmed`, invoice `Paid`. |
| `payment_intent.payment_failed` | fail **iff ticket still `PendingSettlement`**: release seat, ticket `Voided`, reservation `Cancelled`, invoice `Failed`. |
| `charge.refunded` | reverse a **settled** sale — post-settlement path §5.1, not the fail path. |
| `charge.dispute.created` | organizer alert + hold; policy decision, not auto-release (open item §7.2). |
| ACH/PAD return | arrives as `payment_intent.payment_failed` (before settle) or `charge.refunded` (after settle) depending on timing — route by the ticket's current state, not by the event name: `PendingSettlement` → fail path; `Active`/`CheckedIn` → §5.1. |

**Release mechanics (QA Q8, Q10).** A seat in `Booked` is held by nobody at Seats.io, so its release
call goes **tokenless** (empty hold token) — releasing a booked seat under a token is refused and would
strand it off sale. This matches `ReleaseGroupAsync`'s existing booked-vs-held token split. Release
targets the **specific reservation's** seat row (match on reservation / payment-intent, then label),
never label alone: a re-sold seat can have a *new* `Booked` row under a different reservation, and a
label-only release would free the new buyer's seat. Guard: if the currently-`Booked` row for that label
belongs to a different reservation, or the seat is already `Released`/`Expired`, do nothing.

Missing/dropped webhook is not a silent stuck seat: the reconcile job (§6) is the backstop.

### 5.1 Post-settlement reversal — the case the first draft missed (QA Q5)

An asynchronous method can **settle and then reverse**: an ACH/PAD debit clears (ticket → `Active`) and
the bank returns it days later; a cheque is marked paid then bounces; a card charge is refunded or
disputed. By then the ticket is `Active` — possibly `CheckedIn`. The fail path in §5 does **not** apply
(it only fires on a still-`PendingSettlement` ticket). This path turns on whether the seat was consumed:

- Ticket `Active`, **not** checked in: ticket → `Refunded`, invoice → `Refund`, seat released (tokenless)
  and back on sale. Same effect the sweep's `ReadRefundedSeatsAsync` already produces.
- Ticket `CheckedIn` (attendee already admitted on money later reversed): **do not silently free or
  re-sell** — the seat was used. Ticket → `Refunded`, invoice → `Refund`, **organizer alert raised**, and
  the seat is released back on sale only per the organizer's decision. Auto-reselling a seat whose holder
  walked in is a worse failure than holding it. Policy **decided in §7.4** (hold + alert, no auto-resell).

---

## 6. Sweep stays as backstop (not removed)

`EventSeatHoldSweepService` keeps running. Its role narrows and gains a settlement dimension:

- **Keep** `ReleaseLapsedSeatsAsync` (expired holds, cancelled/refunded reservations).
- **Repurpose** `ConfirmSoldSeatsAsync` from "primary booking" to "reconcile stranded state only": for
  `PendingSettlement` rows older than a threshold, re-query Stripe for the true payment status and drive
  the same guarded settle-or-fail transition the webhook would. This catches dropped webhooks. It must
  also re-query the vendor for a `Claimed`-but-`BookedAtVendorUtc == null` row (QA Q9): if checkout
  booked the seat at Seats.io and then crashed before committing the row, the vendor holds a booking our
  rows do not record — reconcile is the only place that mismatch is caught.
- Booking itself moves **into checkout** (synchronous, before capture/issuance) per V2 Blocker 4
  required correction — the sweep no longer performs the *first* booking.
  **Placement DECIDED + IMPLEMENTED (2026-09-16):** *after the claim commits, before the payment intent is
  minted.* Correction to the original wording: `EventSeatClaim.ClaimAsync` sets `ClaimStatus = Claimed`
  (not `Booked`) and commits in its **own** transaction, before `StartPaymentAsync`; and there is **no
  server-side capture** to sit before (the card intent is confirmed client-side). So the `BookSeatsAsync`
  call runs after that committed claim and **before the intent is minted / before cheque issuance**, still
  synchronously in checkout, never inside a locked transaction. This honors the existing rule at `TicketingShared.cs:186` (no vendor network call while
  row locks are held) while making the vendor booking synchronous with order placement. On vendor
  refusal: no capture; void the pending ticket and release the DB claim. `BookedAtVendorUtc` is stamped
  when the vendor accepts, so a stamped row always means the vendor really booked it. The `Booked` DB
  claim can therefore briefly precede `BookedAtVendorUtc` (the window between commit and vendor ack);
  the reconcile pass (crash-orphan recheck, QA Q9) closes any row left `Booked` with a null stamp.

**Critical fix — the sweep currently frees pending seats (QA Q1).** `ReadRefundedSeatsAsync`
([EventSeatHoldSweepService.cs:99-111](../../../ideali.api/src/Modules/Organizer/Ideas.Organizer.Infrastructure/Services/EventSeatHoldSweepService.cs#L99))
selects seats that are `Booked` **and have no ticket in `Active` or `CheckedIn`**, and releases them as
refunded. Under book-before-settle a legitimate `PendingSettlement` ticket is exactly that shape —
`Booked` seat, ticket neither `Active` nor `CheckedIn` — so **the sweep would free the seat out from
under a buyer who is mid-settlement**, putting it back on sale while their ACH/cheque is still clearing.
This is a live conflict, not a future risk. The fix: the "no live ticket" test must treat
`PendingSettlement` (and `Voided` is already terminal-released) as *still spoken for* — release only when
**no** ticket for the seat is in `Active`, `CheckedIn`, **or** `PendingSettlement`. Test:
`Sweep_PendingSettlementSeat_IsNotReleased`.

---

## 7. Policy items — DECIDED

Event module is pre-production and no piece is live, so these are settled here rather than escalated.
Each is a build requirement now, not an open question.

1. **Cheque hold deadline — DECIDED: expire after a configurable deadline, default 7 days.** A cheque
   never verified must not freeze the seat off sale forever. The deadline is an organizer setting
   (`SystemSetting`-backed) defaulting to **7 days** from order placement; past it the order takes the
   §5 fail path (seat released, ticket `Voided`, invoice `Failed`) and the organizer is alerted. An
   organizer-visible "awaiting cheque" list backs it so nothing is silently auto-failed unseen. Reason:
   a permanent freeze hoards inventory; a bounded, visible, configurable window does not.
2. **Dispute (`charge.dispute.created`) — DECIDED: hold + alert, never auto-release.** A dispute is not
   a confirmed reversal. The seat stays `Booked`, the organizer is alerted, and release happens only on
   the dispute's *resolution* (`charge.dispute.closed` lost → §5.1 reversal; won → no change).
3. **Card capture mode — DECIDED: require manual capture (authorize-then-capture) for seated events; a
   test must prove call order before the card path ships.** Book-before-settle for card is only honest
   if the seat is booked *before* the charge is captured, so the seated-event card flow uses a
   PaymentIntent with `capture_method = manual`: authorize at checkout, book the seat, then capture; on
   a booking failure, cancel the authorization (no capture, nothing to refund). This is a decision, not
   a hope — but it still needs `Checkout_BooksSeatsBeforeCapture` green against the real Stripe call
   order before the claim is treated as true. Note (isolation): membership/donation card flows are
   **not** changed by this — the capture mode is set on the event checkout's PaymentIntent only.
4. **Reversal after check-in — DECIDED: hold + organizer alert, never silent auto-resell.** A settled
   payment reversed after the attendee was admitted (ACH return, bounced cheque, dispute lost) leaves
   money gone and the seat used. Ticket → `Refunded`, invoice → `Refund`, organizer alerted; the seat
   returns to sale only on the organizer's action, never automatically. Reason: reselling a seat whose
   holder walked in is the worse failure. Drives §5.1.

---

## 8. Where each piece lives

| Piece | Location |
|---|---|
All landing spots below are **event-isolated** (Organizer/Event modules, event-only enums, or event rows) —
see §12 for why none of this reaches membership or donation.

| Piece | Location |
|---|---|
| `PendingSettlement`, `Voided` enum values | `Ideas.Shared.Domain/Enums/EventTicketStatus.cs` (event-only enum) |
| `CHK_EventTicket_Status` rebuild migration | new migration; constraint built at `BaseDbContext.Configuration.cs:5126-5133` (EventTicket table only) |
| `Booked` summary rewrite | `Ideas.Shared.Domain/Enums/TicketSeatClaimStatus.cs` (event-only enum) |
| Book-before-settle in checkout (stamp `BookedAtVendorUtc` in same txn) | `Ideas.Organizer.Infrastructure/Services/EventCheckoutService.cs` |
| Settle / fail behind the event seam | `Ideas.Organizer.Infrastructure/Services/EventPaymentSettlementService.cs` (impl of `IEventPaymentSettlementService`) |
| Post-settlement reversal (§5.1) + dispute — **new methods on the event interface** | add `HandleChargeRefundedAsync` / `HandleDisputeAsync` to `IEventPaymentSettlementService`; wire the event-only case in the shared webhook dispatcher, membership/donation cases untouched |
| Cheque mark-paid / mark-bounced + 7-day deadline | organizer invoice action endpoint + `EventOrderRecoveryJob` for the deadline sweep |
| Reconcile-stranded settlement + crash-orphan vendor recheck | `EventSeatHoldSweepService.ConfirmSoldSeatsAsync` (repurposed) / `EventOrderRecoveryJob` |
| Pending-not-refunded guard | `EventSeatHoldSweepService.ReadRefundedSeatsAsync` (QA Q1) |

---

## 9. Living checklist — strike only when the named test is green

Rule: an item is struck (`[x]`) **only** when its listed test passes with the backend suite run under
`IDEALI_TEST_SQLSERVER` (so the concurrency/oversell tests execute, not skip). Code written but untested
stays `[ ]` with a note. This checklist is the single source of truth for done.

### Implementation reality & scope decision (2026-09-16)

Building against the live code surfaced that this design was written on partly-stale assumptions, and that
the codebase already runs a **different, complete settlement architecture** than the one the doc proposes.
Recorded here so the two are not conflated:

- **The codebase runs an issue-on-settle model, not book-before-settle.** Checkout claims seats
  (`ClaimStatus = Claimed`, not `Booked`) and raises a `PendingPayment` invoice; **no ticket is created**.
  Tickets are issued **straight to `Active` only when the invoice is `Paid`**
  (`EventPaymentSettlementService`, gated by `TicketingShared.IsTicketIssuanceAuthorised`). Delayed methods
  (ACH/PAD/cheque) hold their seats through settlement via the **reservation** (`StillHoldsStockRule`), not
  a ticket. So §6/§8's claim that seats are `Booked` at checkout is wrong, and §7.3's card capture model
  assumes a server-side capture step that does not exist.
- **Consequence:** the existing model already prevents every substantive harm Blocker 4 lists **except one**
  — there is never an `Active` ticket on unconfirmed money (tickets wait for `Paid`), and DB oversell is
  already blocked by the seat-claim unique index. The one genuine residual gap was that the Seats.io vendor
  booking was deferred to the background sweep, leaving a sold seat visible as *free on other buyers' maps*
  for up to one sweep interval.
- **Done now (the real Blocker-4 correction):** the vendor booking moved into checkout — see the struck
  **Booking boundary** group. This closes the map-visibility window with the sweep demoted to reconcile.
- **Deferred, deliberately (slices 4–7 below: Card-inline / ACH-PAD / Cheque / most of Backstop):** the
  `PendingSettlement` ticket-state machinery is an **alternative re-architecture**, not a bug fix — it re-cuts
  a working, concurrency-hardened settlement flow and the **shared production Stripe webhook dispatcher**
  (`StripeService.HandleWebHookAsync`, which also routes membership + donation — the §12 zero-tolerance
  surface) to add a ticket state the current model does not need. A botched intermediate state on that path
  is worse than none, so it is not a safe unattended change and is left open here rather than reported done.
  The `PendingSettlement`/`Voided` enum values and the QA-Q1 sweep guard (State model + Backstop-Q1 groups)
  stay struck: they are non-breaking and already green, and they leave the door open for that re-architecture
  without forcing it.

### State model
- [x] `EventTicketStatus.PendingSettlement` + `Voided` appended (not reordered), described — `TicketStatus_PendingSettlement_IsNotValidAdmission` ✅ green
- [x] `CHK_EventTicket_Status` migration lets the new values insert — real-SQL `Ticket_PendingSettlement_PersistsWithinCheckConstraint` ✅ green (migration `20260915203807_AddEventTicketPendingSettlementStatus`)
- [x] `Booked` claim-status summary rewritten to book-before-settle meaning — reviewed (doc-only)
- [x] Check-in / QR validation rejects `PendingSettlement` — `CheckIn_PendingSettlementTicket_IsRejected` ✅ green
- [x] `PendingSettlement` NOT added to `UX_EventTicket` index; resale of a released seat still allowed — real-SQL `Resale_ReleasedSeat_NewPendingTicketAllowed` ✅ green

### Booking boundary (V2 Blocker 4 core)
- [x] `BookSeatsAsync` called in checkout before the payment intent is minted — reframed from `Checkout_BooksSeatsBeforeCapture`: there is **no server-side capture step** (the card PaymentIntent is confirmed client-side and settlement is resolved later by `EventPaymentAttempts.SettleFromStripeAsync`/webhook), so "before capture" has no anchor. The honest equivalent — booking runs before the intent is minted and before issuance — is proven by `Checkout_BooksSeatsBeforeTicketIssuance` ✅ green
- [x] `BookSeatsAsync` called before ticket issuance — `Checkout_BooksSeatsBeforeTicketIssuance` ✅ green
- [x] Booking failure → no settle, no ticket — `Checkout_SeatBookingFails_NoSettlementNoTicket` ✅ green
- [x] Booking uses the cart's authoritative hold token — `Checkout_Booking_UsesCartToken` ✅ green
- [x] Sweep is no longer the first booking attempt — `Sweep_IsReconciliationNotFirstBooking` ✅ green (checkout stamps `BookedAtVendorUtc`, so `ConfirmSoldSeatsAsync` finds nothing to book)

Implemented in `EventCheckoutSeatBooking.BookClaimedSeatsAsync`, called from both `EventCheckoutService.CreatePaymentIntentAsync` (before the intent) and `RecordChequePaymentAsync` (before issuance), after the seat claim has committed and outside the payment transaction — honoring the no-vendor-call-under-lock rule at `TicketingShared.cs:186`.

### Card (immediate)
- [ ] Capture mode confirmed against live Stripe config — recorded in doc, not code
- [ ] Good card charge writes ticket `Active` inline, never rests in `PendingSettlement` — `Checkout_CardSuccess_TicketActiveInline`
- [ ] Capture failure after booking releases the seat — `Checkout_CardCaptureFails_SeatReleased`

### ACH / PAD (delayed webhook, both directions)
- [ ] Checkout for delayed method ends at `PendingSettlement`, invoice `PendingPayment` — `Checkout_DelayedMethod_EndsPendingSettlement`
- [ ] `payment_intent.succeeded` settles: ticket Active, reservation Confirmed, invoice Paid — `Webhook_PaymentSucceeded_SettlesTicket`
- [ ] `payment_intent.payment_failed` on pending: releases seat, ticket Voided, invoice Failed — `Webhook_PaymentFailed_ReleasesSeatVoidsTicket`
- [ ] Failed-webhook release is tokenless for a booked seat — `Webhook_PaymentFailed_ReleasesBookedSeatWithoutToken`
- [ ] ACH return AFTER settle refunds + releases (§5.1), not fail path — `Webhook_AchReturnAfterSettle_RefundsAndReleases`
- [ ] ACH return after CHECK-IN holds + alerts, no auto-resell — `Webhook_AchReturnAfterCheckIn_HoldsAndAlerts`
- [ ] Duplicate webhook (same event id) is a no-op — `Webhook_DuplicateDelivery_SettlesOnce`
- [ ] Two different events / webhook+reconcile race settles once (state precondition) — `Settlement_ConcurrentTriggers_AppliesOnce`
- [ ] Out-of-order webhook (fail after success attempt) resolves correctly — `Webhook_OutOfOrder_ResolvesToFinalState`

### Cheque (manual, both directions)
- [ ] Organizer mark-paid settles ticket — `Cheque_MarkPaid_SettlesTicket`
- [ ] Organizer mark-bounced on pending releases seat via same path — `Cheque_MarkBounced_ReleasesSeat`
- [ ] Cheque bounce AFTER settle/check-in follows §5.1 — `Cheque_BounceAfterCheckIn_HoldsAndAlerts`
- [ ] Cheque hold deadline policy implemented per §7 decision — `Cheque_UnverifiedPastDeadline_AutoReleases`

### Backstop + concurrency
- [x] Sweep does NOT release a `PendingSettlement` seat as refunded (QA Q1) — `Sweep_PendingSettlementSeat_IsNotReleased` ✅ green (in-memory: the predicate is provider-agnostic LINQ, run alongside its Refunded/Active siblings)
- [ ] Reconcile job drives stranded `PendingSettlement` off Stripe status — `Reconcile_StrandedPending_SettlesFromStripe`
- [ ] Reconcile catches vendor-booked-but-row-unstamped crash orphan (QA Q9) — `Reconcile_ClaimedButVendorBooked_Stamps`
- [ ] Dropped-webhook seat is recovered by reconcile — `Reconcile_DroppedWebhook_RecoversSeat`
- [x] No oversell: booked seat off sale, second buyer refused — real-SQL ✅ green, covered by `SeatClaim_SeatAlreadyBooked_CannotBeHeldByAnyoneElse` (`SeatClaimUniquenessSqlServerTests`): a `Booked` row and a second buyer's `Held` compete on `UX_TicketReservationSeat_SessionId_ObjectLabel`, the write is refused, and the index name is asserted in the error. Same rule as `Oversell_BookedSeat_SecondBuyerRefused` — not duplicated.
- [ ] Release targets the reservation's seat row, spares a re-sold seat (QA Q10) — `Release_ResoldSeat_SparesNewReservation`
- [ ] Release idempotent, keyed reservation+seat — `Release_DoubleTrigger_FreesOnce`

### Suite gate
- [x] Full backend suite green with `IDEALI_TEST_SQLSERVER` set — ✅ **Passed: 1590, Failed: 0, Skipped: 1, Total: 1591** (18m43s, 2026-09-16, `Ideas.API.Tests`)

---

## 10. Do-not list

- Do not write a ticket to `Active` on an unsettled delayed/manual payment.
- Do not leave `ConfirmSoldSeatsAsync` as the primary booking boundary.
- Do not release a seat the buyer has re-paid or that resold under a new reservation.
- Do not handle only the success webhook — the failure direction is mandatory.
- Do not treat a dropped webhook as acceptable; the reconcile backstop must exist.
- Do not claim "booking precedes charge" for card until a test proves call order.
- Do not let the sweep's `ReadRefundedSeatsAsync` free a `PendingSettlement` seat (QA Q1).
- Do not add `PendingSettlement` to `UX_EventTicket_SessionId_SeatObjectLabel`'s filter (QA Q4) — it breaks resale.
- Do not release a booked seat under a hold token; booked seats free tokenless (QA Q8).
- Do not release by seat label alone — match the reservation, or a re-sold seat is freed (QA Q10).
- Do not use invented invoice states — only `EnumInvoiceStatus` names; a never-cleared payment is `Failed`, not `Cancelled` (QA Q2).
- Do not ship the enum change without the `CHK_EventTicket_Status` migration (QA Q3).
- Do not auto-resell a seat whose holder already checked in (QA Q5 / §7.4).
- Do not strike a checklist item on written-but-untested code.

---

## 11. QA findings register — bugs found on the strict pass, and where each is closed

Every row was checked against the live schema / existing sweep, not assumed. "Closed in design" means the
fix is written into the sections above; it is **not** struck in §9 until its named test is green.

| # | Severity | Finding | Verified against | Closed in |
|---|---|---|---|---|
| Q1 | **Critical** | Sweep `ReadRefundedSeatsAsync` releases any `Booked` seat with no `Active`/`CheckedIn` ticket — a `PendingSettlement` seat matches, so the sweep frees a seat mid-settlement. | `EventSeatHoldSweepService.cs:99-111` | §6, test `Sweep_PendingSettlementSeat_IsNotReleased` |
| Q2 | High | Invoice states in the draft (`Unpaid`/`Authorized`/`Cancelled` for a failed pay) do not exist. Real `EnumInvoiceStatus`: PendingPayment/Paid/Failed/Cancelled/Refund. A never-cleared payment is `Failed`. | `EnumInvoice.cs:5-23` | §4, §5 |
| Q3 | High | Adding enum values fails the `CHK_EventTicket_Status` check constraint on insert until a migration rebuilds it. (No int-reorder risk — stored as string.) | `BaseDbContext.Configuration.cs:5126-5133`, `5192-5194` | §3.1, §8 |
| Q4 | High | Two seat/ticket unique indexes; only the seat-claim one covers `Booked`. Adding `PendingSettlement` to the `EventTicket` index would refuse legitimate resale. | `config:5213-5217`, seat-claim index in remediation-response-v2 | §3.4 |
| Q5 | High | Draft had no path for a payment that settles then reverses after the attendee is `Active`/`CheckedIn` (ACH return, cheque bounce, dispute). Fail path only fires on still-`PendingSettlement`. | state-machine review | §5.1, §7.4 |
| Q6 | High | Webhook and reconcile job can drive the same `PendingSettlement` row at once → double settle. | §5 vs §6 interaction | §5 (optimistic-concurrency precondition), test `Settlement_ConcurrentTriggers_AppliesOnce` |
| Q7 | Medium | "Idempotent on (intent, event id)" conflates two guards; event-id dedupe alone cannot stop two *different* events with the same effect. | Stripe delivery semantics | §5 (two-layer: event-replay + state precondition) |
| Q8 | Medium | Draft did not state release of a `Booked` seat must be **tokenless**; releasing under a token is refused and strands the seat. | `ReleaseGroupAsync:224-262` | §5 |
| Q9 | Medium | Checkout books at vendor then crashes before commit → vendor holds a booking our rows lack; reconcile only looked at `PendingSettlement`. | crash-window analysis of the new checkout boundary | §6, test `Reconcile_ClaimedButVendorBooked_Stamps` |
| Q10 | Medium | Release keyed on seat label alone can free a **re-sold** seat's new `Booked` row. | resale + filtered-index behaviour | §5, test `Release_ResoldSeat_SparesNewReservation` |
| Q11 | Low | §4 asserted card writes `Active` inline while §7.3 says capture mode is unconfirmed — internal contradiction. | §4 vs §7.3 | §4 (claim made conditional on §7.3) |

---

## 12. Production isolation — membership and donation must not be touched

Membership and donation are **live in production**. The event module is not — nothing here is deployed.
So every change in this design is allowed to move event behaviour freely and is **forbidden** from
altering anything membership or donation depends on. This section names every shared surface the design
touches and the guardrail that keeps the blast radius inside the event module.

### 12.1 What is event-only (safe to change freely)

Verified by reference search — no membership or donation code references these:

- `EventTicketStatus`, `TicketReservationStatus`, `TicketSeatClaimStatus` — referenced only under
  `Modules/Organizer` and `Modules/Event`. Adding `PendingSettlement`/`Voided` reaches no other module.
- `EventTicket`, `EventInvoice`, `TicketReservationSeat` — event's own tables/rows, distinct from the
  membership/donation `Invoice`.
- `EventCheckoutService`, `EventPaymentSettlementService`, `EventSeatHoldSweepService`,
  `EventOrderRecoveryJob` — event/organizer services with no membership or donation caller.
- `IEventPaymentSettlementService` — event-only seam; adding `HandleChargeRefundedAsync` /
  `HandleDisputeAsync` to it changes no other module's contract.

### 12.2 Shared surfaces the design touches — and the hard rule for each

| Shared surface | Also used by (prod) | Rule |
|---|---|---|
| `EnumInvoiceStatus` (`EnumInvoice.cs`) | Membership, Donation, Donor, Invoice | **Read only. Do not add, rename, reorder, or re-number a value.** The design consumes existing values (`PendingPayment`/`Paid`/`Failed`/`Cancelled`/`Refund`) for event invoices; it never edits the enum. Adding a value here would touch the check constraint and every module's invoice mapping. |
| `BaseDbContext.Configuration.cs` | Every module's EF config lives in this one file | Edit **only** the `ConfigureEventTicket` region. The migration alters **only** `CHK_EventTicket_Status` on the `EventTicket` table. No other entity's configuration or constraint is touched, so no membership/donation table is migrated. |
| Shared Stripe webhook dispatcher (`StripeController` / `StripeWebhookController`) | Membership + donation settlement branches | Add the event case only, and route it by event payment-intent metadata (`StripeMetadataKeys`) into `IEventPaymentSettlementService`. **Do not modify the membership or donation `case` branches.** The event branch settling or failing must not change control flow reaching the other branches. |
| `StripeService` / `IStripeService` (`Ideas.PaymentGateway`) | Membership + donation charges | If the card path needs `capture_method = manual` (§7.3), set it on the **event checkout's** PaymentIntent creation call, not as a gateway-wide default. Membership/donation PaymentIntents keep their current capture mode. |

### 12.3 Guardrail tests (regression fence, run before any event settlement change is reported done)

- [x] `EnumInvoiceStatus` value set is unchanged — `InvoiceStatus_ValueSet_IsUnchanged` ✅ green
  (`EnumInvoiceStatusGuardrailTests`): asserts the exact eight names/numbers, fails if anyone adds or renames one.
- [x] Membership invoice settlement path is unaffected — existing membership settlement suite stays green (full suite 1590 passed).
- [x] Donation settlement path is unaffected — existing donation suite stays green (full suite 1590 passed).
- [x] The migration's `Up`/`Down` touch only `CHK_EventTicket_Status` — reviewed: `20260915203807_AddEventTicketPendingSettlementStatus`
  drops+adds that one constraint on `EventTicket` only, no other table in the generated migration.
- [x] Webhook dispatch for a membership/donation payment intent still routes to its own handler with an
  event settlement service registered — ✅ green, covered by `Webhook_MembershipSucceeded_DoesNotReachEventSettlement`
  (`StripeWebhookEventRoutingTests`): a signed membership intent reaches `IMembershipPaymentStatusService` once while
  `IEventPaymentSettlementService` (registered in the harness) is never called. Same rule as `Webhook_MembershipIntent_RoutesToMembershipHandler` — not duplicated.

Rule: an event settlement change is **not** done until §12.3 is green **and** §9 is green. A green event
suite over a broken membership/donation path is a failed change, not a passed one.

### 12.4 Scope note

This work is the registration-form / checkout settlement backend only. Event module surfaces already
handed to the frontend React developers are not re-cut here. Anything outside the book-before-settle
settlement path (report screens, check-in entry points, coupon/refund UI) is out of scope for this
design and stays as its own work.
