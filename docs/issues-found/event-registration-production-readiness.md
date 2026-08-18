# Event Registration Backend — Production Readiness Concerns

**Review outcome:** No-go for production until the release blockers below are resolved.

**Production-readiness rating:** 4.5/10  
**Confidence in assessment:** 9/10

## 1. Cart and checkout can bypass event registration rules

**Severity:** Critical — release blocker

The registration read service checks event cancellation, setup state, visibility, member eligibility, and booking dates. The anonymous cart path does not enforce the same policy.

- `EventRegistrationService.ResolveRegistrationStatus` performs the event-level checks.
- `EventCartService.CreateCartAsync` only checks that the event exists.
- `EventCartService.AddLineAsync` and `EventCheckoutService.RevalidateLinesAsync` enforce ticket-level availability, but not event visibility, membership eligibility, event booking dates, publication state, or event/session setup state.

**Why this could be real:** A caller does not have to use the registration UI. If they know valid event, session, and ticket UUIDs, they can call the anonymous cart API directly. This may allow purchases for hidden, member-only, draft, not-ready, or booking-closed events.

**Recommended action:** Create one server-side registration-eligibility policy and call it from cart creation, line mutation, pricing, payment-intent creation, cheque checkout, and free-order confirmation. Add direct-API tests for every denied state.

## 2. Three buyer-facing messaging tests fail — RESOLVED

**Severity:** Was a release blocker. Closed.

`{{EventName}}` no longer resolves blank. `EventPlaceHolderReplacer` reads it from `context.Event.Name`, and both jobs now load the event alongside the invoice — `EventRegistrationConfirmationJob.LoadEventInvoiceAsync` includes `eventInvoice.Event` before building the context, so the placeholder has something to substitute rather than an unloaded navigation.

`EventPlaceHolderReplacerTests`, `EventRegistrationConfirmationJobTests` and `EventTicketDeliveryJobTests` run 63 tests, all passing, including the two that assert the confirmation and ticket bodies read `Registered for Annual Convention.` and the subject falls back to the event name when the organizer leaves it blank.

## 3. SQL Server concurrency tests were not exercised

**Severity:** High

`EventCheckoutSqlServerTests` contains 16 tests for overselling, locking, settlement, constraints, and simultaneous buyers. They return immediately when `IDEALI_TEST_SQLSERVER` is unset. It was unset during this review, so these tests appeared successful without exercising SQL Server.

**Why this could be real:** In-memory EF tests cannot reproduce SQL Server row locks, deadlocks, lock timeouts, computed columns, or database constraints. Those behaviors protect the most financially sensitive portion of checkout.

**Recommended action:** Run these tests against a disposable SQL Server in CI. Report them as genuinely skipped when unavailable, or fail the release pipeline when the required integration-test environment is missing.

## 4. Stripe intent creation has no gateway idempotency key — RESOLVED

**Severity:** Was high risk. Closed.

`StripeService.CreateEventPaymentIntentAsync` now sets `RequestOptions.IdempotencyKey`, and refuses the call with an `ArgumentException` when no key is supplied. The key comes from `EventCheckoutService.BuildIntentIdempotencyKey` — `event-cart-{cartUniqueId}-{method}-{paymentCount}` — so simultaneous requests for one cart resolve to a single intent, while retiring the live attempt moves the payment count on and lets a genuinely fresh attempt mint its own.

Covered by `StripeEventIntentIdempotencyTests` and by three cases in `EventCheckoutServiceTests`: simultaneous requests for one cart, a request after the live attempt is retired, and a second payment method on the same cart.

**Client side, also closed:** the confirm button now raises its busy guard before preparing the purchase rather than when payment starts. Preparation submits attendees and answers, which no gateway idempotency key covers, so a second click there duplicated people on the order. `RegistrationPaymentConfirmation` owns the guard in one place and holds it across the whole confirm.

## 5. Anonymous cart ID acts as the only authorization credential

**Severity:** Medium–high

Cart read, line mutation, attendee submission, questionnaire submission, and checkout confirmation are anonymous and accept only the cart UUID.

**Why this could be real:** UUIDs are difficult to guess, but they can leak through browser history, telemetry, logs, screenshots, support messages, or copied URLs. Anyone possessing one could potentially read or modify personal registration data and checkout state.

**Recommended action:** Bind the cart to a signed, separate capability token or secure browser session. Do not treat the database identifier alone as authorization.

## 6. API error semantics and request validation are incomplete

**Severity:** Medium

- Controllers convert almost every service failure to HTTP 400, including not-found and concurrency conditions.
- Responses do not consistently use typed RFC 7807 errors.
- Buyer/attendee names and phone numbers lack explicit length limits.
- Anonymous requests accept contact IDs without an obvious ownership/organizer validation step.

**Why this could be real:** Incorrect status codes make client retry behavior and monitoring unreliable. Missing bounds can cause database failures or oversized requests. Unvalidated contact references can damage data ownership or association integrity.

**Recommended action:** Map failures to `404`, `409`, `422`, and `503` as appropriate; use Problem Details; add request limits; and validate every supplied contact ID against the permitted user/organizer scope.

## Positive findings

- Cart totals and payable amounts are derived on the server.
- Seats are revalidated and claimed transactionally before payment.
- Ticket issuance is designed to be idempotent across webhooks and return-page confirmation.
- Required questionnaire answers and uploaded files receive server-side validation.
- Coupon availability is rechecked before payment and redemption.
- Recovery, confirmation, and ticket-delivery jobs exist.
- Unit-test coverage across the flow is broad.

## Minimum release gate

1. Enforce one event-registration policy at every write/payment boundary.
2. ~~Fix all three failing messaging tests.~~ Done — see item 2.
3. Run and pass the SQL Server integration suite.
4. ~~Add Stripe idempotency protection and a same-cart concurrency test.~~ Done — see item 4.
5. Decide and implement an explicit anonymous-cart authorization model.

Only after these items pass should the production-readiness rating be reassessed.
