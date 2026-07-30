# Handoff

## Current Objective

Phase 5 of 7 ("Frontend") of the event-registration rewrite, per `docs/registration-flow-plan.html`. Backend repo is `D:\V4Ideas\Ideali\ideali.api`; this repo is the frontend. Both use branch `sohail/features/event/event-registration`.

Backend Phase 4 ("Payment") is **complete, verified, committed and pushed** as `51566350`.

An organizer-target revenue-plan fee follow-up (not a numbered phase, user-requested mid-P4-review)
is also **complete, verified, committed and pushed** as `cc3972a2`: buyer-target and organizer-target
`AdminRevenuePlanRule` amounts now both reach Stripe's `ApplicationFeeAmount`; organizer's cut is
invoice-anchored (no buyer-visible line) via a nullable `PaymentChargeSnapshot.InvoiceItemId`.
Refund reversal of the application fee is explicitly out of scope (`StripePaymentRefundService`
hardcodes `RefundApplicationFee = false`, shared across Donation/Membership/Event) — flagged as a
follow-up, not silently dropped.

Phase 4 makes an event cart payable by Credit Card, Apple/Google Pay, ACH-USD, PAD-CAD and Cheque, with the Stripe webhook authoritative for settlement and ticket issuance.

## Completed Work

Phases 1-3 are committed: `063bbc74` (P1, invoice-line resolution), `feab63b3` (P2, server-owned pricing), `729cc954` (P3, per-slot attendees + questionnaire answers).

Phase 4, uncommitted, in the order it was built:

1. **Phase 2 defect fixed.** `PriceCartAsync` appended a second set of `InvoiceItem{Charge}` + `PaymentChargeSnapshot` rows on every call, because `ClearPricingArtifacts` was only wired into `EventCartService`. `TotalAmount` stayed correct but the duplicate live charge lines kept balances the payment could never cover, so allocation landed on `PartiallyPaid` and ticket issuance was refused **after a successful charge**. Now `TicketingShared.ResetPricingAsync` runs first and hard-deletes the snapshots (that entity is not `ISoftDelete`).
2. **Coupon survives the cart.** `EventInvoice.DiscountCouponId` + `CouponDiscountAmount` (new nullable columns), written by `PriceCartAsync`, redeemed at settlement. `RedeemCouponAsync` is now self-idempotent, plus a unique index on `DiscountCouponUsages(DiscountCouponId, InvoiceId)`.
3. **`TicketingShared` extraction**: `EnsureCartOpen`, `EnsureCartPayable`, `IsTicketIssuanceAuthorised`, `IssueTicketsForLineAsync`, `ResetPricingAsync`. `ConfirmPurchaseAsync` and the four cart guards now route through them. `ExpireStaleReservationsAsync` no longer reclaims a hold while an Ach/Pad/Cheque payment is live (those settle in days; the grace window is 30 minutes).
4. **Webhook settlement**: `IEventPaymentSettlementService` (declared in SharedKernel, implemented in Organizer, mirroring `IMembershipPaymentStatusService`), plus `case EnumModule.Event` in both notify switches. Also fixed two live `intent.NextAction.Type` NREs on the existing ACH/PAD paths.
5. **Stripe methods**: `CreateEventPaymentIntentAsync` / `CancelEventPaymentIntentAsync`.
6. **`EventCheckoutService`** + `EventCheckoutController`: `POST api/events/cart/{cartUniqueId}/checkout/{intent|cheque|confirm}`.

## Architectural Decisions and Reasons

- **Amount is server-authoritative by construction.** `CreateEventPaymentIntentRequest` has no amount field at all — nothing to spoof.
- **Bank credentials never reach the API.** `EventPaymentIntentRequest` has no bank-account block (unlike the existing shared ACH/PAD requests). Event intents are created with no payment method, no `Confirm`, no `MandateData`; `acss_debit` gets `MandateOptions{sporadic, personal}` at create because the client confirms. Stripe's hosted modal collects the credentials. This is a deliberate tightening versus the donation module, which posts routing/account numbers to the API and then has Stripe collect them again.
- **Charge-model split preserved** because the production frontend keys on it: card + wallet = direct charge on the connected account (`RequestOptions.StripeAccount`; client uses `loadStripe(pk, {stripeAccount})`), ACH + PAD = destination charge on the platform (`OnBehalfOf` + `TransferData.Destination`; client uses `loadStripe(pk)`). `EventPaymentIntentResultDto.StripeAccount` is null for the bank rails so the client reads the split off the wire.
- **`ApplicationFeeAmount` = sum of `PaymentChargeSnapshot` where `SourceType == RevenuePlanRule`, joined to live `InvoiceItem` rows. Read, never recomputed.** Do **not** call `IPlatformChargeService.CalculatePlatformChargesAsync` the way `CreateMembershipPaymentIntent` does: the platform's cut was already collected from the buyer as a charge line that inflated `TotalAmount`, so recomputing pays the platform twice and shorts the organizer. `EventChargeRule` snapshots are the organizer's own surcharges; the `PaymentProcessorFeeRule` line exists to reimburse the organizer for Stripe's cut — taking either as application fee double-charges them.
- **No `EnumInvoiceStatus.Draft`** (the plan doc proposed it; rejected with user agreement). It needs a drop/re-add of the shared `CHK_Invoice_InvoiceStatus` constraint, so every Donation/Membership/Event invoice insert fails if code deploys before the migration; and `PaymentStatusNotifiedAsync` only settles invoices in `PendingPayment`, so a missed `Draft → PendingPayment` flip silently loses a paid order. Replaced by a **derived lock** in `EnsureCartOpen`: no cart edits while a non-`Failed` `InvoicePayment` exists. Better than `Draft` at the goal — it unlocks automatically when an attempt fails.
- **Cheque authority is a row, not a flag.** `IsTicketIssuanceAuthorised` accepts `Paid`, `TotalAmount <= 0`, or a non-`Failed` Cheque payment — a row only an organizer-authenticated endpoint can create. An unpaid card/bank cart still gets the existing "Invoice is not paid yet." rejection.
- **Idempotency needs no new table** (the plan doc proposed `RegistrationIdempotencyKey`). Existing guards converge: reservation-`Confirmed` short-circuit, ticket-count guard, the invoice-status gate, dedupe on `InvoicePayment.ReferenceNo`, plus the new coupon guard.
- **Every live payment attempt is retired before a new intent is issued.** Client secrets are deliberately not stored, so an earlier attempt cannot be handed back — it is cancelled on Stripe and marked `Failed`. Two payable intents on one invoice would let the buyer complete both.
- **Settlement hole closed narrowly.** `PaymentStatusNotifiedAsync` commits `Paid` *before* the module switch, and `HandleWebHookAsync` swallows exceptions so Stripe never retries. A redelivery therefore gets `false` from the gate and would skip settlement. `HandleWebHookAsync` now still dispatches when the gate returns false **and** module is Event **and** type is `payment_intent.succeeded`. Donation/Membership control flow is bit-identical (there is a test proving it).
- **Per-line transaction and try/catch at settlement**, so one bad line (e.g. attendee-count mismatch) cannot deny tickets to the rest of the order; the failed line keeps its Active hold for retry.
- **The cart id is mirrored into a browser cookie, and only the id.** Cookie `ideali_event_cart`, `Path=/events`, `SameSite=Lax`, `Secure` on https only (a Secure cookie is dropped on the plain-http dev server), expiring at `ExpiresAtUtc` + 30 minutes to match `TicketingService.PaymentGraceMinutes`. Written centrally in `useRegistrationCart.applyCart`, so create / add-line / remove-line / restore all refresh the deadline - but **only when the cart holds at least one line**, matching what restore will accept. A cart opens before any line is added, and remembering that empty cart would point the cookie at something restore is bound to reject, stranding the buyer with no timer and no way back. Cleared on payment success, on `resetCart`, and whenever the stored cart comes back unusable. On mount the hook re-fetches the cart and re-prices it; the fetch runs through the same serialized queue as every mutation, and every failure is swallowed inside the effect so a buyer with a dead cookie gets a clean form rather than an error banner. A cart is only resumed when it belongs to this event, its deadline has not passed, and at least one line is still `Active`. Rejected alternatives: a URL query param (cart endpoints are `[AllowAnonymous]`, so the id would leak through history, referrers and shared links); the whole cart in the cookie (4KB limit, and it forks authority away from `Invoice` + `TicketReservation`); a backend cache (in-process `IMemoryCache` — a pool recycle would silently drop the holds that prevent double-sell); `localStorage` (banned in this repo, and it has no expiry, so a stale id would outlive the server's willingness to honour it).

## Files Changed (backend, committed in `51566350` — 15 modified, 12 new)

Modified:
- `src/Modules/Organizer/Ideas.Organizer.Infrastructure/Services/` — `EventCartService.cs`, `EventCartPricingService.cs`, `EventCartAttendeeService.cs`, `TicketingService.cs`, `TicketingShared.cs`
- `src/Modules/Organizer/Ideas.Organizer.Infrastructure/Extensions/ServiceCollectionExtensions.cs`
- `src/Shared/Ideas.PaymentGateway/` — `Services/Merchants/Stripe/StripeService.cs` (**highest-risk file**), `Contracts/Services/Merchants/IStripeService.cs`, `Models/PaymentIntentResponse.cs`, `Models/Stripe/PaymentIntentRequestModels.cs`
- `src/Shared/Ideas.Shared.Domain/Entities/EventInvoice.cs`
- `src/Shared/Ideas.SharedKernel/Persistence/BaseDbContext.Configuration.cs` (shared config; additive columns + one unique index, **no check-constraint change**)
- `src/Shared/Ideas.SharedKernel/Services/Discount/DiscountCouponService.cs`
- `src/Modules/Identity/Ideas.Identity.Persistence/Migrations/IdentityDbContextModelSnapshot.cs`
- `tests/Ideas.API.Tests/Organizer/EventCartPricingServiceTests.cs`

New:
- `src/Shared/Ideas.SharedKernel/Contracts/Modules/Event/IEventPaymentSettlementService.cs`
- `src/Modules/Organizer/Ideas.Organizer.Application/Contracts/Services/IEventCheckoutService.cs`, `Models/EventCheckoutModels.cs`
- `src/Modules/Organizer/Ideas.Organizer.Infrastructure/Services/EventCheckoutService.cs`, `EventPaymentSettlementService.cs`
- `src/Presentation/Ideas.API/Areas/Event/Controllers/EventCheckoutController.cs`
- `src/Modules/Identity/Ideas.Identity.Persistence/Migrations/20260729223220_AddEventInvoiceCouponLink.cs` (+ `.Designer.cs`)
- `tests/Ideas.API.Tests/Organizer/EventCheckoutServiceTests.cs`, `EventPaymentSettlementServiceTests.cs`, `EventCheckoutSqlServerTests.cs`
- `tests/Ideas.API.Tests/Invoice/StripeWebhookEventRoutingTests.cs`

Frontend: no source changes this phase. Untracked planning artifacts only: `HANDOFF_INSTRUCTIONS.md`, `docs/HANDOFF.md`, `docs/registration-flow-plan.html`, `docs/registration-flow-plan.bootstrap.html`.

## Important Commands and Test Results

- Backend suite: `dotnet test tests/Ideas.API.Tests/Ideas.API.Tests.csproj` → **392 passed, 0 failed** (verified).
- Real SQL Server (opt-in, creates and drops its own database):
  `IDEALI_TEST_SQLSERVER="Server=localhost;User Id=sa;Password=test123;MultipleActiveResultSets=true" dotnet test tests/Ideas.API.Tests/Ideas.API.Tests.csproj --filter "FullyQualifiedName~SqlServer"` → 3 `EventCheckoutSqlServerTests` pass. Without the variable they return early.
- Dev DB is `ideali_testing-20260713` on `localhost` (`sa`/`test123`), per `src/Presentation/Ideas.API/Configuration/secrets.SOHAIL-PC.json`. Migration history table is `dbo.__EFMigrationsHistory_Identity`; latest applied is `20260729223220_AddEventInvoiceCouponLink`.
- Migrations: `dotnet ef migrations add <Name> --project src/Modules/Identity/Ideas.Identity.Persistence --startup-project src/Presentation/Ideas.API --context IdentityDbContext`. The API must be stopped first — Visual Studio locks `bin/` DLLs and blocks every build.
- Frontend: `npm run lint` → 0 errors, 1 warning (`react-hooks/incompatible-library` at `src/features/seating-layouts/components/SeatsIoChartCategoriesCard.tsx:98`, pre-existing; React Hook Form's `watch()` cannot be memoized).

### Live smoke test (real Stripe test mode + dev DB) — all passed

Card, end to end: intent `50254 cad` matching the quoted 502.54; `application_fee_amount 200` — only the $2 revenue-plan charge, correctly excluding the organizer's $75.56 event fee and the $4.98 processor fee; metadata `ModuleId=2 / IsWebhook=true / ModuleEntityUniqueId=<invoice UniqueId>`; no `on_behalf_of`/`transfer_data` for card; paid with `pm_card_visa` → `succeeded`. A signed webhook posted to `POST api/public/stripe/web-hook` settled the invoice to `Paid` with zero remaining item balance and issued 2 tickets with the reservation `Confirmed`; redelivering the same webhook issued no duplicates. Method switch cancelled the prior intent on Stripe and left one live attempt and one fee line. Cart edits and re-pricing were both rejected while a payment was in flight. Confirm returned `success:true, IsSettled:false` before payment and identical ticket codes on repeat after.

PAD (temporarily enabled on the dev event, then removed): `acss_debit`, `mandate_options{sporadic, personal}`, `payment_method: null`, `on_behalf_of` + `transfer_data.destination` set, response `stripeAccount` null.

## Known Bugs or Limitations

- **`OrganizerPaymentAccount.UniqueId` has no unique index.** The dev DB had two rows sharing `592D27C7-96BF-4DDF-A899-23D7FC121B3E` (Id 1 / organizer 1 and Id 11 / organizer 63), which made the shared `GetPaymentAccountInfoAsync` throw `Sequence contains more than one element` — this was breaking donation/membership ACH/PAD for both organizers too. Fixed in dev data only (Id 11 got a fresh UniqueId, with user approval). **The missing constraint is still there.**
- `EnumAdminFeeTarget.Organizer` revenue-plan rules do not become application fee — blocked on `PaymentChargeSnapshot.InvoiceItemId` being required, so recording one without inflating `TotalAmount` needs a shared-table migration. Deferred to P5.
- `InvoiceService.GetInvoiceContextAsync` still throws `NotImplementedException` for `EnumModule.Event`; now reachable because event invoices are real paid invoices. P5.
- Event refunds do not reverse application fees (`StripePaymentRefundService` handles `pi_…` references but not `RefundApplicationFee`).
- The dead `POST /webhooks/stripe` controller (log-only, reads `Stripe:WebhookSecret` from appsettings) is still in place. The live path is `POST api/public/stripe/web-hook`, whose secret lives in `dbo.SystemSettingValues` (`Stripe`/`WebhookSecret`).
- Not exercised live: wallet pay (browser sheet only), ACH (needs a USD payment account; dev is CAD), cheque (needs an auth token — covered by unit and real-SQL tests).
- No ticket emails / digital ticket delivery / thank-you on settlement. `Session.EnableDigitalTicket` remains config-only. P6 by design.
- **`PdfService` caches a dead browser forever.** `GetBrowserAsync` returns `_browser` whenever it is non-null, with no `IsConnected` check, so a crashed or OOM-killed Chromium makes every later PDF fail until the app restarts. Membership and donation PDFs both ride this. Related: the required Chromium build is pinned to the `Microsoft.Playwright` NuGet version (1.57.0 wants build 1200), there is no Dockerfile or CI pipeline in the API repo, and no documented browser-install step — so the browser's presence in production is undocumented. It was absent on the dev box, which is how this surfaced. **Event ticket PDFs deliberately avoid all of this by drawing server-side with PdfSharpCore instead** (P6 step 2); these notes are about the shared service the other two modules still use.
- **A refresh restores tickets, totals and the timer, but not typed-in details.** Attendee names and questionnaire answers are only POSTed at final confirm, so nothing exists server-side to restore; the buyer retypes buyer and attendee info. Accepted deliberately — the orphaned hold was the defect, the retyping is not. Submitting per step would fix it but leaves partial attendee data on abandoned carts, and `TicketingShared` throws unless a line's attendees are submitted complete (`perSlotAttendees.Count != reservation.Quantity`).
- **Seats.io is not wired to the event cart, and when it is, its hold must derive from `TicketReservation.ReservedUntilUtc` — never compute its own duration.** Two independently-computed clocks over one seat is a double-sell: whichever expires first frees a seat the other still believes is held. Nothing to fix today (no Seats.io integration exists in the cart path); this is a constraint on whoever adds it.
- Concurrency: two simultaneous first-time issuances for one line are bounded by the per-line transaction and the unique index on `EventTicket.TicketCode`; the count guard makes the loser a no-op on retry. A filtered unique index on `EventInvoiceItem.TicketReservationId` would make it airtight.

## Unfinished Tasks (priority order)

1. **Phase 5 — Frontend**: server returns step list, deadline, totals and validation errors; delete client-side tab logic, price display, savings, quantity limits, purchase validation, subtotal and timer start; questionnaire gets real inputs; split the 4,100-line `EventRegisterWizard.tsx` per this repo's structure rules.
2. Add the unique index on `OrganizerPaymentAccount.UniqueId` (needs a data audit across environments first).
3. Make `PaymentChargeSnapshot.InvoiceItemId` nullable so organizer-target revenue-plan rules can be recorded as application fee.
4. Fix `GetInvoiceContextAsync` for `EnumModule.Event`; delete or repoint the dead `/webhooks/stripe` controller.
5. **Phase 6**: coupon entry UI, digital ticket delivery, thank-you email on settlement, refund policies at checkout. Seats.io out of scope.
6. Delete `HANDOFF_INSTRUCTIONS.md` and the planning HTML files once absorbed.

## Exact Next Action

Plan Phase 5 (frontend) in plan mode, get approval, then implement in this repo.

## Assumptions That Must Not Be Changed

- Donation and membership are live in production. Shared code may only be touched additively, and every shared file touched must be flagged to the user.
- Migrations are additive only. No drops, renames, or type/constraint/index changes on tables live modules use. `CHK_Invoice_InvoiceStatus` is generated from `EnumInvoiceStatus` via `GetEnumItems<T>()`, so adding an enum value forces a constraint migration — this is why `Draft` was rejected.
- The invoice must stay `PendingPayment` while a payment is in flight; `PaymentStatusNotifiedAsync` refuses to settle anything else.
- The application fee is read from persisted `RevenuePlanRule` snapshots, never recomputed. No Event code path may reach `IPlatformChargeService`.
- Card and bank credentials must never reach this API.
- Phases are done one at a time, plan-mode-approved before any code is written. Announce "Phase X of 7" at the start and end of each phase.
- Never commit or push without an explicit ask in that message. No `Co-Authored-By` trailer in either repo.
- Frontend: Chakra UI v3 only, no new dependencies without approval, no `localStorage`/`sessionStorage`, `date-fns` for dates. Event registration UI belongs in this repo, not in the membership checkout.

## Branch and Commit Status

- **Backend** (`D:\V4Ideas\Ideali\ideali.api`): branch `sohail/features/event/event-registration`, HEAD `729cc954` (Phase 3), working tree dirty with all of Phase 4 (15 modified, 12 new). Migration `20260729223220_AddEventInvoiceCouponLink` is already applied to the dev database.
- **Frontend** (this repo): branch `sohail/features/event/event-registration`, HEAD `cc1c1a5 fix(lint): clear remaining exhaustive-deps warnings`, no source changes pending — only the four untracked doc/planning files.
