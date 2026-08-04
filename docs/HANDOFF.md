# Handoff — Event Registration (card payment verified; refund + charge rules next)

## Current objective

Card payment processing (create → confirm → decline → 3DS → webhook settlement) is implemented
and e2e-verified against real backend + real Stripe test mode. Refund processing for events does
**not exist** — confirmed by code audit, not assumption. Next planned work: build out refund
handling (including graceful failure/partial-refund/seat-release) and revisit charge rules
(`OrganizerChargeRule`, `AdminRevenuePlanRule`) together, per user direction. Neither has started.

## Repos and branch

Both repos, same branch: `sohail/features/event/event-registration`.

| Repo | Path | Remote | Local HEAD | Matches origin |
|---|---|---|---|---|
| Frontend | `d:\V4Ideas\Ideali\UpcomingDevelopment\ideali-events` | `khatri03/ideali-event-module` | `8692814` | **ahead by 1** (`8692814` unpushed) |
| Backend | `D:\V4Ideas\Ideali\ideali.api` | `ideasregistrationdevelopers/ideali.api` | `42bb6c37` | yes |

Working tree: backend clean. Frontend has `docs/HANDOFF.md` modified (this rewrite) plus 3
untracked scratch files, not part of any active plan — leave as is unless told to remove:
`HANDOFF_INSTRUCTIONS.md`, `docs/registration-flow-plan.bootstrap.html`,
`docs/registration-flow-plan.html`.

## Completed work

Phases 1-5 and P6 (ticket PDF delivery, coupon/refund-policy UI at checkout) are done from prior
sessions — see git history before `107d248` (frontend) / `c5114a6b` (backend) for that detail if
needed. This stretch's work, in order:

**Backend, `c5114a6b..42bb6c37`:**
- `e69f4515` — organizer resend for event tickets (`POST events/invoices/{id}/resend` and
  per-ticket resend), 60-second double-click guard, reuses the auto-delivery render/send path.
- `697d3404` — `TicketDelivery` audit table, one row per send attempt (success or failure).
- `38b887b9` — ticket PDF prints price paid, refund policy, organizer contact; word-wraps long
  names instead of mid-word truncation.
- `2b97594d` — ticket PDF session time converted to event time zone (was printing UTC unlabeled).
- `2a13803f` — fixed `MissingMethodException` on every ticket QR render (PdfSharpCore/ImageSharp
  version mismatch); pinned ImageSharp 3.1.11, bypassed the broken decode path.
- `4eadec92` — card/wallet orders settle at confirm (reads Stripe intent status server-side)
  instead of waiting on the webhook; ACH/PAD still wait, since only Stripe's own status
  distinguishes "settles instantly" from "settles in days."
- `97df58b0` — fixed Payment Element never mounting: credentials endpoint was returning the
  connected account's own publishable key instead of the platform key Stripe.js needs paired with
  `stripeAccount`.
- `f06d6483` — cart edits now void an abandoned Pending payment attempt instead of locking the
  buyer out of their own cart until the hold expired.
- `d322dcd5` — stopped event payment paths from mutating the process-wide `StripeConfiguration.ApiKey`
  (donation/membership/refund paths have the same defect, untouched here — flagged, not fixed).
- `0a426812` — organizer-facing event invoice list/detail/filter-options endpoints (mirrors
  Membership's list conventions).
- `8dfab2db` — reselecting the same payment method reuses the invoice's existing pending
  PaymentIntent instead of cancelling and re-minting one every time.
- `28bc64ee` + `e3dc7cf3` — **oversell fix**: availability was counting reservation *rows* instead
  of summing `Quantity`, and released a hold the instant its browsing timer lapsed even though the
  reclaim job kept it alive through the payment grace window. Both now read one shared predicate
  (`TicketingShared.StillHoldsStockRule`); ticket-type row is locked for the reservation
  transaction's lifetime, capped at a 3-second wait so a rush can't pin a connection for the full
  command timeout.
- `6502bc84` — cart pricing validation was checking `ReservedUntilUtc` directly instead of the
  shared `StillHoldsStock` predicate, so a buyer paying inside their grace window was told their
  own held seats had expired. Fixed to use the shared rule.
- `42bb6c37` — added a 50-concurrent-buyer load test against real SQL Server (20 seats); prior
  coverage only proved no-oversell at 2 threads. Passed: successes never exceed stock, active
  reservation total matches successes exactly.

**Frontend, `107d248..8692814`:**
- `e5a73a8` — confirm dialogs no longer forced full-screen on mobile.
- `60a5813` — moved card entry into the purchase review dialog as a flat tile selector (dropped the
  accordion); Stripe fields mount once the PaymentIntent exists, with a skeleton in between;
  switching payment method clears any in-flight intent so a reselect always gets a fresh one.
- `9a729ca` — Event Invoices browse (paginated, filterable) + detail screens, wired to the new
  backend list/detail endpoints.
- `663d72e` — e2e fix for a stale payment-tile click hidden behind the review dialog.
- `88aa6ec` — replaced hand-rolled card fields with the Stripe Payment Element on the deferred-intent
  flow (form renders before a PaymentIntent exists; intent minted only on confirm). Stripe.js
  initialised with platform publishable key + connected account id. e2e specs retargeted at the
  current test event.
- `a22e950` — dropped the Stripe Link "save my info" checkbox from the card form (asked the buyer
  to make an unrelated decision — save card with Stripe — mid-checkout).
- `8692814` — organizer resend-tickets UI (invoice detail page, per-ticket and "resend all," each
  behind a confirm dialog). Installed `@testing-library/react`, `@testing-library/user-event`,
  `@testing-library/jest-dom`, `@testing-library/dom`, `msw` as dev dependencies — first
  component-test tooling in this repo; wired a vitest setup file for jest-dom matchers + RTL
  cleanup. **Not yet pushed.**

## Architectural decisions and reasons

- **Settlement source of truth is Stripe's own intent status, read server-side at confirm** —
  never trust the client's claim that a card cleared. Card/wallet report `succeeded` immediately;
  ACH/PAD report `processing` and stay owing until the webhook. If Stripe can't be reached, the
  attempt stays pending — an outage must never look like a paid order.
- **One live PaymentIntent per invoice, ever.** Reselecting the same method reuses the pending
  intent (refreshing its amount) rather than cancelling/re-minting; selecting a different method
  retires the old one first.
- **Cart-edit vs payment-lock boundary**: editing the cart voids an abandoned Pending attempt
  automatically. The only edits still refused are the ones that protect money already committed —
  a settled payment, an organizer-recorded cheque, or an intent Stripe won't let you cancel because
  it's already collecting.
- **Oversell prevention is one shared predicate**, not two independently-computed rules. Both
  availability and the reclaim job call `TicketingShared.StillHoldsStockRule`; the reclaim job's
  filter is the logical negation of the same expression, so they cannot drift apart the way they
  did before `e3dc7cf3`/`6502bc84`.
- **Refund does not exist as a feature yet — confirmed by audit, not assumed.**
  `StripePaymentRefundService` exists and is generic across Donation/Membership/Event, but no
  controller or service anywhere calls it for events (or any module — it's fully unwired dead
  code). Where it would matter for events specifically: it never touches `TicketReservation` or
  `EventTicket`, so a refund would leave issued tickets valid and seats never returned to stock;
  the Stripe call and the local DB write are not in one transaction, so a DB failure after a
  successful Stripe refund leaves Stripe and the local invoice disagreeing with no reconciliation;
  it hardcodes `RefundApplicationFee = false`; and it hard-blocks more than one refund per invoice
  (no successive partial refunds). None of this is patched — it needs a real design pass, not a
  quick fix, which is why it's queued as the next body of work rather than touched piecemeal.
- Earlier-phase decisions (server-authoritative payment amount, charge-model split card/wallet vs
  ACH/PAD, application fee read-never-recomputed, no `Draft` invoice status, cheque authority as a
  row not a flag, per-line transaction at settlement, server-owned cart cookie storing only the
  cart id) are unchanged and still governing — see commits `51566350` and `cc3972a2` for the
  original reasoning if touching payment/settlement code.

## Files changed

Backend (`c5114a6b..42bb6c37`, 21 commits): `TicketingShared.cs`, `TicketingService.cs`,
`EventCartService.cs`, `EventCartPricingService.cs`, `EventCheckoutService.cs`,
`EventTicketDeliveryJob.cs` (new `TicketDelivery` table + resend path), `EventTicketPdfModel.cs` /
`SessionTimeFormatter.cs` (new) / PDF drawing code, `StripeService.cs` (publishable-key fix,
`ApiKey` write removal), event invoice list/detail service + controller (new), plus test files:
`EventCartPricingServiceTests.cs`, `TicketingServiceSqlServerTests.cs` (new 50-thread load test),
and others per commit list above.

Frontend (`107d248..8692814`, 7 commits): `RegistrationStripeProvider.tsx` (new),
`StripePaymentFields.tsx` (new, replaces deleted `StripeCardFields.tsx`),
`RegistrationPaymentConfirmation.tsx` (new), `src/api/stripe.ts`, `useStripeCredentials.ts` (new),
`PurchaseReviewDialog.tsx`, `PaymentStep.tsx`, `EventRegisterWizard.tsx`, the new
`features/event-invoices/` folder (list/detail pages, hooks, `api/eventInvoices.ts`), e2e specs
(`event-payment.spec.ts`, `event-payment-failures.spec.ts`, `event-registration.spec.ts`,
`event-registration-persistence.spec.ts`, `registrationFlow.ts`), plus new component-test
dependencies in `package.json`.

## Important commands and test results (this session)

- Backend `dotnet test tests/Ideas.API.Tests/Ideas.API.Tests.csproj` with
  `IDEALI_TEST_SQLSERVER="Server=localhost;Trusted_Connection=True;"` set — **458/458 passed**,
  ~5m8s. No leaked `IdealiPhase0_%` test databases afterward (checked via `sys.databases`).
- Playwright e2e, frontend dev server on **port 3000** (hardcoded in `playwright.config.ts` — CORS
  allow-list in dev DB `dbo.OrgAllowedOrigins` only seeds `localhost:3000`, not 3001):
  - `event-payment.spec.ts` + `event-payment-failures.spec.ts` — **4/4 passed** (card create/confirm,
    declined card, 3DS challenge, terms-acceptance gate).
  - `event-registration-persistence.spec.ts` — **4/4 passed**.
  - `event-registration.spec.ts` — **2/3 passed**; `payment step renders the server-priced
    breakdown` **fails** waiting for text `Third Charge Rule`. Root cause confirmed by direct query
    against dev DB `ideali_testing-20260803`: `dbo.OrganizerChargeRule` has exactly one row for
    organizer 1 (`Tax`, 17.99) — the second charge rule the test expects was never seeded. This is
    a dev-data gap, not a payment-processing regression; the breakdown the UI rendered exactly
    matched what the server actually has configured. Left unfixed, parked with the charge-rule work
    below.
- `npm run lint` — not re-run this session (no frontend source changed beyond `docs/HANDOFF.md`
  this turn).

## Known bugs or limitations

- **Refund is fully unbuilt for every module, event included** — see architectural decision above.
  This is the primary open item.
- `dbo.OrganizerChargeRule` for organizer 1 (dev DB) has only a `Tax` rule; whatever second rule
  `event-registration.spec.ts:132` expects (`Third Charge Rule`) needs to be seeded, or the
  assertion needs to be updated if that rule was deliberately renamed/removed.
- `d322dcd5` fixed the shared `StripeConfiguration.ApiKey` race for event paths only — the same
  defect is still live in donation, membership, and the refund service paths.
- `EnumAdminFeeTarget.Organizer` revenue-plan rules still don't become an application fee
  (`PaymentChargeSnapshot.InvoiceItemId` would need to become nullable) — carried from P4/P5, now
  explicitly bundled with the "charge rules" work the user wants to revisit.
- `OrganizerPaymentAccount.UniqueId` still has no unique index (carried, unaddressed).
- Dead `POST /webhooks/stripe` controller still present alongside the live
  `POST api/public/stripe/web-hook` path (carried, unaddressed).
- `PdfService`'s cached-browser-never-checked-for-liveness issue still affects donation/membership
  PDFs (event ticket PDFs avoid it — they draw server-side with PdfSharpCore, per `38b887b9`).

## Refund plan (next up — concrete, not just "go design it")

Verified schema facts this session, in `D:\V4Ideas\Ideali\ideali.api`:

- `EventTicketStatus` (`src/Shared/Ideas.Shared.Domain/Enums/EventTicketStatus.cs`) already has a
  `Refunded` member — `Active, CheckedIn, Cancelled, Refunded`. Nothing writes it today. The schema
  already anticipated this; only the write path is missing.
- `InvoiceRefund` (`src/Shared/Ideas.Shared.Domain/Entities/InvoiceRefund.cs`) has `InvoiceId`,
  `InvoiceItemId`, `Amount`, `Reason` — no `StripeRefundId`, no status field of its own (status
  lives on `Invoice`/`InvoiceItem`).
- `TicketReservation.ReservationStatus` (`TicketReservationStatus`) and
  `EventTicket.TicketStatus`/`CancelledAtUtc`/`CancelledBy` exist and are unused by refund today.
- `StripePaymentRefundService.RefundAsync`
  (`src/Shared/Ideas.PaymentGateway/Services/Refunds/StripePaymentRefundService.cs:25`) is
  constructor-injected with `IUnitOfWork<BaseDbContext>`, `IEmailSender`, `IOutgoingEmailService`,
  `IImageUrlResolverService`, `Serilog.ILogger` — shared across every module via the generic
  `Invoice`/`InvoiceItem`/`InvoicePayment` chain. `IUnitOfWork<T>` exposes
  `Database.BeginTransactionAsync` (confirmed in `UnitOfWork.cs`) but this method never calls it.

Plan, in build order:

1. **Wrap Stripe call + DB write in one transaction boundary** in `StripePaymentRefundService`.
   Stripe's refund call itself can't be transactional with SQL Server, so the actual fix is:
   catch every exception (not just `StripeException`) around the DB write that follows a
   successful Stripe refund, and on failure write a `Failed`/`NeedsReconciliation` marker rather
   than letting it propagate uncaught — today a post-Stripe DB failure leaves Stripe showing
   refunded and the local invoice still `Paid` with no record of the mismatch.
2. **Event-specific seat release**, additive to the shared service or as an `IEventModule`-only
   hook called after refund succeeds: set `EventTicket.TicketStatus = Refunded`,
   `CancelledAtUtc`/`CancelledBy`; flip `TicketReservation.ReservationStatus` so the seat is no
   longer counted `Active` by `TicketingShared.StillHoldsStockRule` — reuse that same predicate,
   do not write a second one.
3. **Decide and document application-fee reversal** (`RefundApplicationFee`, currently hardcoded
   `false`) — needs a product decision (does the organizer eat the processor fee on a refund?)
   before code changes; flag to user before touching, since this is shared with
   Donation/Membership.
4. **Decide on successive partial refunds** — today `alreadyRefundedAmount > 0` hard-blocks a
   second refund on the same invoice. If partial refunds must be supported for events (e.g.
   refunding one ticket out of three), this guard needs to change to a running-total check instead
   of a boolean gate — again shared code, flag before touching.
5. **Wire an actual Event refund endpoint** — none exists today, in any module. Needs an
   organizer-authenticated controller action (mirrors `EventInvoiceController` conventions) plus a
   frontend action on the Event Invoices detail page (`features/event-invoices/`), guarded the same
   way the new resend actions are (confirm dialog, backend org-ownership check).
6. **Tests**: unit + SQL Server integration covering — Stripe refund succeeds, DB write fails after
   (reconciliation marker written, not silent); Stripe declines/errors (no DB rows written, no
   crash); partial refund arithmetic; seat/ticket status flips correctly; a second refund attempt
   on an already-refunded invoice.
7. Extend the refund notification email to Events — currently Membership-only
   (comment in `StripePaymentRefundService.cs` around line 209 says Donation/Events are "skipped
   for now").

This is money-movement touching a service shared with two live modules — plan-mode sign-off
required before writing any code here, per the assumptions section below.

## Unfinished tasks, priority order

1. **Refund handling** (see plan above, user-flagged, next up).
2. **Charge rules** (bundled with the above, per user direction): revisit `OrganizerChargeRule`
   and `AdminRevenuePlanRule` together — includes seeding/fixing the missing second charge rule
   that `event-registration.spec.ts` expects, and the still-open `EnumAdminFeeTarget.Organizer`
   application-fee gap.
3. Push frontend `8692814` (currently local-only, 1 commit ahead of origin) once you're ready.
4. Carried, not prioritized: unique index on `OrganizerPaymentAccount.UniqueId`; fix the shared
   `StripeConfiguration.ApiKey` race on donation/membership/refund paths; clean up the dead
   `/webhooks/stripe` controller; delete `HANDOFF_INSTRUCTIONS.md` and the planning HTML files once
   no longer needed.
5. **P7 — organizer check-in**: not started, no plan exists yet.

## Exact next action

Scope the refund-handling + charge-rules work into a plan (plan mode) before writing any code —
this touches money-movement and a shared service (`StripePaymentRefundService`), so needs explicit
design sign-off first, same bar as the original payment-intent work.

## Assumptions that must not be changed

- Donation and membership are live in production. `StripePaymentRefundService` is shared — any
  change to it must be flagged to the user before touching it, and tested against all three
  modules, not just Event.
- Migrations are additive only — no drops, renames, or type/constraint/index changes on tables live
  modules use.
- The application fee is read from persisted `RevenuePlanRule` snapshots, never recomputed. No
  Event code path may reach `IPlatformChargeService`.
- Card and bank credentials must never reach this API.
- Event registration UI stays in this repo (`ideali-events`), never in the membership checkout
  repo — per project routing rule.
- Buyer/attendee identity is intentionally not persisted across a refresh — not a bug.
- Never commit or push without an explicit ask in that message, in either repo. No
  `Co-Authored-By` trailer, ever.
- No `npm install` without explicit approval. Frontend: Chakra UI v3 only, no
  `localStorage`/`sessionStorage`, `date-fns` for dates.
- Playwright e2e must run against the frontend dev server on port 3000 — CORS allow-list in the
  dev DB does not include 3001.

## Branch and commit status

- **Backend**: `sohail/features/event/event-registration`, HEAD `42bb6c37`, matches origin, clean.
- **Frontend**: `sohail/features/event/event-registration`, HEAD `8692814`, **1 commit ahead of
  origin** (unpushed), plus the 3 untracked scratch files noted above and this `docs/HANDOFF.md`
  rewrite.
