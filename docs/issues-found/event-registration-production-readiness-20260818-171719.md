# Event Registration Backend — Production Readiness Reassessment

**Review date:** 18 August 2026  
**Scope:** Event registration backend code only  
**Excluded:** `buildspec.yml`, CI/CD configuration, and other DevOps-owned release automation  
**Backend code readiness:** **8.7/10**  
**Assessment confidence:** **9/10**

## Executive summary

The registration backend is substantially safer than during the original review. Event eligibility is enforced at cart and checkout boundaries, anonymous cart routes require a signed capability, Stripe intent creation is idempotent, concurrent invoice creation is serialized, and ticket issuance is protected against concurrent duplication.

No known defect currently suggests routine checkout will lose money or oversell inventory. The remaining concerns are mainly input validation, API error behavior, identity association, and maintainability. The first two issues below should be fixed before an unrestricted production release.

## 1. Checkout buyer name can exceed the database column

**Severity:** Medium-high  
**Files:**

- `src/Modules/Organizer/Ideas.Organizer.Application/Models/EventCheckoutModels.cs`
- `src/Modules/Organizer/Ideas.Organizer.Infrastructure/Services/EventCheckoutService.cs`

`CreateEventPaymentIntentRequest.BuyerName` and `ConfirmEventCheckoutRequest.BuyerName` do not have `[StringLength(255)]`. `EventCheckoutService.SyncBuyerIdentity` can copy either value into `EventInvoice.BuyerName`, whose database column is limited to 255 characters.

### Why this could be a real issue

Cart creation correctly rejects an oversized buyer name, but checkout can overwrite that validated name with an unbounded value. A caller can therefore bypass the earlier validation and cause a database truncation failure during payment-intent creation or free-order confirmation. The buyer may receive a generic checkout failure at the point where payment is expected to complete.

### Required fix

Add `[StringLength(255)]` to both checkout `BuyerName` properties. Extend `EventRegistrationInputLimitsTests` to prove that 255 characters are accepted and 256 characters are rejected for both request types.

### Acceptance criteria

- Both checkout request models reject names longer than 255 characters during model validation.
- No database call is required to detect the invalid value.
- Boundary tests cover 255 and 256 characters.

## 2. Event API failures are mostly returned as HTTP 400

**Severity:** Medium  
**Files:** Event controllers under `src/Presentation/Ideas.API/Areas/Event/Controllers/`

Most controller actions use this pattern:

```csharp
return result.Success ? Ok(result) : BadRequest(result);
```

This converts unrelated failures into the same HTTP status. Examples include missing carts, expired carts, unavailable inventory, concurrency conflicts, closed registration, and temporary payment-provider failures.

### Why this could be a real issue

Clients cannot reliably decide whether to correct input, restart registration, retry later, or stop retrying. Monitoring also records business conflicts and infrastructure failures as identical bad requests. This can hide checkout outages and cause incorrect frontend behavior.

### Required fix

Introduce typed service errors or a central exception/result mapper. Return RFC 7807 Problem Details with stable error codes and suitable statuses:

- `404` for resources that do not exist.
- `409` for cart state, inventory, and concurrency conflicts.
- `422` for valid requests that violate registration rules.
- `503` for temporary payment-provider or database availability failures.
- `400` only for malformed or invalid request input.

### Acceptance criteria

- Event controllers no longer choose status solely from `result.Success`.
- Error responses use one documented Problem Details shape.
- Controller or integration tests cover at least not-found, concurrency, validation, and temporary-provider cases.

## 3. Anonymous callers can associate organizer contacts without proving identity

**Severity:** Medium  
**Files:**

- `src/Modules/Organizer/Ideas.Organizer.Application/Models/EventCartModels.cs`
- `src/Modules/Organizer/Ideas.Organizer.Application/Models/EventCartAttendeeModels.cs`
- `src/Modules/Organizer/Ideas.Organizer.Infrastructure/Services/ContactOwnershipGate.cs`

Anonymous cart creation accepts `BuyerContactId`, and attendee submission accepts `ContactId`. `ContactOwnershipGate` correctly prevents cross-organizer references, but it only proves that the contact belongs to the event organizer. It does not prove that the anonymous caller is that contact or is authorized to act for that contact.

### Why this could be a real issue

Contact IDs are sequential integers. An anonymous caller can try IDs belonging to the event organizer and, when one succeeds, attach registration activity or attendee information to somebody else's contact record. The signed cart capability protects later access to that cart, but it is issued after the initial contact ID has already been accepted.

This is primarily an impersonation and data-integrity risk. It can produce misleading CRM history, reports, and contact-linked registrations.

### Required fix

Choose one explicit policy:

1. Anonymous registration never accepts contact IDs; it stores buyer snapshots and resolves or links contacts server-side after verified identity data is available.
2. Contact IDs are accepted only for authenticated users whose identity is authorized for that contact.
3. A separate short-lived, signed contact-selection capability proves that the server previously authorized the association.

Do not rely on organizer ownership alone as caller authorization.

### Acceptance criteria

- An anonymous caller cannot attach an arbitrary existing contact to a cart or attendee.
- Organizer staff workflows that legitimately select contacts remain supported through authenticated endpoints.
- Tests cover valid ownership, foreign organizer, missing contact, and unauthorized same-organizer contact.

## 4. Checkout service has excessive transaction responsibility

**Severity:** Medium maintainability risk  
**File:** `src/Modules/Organizer/Ideas.Organizer.Infrastructure/Services/EventCheckoutService.cs`

`EventCheckoutService` is approximately 1,415 lines. It coordinates eligibility, answers, buyer identity, seat claims, cart locking, invoice creation, charges, Stripe attempts, cheque handling, free-order settlement, ticket issuance, and confirmation.

### Why this could be a real issue

Several operations use the same EF Core `DbContext` across separate transaction phases. This already caused a real defect: a tracked cart retained stale invoice state after another transaction updated it. The current code clears the tracker at known lock boundaries, but future changes can easily read another stale tracked entity and recreate the same class of concurrency failure.

Large service size also makes transaction boundaries and retry guarantees difficult to review. A small change to free orders, payment attempts, or issuance can affect another payment path unexpectedly.

### Required fix

Refactor incrementally, without changing behavior. Suggested boundaries:

- Checkout orchestration.
- Seat-claim transaction.
- Invoice creation and line synchronization.
- Payment-attempt lifecycle.
- Free-order settlement.
- Ticket issuance.

Prefer a fresh scoped context for transactionally independent phases instead of depending on repeated `ChangeTracker.Clear()` calls.

### Acceptance criteria

- Each transaction phase has a narrow service or operation with an explicit input and result.
- No entity instance is reused across independent transactions.
- Existing SQL Server concurrency tests remain green.
- Refactor adds no alternate checkout path or duplicate business rule.

## 5. Some post-cart writes do not recheck event eligibility

**Severity:** Low  
**Files:**

- `EventCartAttendeeService`
- `EventCartAnswerService`

Attendee and questionnaire submission require the signed cart capability, but they do not re-evaluate event registration eligibility. Cart creation, line changes, pricing, and checkout do perform that check.

### Why this could be a real issue

A buyer holding a valid cart capability can continue changing attendee or questionnaire data after the event is cancelled, hidden, or closed. Checkout will still refuse completion, so this does not create a payment or inventory bypass. It does create avoidable writes and inconsistent API behavior after registration becomes unavailable.

### Required fix

Call the shared registration gate before attendee and answer mutations, or explicitly document and test that these writes are intentionally allowed until the cart capability expires.

## 6. Attendee database columns do not match request limits

**Severity:** Low  
**Entity:** `EventInvoiceItemAttendee`

Request models bound attendee name, email, and phone lengths, but corresponding database fields remain `NVARCHAR(MAX)`.

### Why this could be a real issue

New API writes are bounded, but old data, imports, maintenance scripts, or another write path can still store unexpectedly large values. This weakens schema-level guarantees and may increase report/export memory use.

### Required fix

Audit existing values, then add a migration that narrows columns to the intended limits. Keep request validation and database limits aligned.

## Deployment checks related to application behavior

These are not CI/CD changes, but production configuration must satisfy them:

- Configure a unique `EventCartCapability:SigningKey` per environment, at least 32 bytes long.
- Use the same signing key on every API instance in one environment.
- Confirm frontend and API are same-site. The capability cookie uses `SameSite=Strict`; a truly cross-site frontend will not send it.
- Keep frontend API client `withCredentials: true`.
- Use retiring-key settings for planned key rotation so active checkouts remain valid.

## Verified strengths

- One shared event-eligibility rule protects cart and checkout boundaries.
- Signed HMAC capability protects every anonymous cart-scoped API route.
- Capability cookie is `HttpOnly`, `Secure`, cart-bound, expiring, and supports safe key rotation.
- Stripe payment intents use gateway idempotency keys.
- Same-cart invoice creation is serialized.
- Concurrent browser and webhook settlement cannot issue duplicate tickets.
- Cart re-pricing resets derived discounts, preventing coupon stacking.
- Zero-total orders settle without creating a fake payment.
- Server owns pricing, totals, seat claims, coupon validation, and ticket issuance.

## Test evidence

Latest complete local run without SQL Server configuration:

- **1,054 total**
- **1,013 passed**
- **0 failed**
- **41 skipped**

Forty skipped tests require `IDEALI_TEST_SQLSERVER`; one skipped test is the endpoint inventory documentation helper. Existing project documentation records successful SQL Server runs, but this review could not independently rerun them because `IDEALI_TEST_SQLSERVER` was unset.

## Recommended implementation order

1. Add checkout buyer-name length validation and tests.
2. Replace blanket HTTP 400 responses with typed Problem Details.
3. Decide and enforce contact identity authorization policy.
4. Refactor checkout transaction phases incrementally.
5. Decide whether attendee and answer writes should recheck event eligibility.
6. Align attendee database column lengths after auditing existing data.

## Final assessment

Backend code is close to production quality. Payment, inventory, cart authorization, and ticket issuance protections are strong. Fixing checkout name validation is small and should happen immediately. API error semantics and contact identity policy require explicit design decisions. Checkout-service refactoring should follow as risk-reduction work rather than a broad rewrite.
