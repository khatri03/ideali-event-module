# Event Registration Backend — Production Readiness Issues

**Review date:** 19 August 2026  
**Backend reviewed:** `D:\V4Ideas\Ideali\ideali.api`  
**Scope:** Public event cart, attendee capture, checkout, payment, ticket issuance, validation, concurrency, and related API behavior.  
**Excluded by instruction:** `buildspec.yml`, CI pipeline configuration, deployment configuration, and other DevOps-owned work.

## Executive summary

Current backend code readiness rating: **9.1/10**. Confidence in this rating: **9/10**.

Recent changes resolved the previously reported checkout input limit, attendee database-column mismatch, eligibility re-check, and oversized checkout-service concerns. Payment idempotency, seat-claim locking, duplicate-ticket protection, server-owned pricing, signed cart access, and zero-value checkout handling are strong.

No confirmed payment-loss, overselling, or duplicate-ticket blocker remains in the reviewed code. Three concerns remain. The anonymous contact-linking concern should be resolved before unrestricted public launch because it affects identity and CRM data integrity.

## Severity definitions

- **Critical:** Direct, likely path to severe data loss, payment compromise, widespread outage, or cross-tenant disclosure. Release blocker.
- **High:** Realistic security or business-integrity failure with material impact. Fix before public production release.
- **Medium:** Production behavior can be incorrect, difficult to recover from, or unreliable under particular conditions. Fix soon; may be accepted temporarily with explicit ownership and monitoring.
- **Low:** Maintainability, consistency, or defense-in-depth weakness with limited immediate operational impact.
- **Verification gap:** Not a confirmed defect. Missing execution evidence reduces confidence that environment-dependent behavior works as intended.

## Issue 1 — Anonymous callers can link registrations to another contact within the same organizer

**Severity:** High  
**Release recommendation:** Fix before unrestricted public launch.

### Evidence

- `CreateEventCartRequest.BuyerContactId` accepts a nullable integer contact ID from an anonymous request:
  `src/Modules/Organizer/Ideas.Organizer.Application/Models/EventCartModels.cs`.
- `LineAttendeeDto.ContactId` accepts the same kind of caller-supplied ID:
  `src/Modules/Organizer/Ideas.Organizer.Application/Models/EventCartAttendeeModels.cs`.
- `EventCartService` and `EventCartAttendeeService` call `ContactOwnershipGate` before storing these links.
- `ContactOwnershipGate` confirms that a contact exists, is not deleted, and belongs to the event organizer:
  `src/Modules/Organizer/Ideas.Organizer.Infrastructure/Services/ContactOwnershipGate.cs`.
- This gate prevents cross-organizer contact use. It does **not** prove that the anonymous caller owns, controls, or is authorized to use that contact record.

### Why this can become a real production issue

Contact IDs are integer identifiers supplied by an unauthenticated client. A caller who obtains or predicts a valid contact ID for the same organizer can associate a purchase or attendee with somebody else's CRM contact. The request passes current ownership checks because the contact and event share an organizer.

Likely consequences:

- Incorrect purchase and attendance history attached to an unrelated person.
- Organizer reports, segmentation, automations, and customer-service decisions based on contaminated CRM data.
- Emails, tickets, or follow-up communication attributed to the wrong contact depending on downstream precedence rules.
- Impersonation disputes that are difficult to audit because the stored foreign key appears structurally valid.

Signed cart capability protection does not solve initial identity binding. The capability is issued for the cart after the caller-provided contact ID has already been accepted.

### Required fix

Choose one explicit identity model:

1. **Verified contact linking:** Require authentication, email OTP, magic-link proof, or a short-lived signed token binding `contactId`, `organizerId`, intended operation, and expiry.
2. **Server-side resolution:** Do not accept raw contact IDs publicly. Resolve or create the contact only after verifying a caller-controlled email or phone channel.
3. **Snapshot-only anonymous registration:** Store buyer/attendee snapshot fields without linking a CRM contact. Reconcile later through a trusted organizer workflow.

Do not treat organizer ownership alone as caller authorization.

### Acceptance criteria

- Anonymous requests cannot attach an arbitrary raw `BuyerContactId` or attendee `ContactId`.
- Any accepted contact link has cryptographic or authenticated proof binding the caller to that exact contact and organizer.
- Expired, reused, modified, cross-organizer, and wrong-contact proofs are rejected.
- Tests cover valid proof, missing proof, tampered proof, expired proof, another contact in the same organizer, and another organizer's contact.
- Logs record rejected link attempts without exposing contact existence or personal data to the caller.

## Issue 2 — Event controllers collapse distinct failures into HTTP 400 responses

**Severity:** Medium  
**Release recommendation:** Fix before API contract is considered stable. Temporary acceptance is possible only if clients depend on stable internal error codes rather than HTTP status alone.

### Evidence

Many event endpoints use the pattern `result.Success ? Ok(result) : BadRequest(result)`, including:

- `src/Presentation/Ideas.API/Areas/Event/Controllers/EventRegistrationController.cs`
- `src/Presentation/Ideas.API/Areas/Event/Controllers/EventCartController.cs`
- `src/Presentation/Ideas.API/Areas/Event/Controllers/EventCheckoutController.cs`
- `src/Presentation/Ideas.API/Areas/Event/Controllers/EventTicketSalesController.cs`
- `src/Presentation/Ideas.API/Areas/Event/Controllers/EventTicketViewController.cs`

This maps business conflicts, missing resources, validation failures, unavailable payment providers, and other failure categories to the same HTTP 400 class unless an exception is handled elsewhere.

### Why this can become a real production issue

HTTP status drives client behavior, observability, retry logic, caching, and support diagnosis. Treating all failures as a malformed request causes practical errors:

- A sold-out or concurrently changed cart should normally be a conflict, not a generic bad request.
- A missing event, cart, ticket, or checkout resource should be distinguishable from invalid input.
- A temporary Stripe/provider problem must not look like permanent client validation failure.
- Frontends cannot reliably decide whether to refresh state, ask the buyer to correct a field, retry later, or stop.
- Monitoring cannot separate client mistakes from inventory conflicts or provider outages using HTTP metrics.

### Required fix

Introduce one centralized mapping from stable application error codes/types to RFC 7807 `ProblemDetails`. Suggested categories:

- `400 Bad Request` for malformed syntax or general request-shape failures.
- `404 Not Found` for absent event/cart/resource where disclosure is safe.
- `409 Conflict` for sold-out inventory, stale cart state, duplicate confirmation, or incompatible state transition.
- `422 Unprocessable Entity` for semantically invalid fields or business validation when the request shape is valid.
- `429 Too Many Requests` for throttling.
- `502 Bad Gateway` or `503 Service Unavailable` for temporary payment/provider dependency failure.

Keep public messages safe. Preserve a stable machine-readable error code, correlation ID, and appropriate field errors.

### Acceptance criteria

- Event controllers use a shared result-to-HTTP mapper instead of endpoint-specific blanket `BadRequest` branches.
- Every known registration and checkout error code has one documented HTTP status.
- Responses use a consistent RFC 7807 shape.
- Controller/endpoint tests verify representative `400`, `404`, `409`, `422`, and dependency-failure responses.
- Frontend handling is updated against the documented contract before changing production behavior.

## Issue 3 — Checkout phases still share one EF Core context across multiple transaction boundaries

**Severity:** Medium  
**Type:** Architecture and future-change risk; no currently reproduced checkout failure.  
**Release recommendation:** Not an immediate blocker, but preserve as explicit technical debt and add guardrails before further checkout changes.

### Evidence

- `EventCheckoutService` is now much smaller and delegates to focused collaborators, which is a significant improvement.
- The service still uses one scoped `IUnitOfWork<OrganizerDbContext>` while orchestrating multiple transactional and non-transactional phases:
  `src/Modules/Organizer/Ideas.Organizer.Infrastructure/Services/EventCheckoutService.cs`.
- Collaborators such as `EventCheckoutInvoiceBuilder`, `EventCheckoutPricing`, and `EventSeatClaim` receive and mutate the same unit of work/context.
- Multiple `SaveChangesAsync` and `ExecuteInTransactionAsync` calls occur during the workflow.
- `EventSeatClaim` explicitly calls `ChangeTracker.Clear()`, showing tracked-state reset is already necessary around lock-based operations:
  `src/Modules/Organizer/Ideas.Organizer.Infrastructure/Services/EventSeatClaim.cs`.

### Why this can become a real production issue

An EF Core context is a stateful identity map. Database rows can change between checkout phases because of concurrent buyers, payment callbacks, or lock-based updates. Already-tracked entities may retain older values even after a later query unless tracking is deliberately cleared, refreshed, or avoided.

This creates a change-sensitive failure class:

- Future code may read stale inventory, invoice, reservation, or payment state after another transaction commits.
- A collaborator may modify a tracked entity that another phase assumes is freshly loaded.
- Retrying one phase can persist unrelated pending changes left in the shared tracker.
- Correctness becomes dependent on knowledge of where `ChangeTracker.Clear()` is required, making safe maintenance harder.

Current row locking and focused tests substantially reduce immediate risk. Concern remains because shared context lifetime crosses business transaction boundaries.

### Required fix

Preferred design: give each independently retryable or transactional phase a fresh scoped `OrganizerDbContext`/unit of work. Pass immutable IDs and value results between phases instead of tracked entity instances.

If refactoring is deferred:

- Use `AsNoTracking` for all read-only phase queries.
- Explicitly reload entities after external calls or committed transactions.
- Clear tracking at documented phase boundaries, not only inside one helper.
- Ensure transaction retries cannot persist changes from an earlier attempt.
- Add concurrency tests that mutate relevant rows between phases and verify fresh state is used.

### Acceptance criteria

- Transactional phases either use separate contexts or have documented, tested tracker-reset/reload boundaries.
- No tracked entity is passed as mutable state between independently committed phases.
- Tests cover concurrent seat changes, invoice state changes, duplicate confirmation, retry after transient failure, and webhook/browser races.
- A failed/retried phase cannot save unrelated changes from an earlier phase.

## Verification limitation — SQL Server integration suite not executed in this review environment

**Classification:** Verification gap, not a confirmed code defect.  
**Confidence impact:** Medium.

The latest full test run completed with **1,147 total tests: 1,106 passed, 0 failed, 41 skipped**. Forty SQL Server-dependent tests were skipped because `IDEALI_TEST_SQLSERVER` was not set. One additional endpoint-inventory documentation helper was skipped.

This matters because SQLite/in-memory tests cannot fully prove SQL Server locking, isolation, filtered indexes, computed columns, provider-specific migrations, or concurrent transaction behavior. Those are important to seat claiming and duplicate-ticket prevention.

No `buildspec.yml` or CI change is requested here. Before production release, retain dated evidence from an environment that runs the current commit's SQL Server suite with zero failures. If the SQL-backed suite already runs elsewhere, link that result to the release record and consider this limitation satisfied.

## Recommended implementation order

1. **High:** Replace anonymous raw contact-ID linking with verified identity binding or snapshot-only registration.
2. **Medium:** Centralize error mapping and return correct RFC 7807 HTTP responses.
3. **Medium:** Isolate EF Core context lifetime by checkout phase, or formally document and test tracker boundaries.
4. **Verification:** Record a successful SQL Server test-suite run for the exact release commit.

## Production decision

**Current recommendation:** Conditional release readiness.

- Suitable for controlled rollout when anonymous contact IDs are not exposed or are disabled.
- Do not enable unrestricted public raw contact-ID linking until Issue 1 is resolved.
- Issues 2 and 3 can be scheduled shortly after release only with explicit ownership, stable client error-code handling, strong monitoring, and no expansion of checkout behavior before tracker boundaries are understood.
- DevOps-owned pipeline and deployment configuration were intentionally not assessed.

## Resolved findings not to reopen

The following prior findings were verified as addressed and should not be sent back to the coding agent as open work:

- Checkout buyer-name length is bounded at the request boundary.
- Attendee name, email, and phone request limits match database column limits.
- Eligibility is re-checked before attendee and custom-answer writes.
- Checkout logic has been decomposed into focused collaborators.
- Stripe payment-intent creation uses idempotency protection.
- Cart access uses a signed, cart-bound capability cookie.
- Seat claims and ticket issuance include concurrency protection.
- Coupon repricing does not stack stale discounts.
- Zero-total orders can settle without Stripe.

