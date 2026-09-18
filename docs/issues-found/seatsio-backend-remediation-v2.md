# Seats.io Backend Remediation V2 — Implementation Handoff

## Instruction to coding agent

Implement remaining backend corrections described here. Do not stop at analysis. Add tests, run verification, and report exact results. Do not commit unless explicitly asked.

- Backend repository: `D:\V4Ideas\Ideali\ideali.api`
- Affected flow: `/events/{eventUniqueId}/register`
- Frontend work: out of scope for this V2 document
- Production status: **NO-GO**

Preserve user changes unrelated to this task. Inspect current working tree before editing.

## Current verdict

- Overall backend structure: **6.8/10**
- Seats.io backend flow: **6.5/10**
- Verdict confidence: **9/10**

Backend selection path is materially better. Original duplicate-hold race has been removed from this path. Remaining ownership, token-consistency, database-error, and checkout-booking problems still block production.

## Confirmed improvements — keep these

Current implementation correctly adds these behaviors:

1. Interactive `HoldSeatAsync` no longer calls Seats.io `HoldSeatsAsync`.
2. A free or booked object is rejected instead of being locally claimed.
3. An object held under an unrelated token is rejected.
4. Same-cart duplicate claims return current cart without another insert or vendor hold.
5. Seat-taken failures carry `EventCartSeatErrorCodes.SeatTaken` and controller maps them to HTTP `409`.
6. Hold-token validation and extension APIs exist.
7. Database uniqueness remains the final local protection against two live claims.
8. Tests cover several same-token, wrong-token, free-seat, idempotency, and token-extension cases.

Do not remove these changes while fixing remaining defects.

## Blocker 1 — current working-tree exception regression

### Current defect

Current uncommitted edit in:

`src/Modules/Organizer/Ideas.Organizer.Infrastructure/Services/EventCartSeatService.cs`

removed `SeatClaimUniqueIndexName` and changed the filtered catch into:

```csharp
catch (DbUpdateException ex)
```

This is wrong. It converts every database write failure into a fake seat conflict. Timeouts, connection failures, foreign-key failures, and unrelated constraint failures become HTTP `409` with “seat taken.” Real infrastructure faults become hidden and operational diagnosis becomes misleading.

### Required correction

Restore narrow classification:

```csharp
private const string SeatClaimUniqueIndexName =
    "UX_TicketReservationSeat_SessionId_ObjectLabel";

catch (DbUpdateException ex) when (
    TicketingShared.IsUniqueIndexViolation(ex, SeatClaimUniqueIndexName))
```

Only collision on that exact live-seat unique index may become `SeatTakenErrorCode` and HTTP `409`. Every other `DbUpdateException` must continue to normal fault handling.

### Decisive test evidence

Command run:

```powershell
dotnet test tests\Ideas.API.Tests\Ideas.API.Tests.csproj `
  --filter "FullyQualifiedName~EventCartSeatServiceTests|FullyQualifiedName~SeatsIoSeatOperationsTests" `
  --no-restore --logger "console;verbosity=minimal"
```

Current result:

- Passed: **58**
- Failed: **1**
- Skipped: **0**
- Total: **59**

Failing test:

`HoldSeat_SeatWriteHitsANonUniquenessDatabaseFault_SurfacesTheFaultRatherThanATakenSeat`

Expected `DbUpdateException`; current broad catch swallowed it.

## Blocker 2 — cart token and presented token can disagree

### Current defect

`ResolveTicketTypeForSeatAsync` accepts a seat when its hold token equals either:

- `cart.SeatsIoHoldToken`, or
- `request.HoldToken`.

Afterward, `EnsureHoldTokenAsync` prefers an existing live cart token. This permits a bad sequence:

1. Cart already owns token `A`.
2. Request presents token `B`.
3. Seats.io reports seat held under `B`.
4. `IsSeatClaimable` accepts `B`.
5. `EnsureHoldTokenAsync` keeps cart token `A`.
6. Backend records seat locally although cart's booking token `A` does not own it.
7. Final Seats.io booking under `A` can fail.

A second mismatch exists when a presented token passes seat-status reading but token validation later fails. Current code may mint a fresh token and still record the seat that remains held under the old token.

### Required correction

Resolve one authoritative token before writing any local claim:

1. If cart has a live token, that token is authoritative.
2. When cart already has an authoritative token, reject a different presented token. Do not accept union of both tokens.
3. If cart has no token, validate and adopt the presented token.
4. If presented-token validation or extension fails during a confirmed seat claim, reject claim. Do not issue a replacement token inside this claim path.
5. Read Seats.io object status after authoritative token is known, or re-read it after adoption.
6. Write local claim only when object status is `reservedByToken` and object hold token exactly equals authoritative cart token.
7. Fresh token issuance remains valid for initial seating-session setup, before any confirmed seat is being recorded.

Do not compare against both cart token and presented token in `IsSeatClaimable`.

## Blocker 3 — interactive release still has two writers

### Current defect

`EventCartSeatService.ReleaseSeatAsync` still calls:

```csharp
seatingService.ReleaseSeatsAsync(...)
```

During interactive chart deselection, Seats.io renderer already releases object. Backend then performs another release. Same ownership error remains on deselection side.

### Required correction

For interactive chart flow:

- Renderer owns Seats.io release.
- Backend endpoint records/reconciles local removal only.
- Frontend must call local reconciliation only after renderer release operation completes.
- Backend should verify vendor state when needed. If object is no longer held under cart token, local release is idempotently valid.
- If object remains held under cart token because renderer release has not completed, return retryable conflict. Do not race renderer with another vendor release.

Do not remove backend vendor release from non-interactive cleanup workflows. Expiry, cancellation, refund, abandoned-cart, and recovery sweeps may remain backend-owned. Ownership must be explicit per workflow:

- Interactive select/release: renderer owns vendor mutation.
- Expiry/recovery/refund cleanup: backend owns vendor mutation.
- Final booking: backend owns vendor mutation.

## Blocker 4 — Seats.io booking occurs after sale instead of before settlement

### Current defect

Current checkout changes local seat rows to claimed/booked and may settle payment or issue tickets before Seats.io booking succeeds. First vendor booking is performed later by:

`EventSeatHoldSweepService.ConfirmSoldSeatsAsync`

using `BookSeatsAsync` as background reconciliation.

This permits a paid buyer to receive tickets while Seats.io still has not accepted final booking. Background retry is useful recovery, but unsafe as primary booking boundary.

### Required correction

Make Seats.io booking authoritative inside checkout/payment state machine:

1. Use cart's exact authoritative hold token.
2. Before payment capture/settlement and before ticket issuance, call `BookSeatsAsync` for every selected seated object.
3. Continue only when every required object is successfully booked.
4. On booking failure:
   - do not settle invoice;
   - do not issue tickets;
   - do not report checkout success;
   - void/cancel payment authorization when applicable;
   - if external payment was already captured because existing gateway mode cannot authorize first, refund/compensate and return explicit failure. Do not silently defer correction to sweep.
5. Make booking retry idempotent. Persist vendor-booked marker only after Seats.io success.
6. Keep `ConfirmSoldSeatsAsync` only as recovery/reconciliation for exceptional stranded states, not normal first booking attempt.

Inspect actual Stripe capture mode before changing sequencing. If current PaymentIntent captures automatically in browser, redesign to authorization/manual capture or an equivalent safe saga. Do not claim “booking precedes charge” unless test proves call order.

## Blocker 5 — real SQL Server concurrency proof missing

In-memory EF tests cannot prove filtered unique-index handling or real two-connection concurrency. Add opt-in SQL Server integration coverage using existing `IDEALI_TEST_SQLSERVER` convention.

Required test:

1. Create two separate DbContexts and two different carts.
2. Both attempt same session/object claim concurrently.
3. Seats.io status reports correct ownership conditions required by test design.
4. Exactly one request succeeds.
5. Loser returns `EventCartSeatErrorCodes.SeatTaken`, mapped to HTTP `409`.
6. Exactly one live database row remains.
7. No unrelated `DbUpdateException` is converted to seat conflict.
8. Test must fail clearly when integration DB was requested but unavailable. Do not count early return as pass.

## Mandatory tests

### Seat claim tests

Add or retain proof that:

1. Same-token renderer hold creates local claim without `HoldSeatsAsync`.
2. Free seat is rejected.
3. Booked seat is rejected.
4. Different-token seat is rejected with seat conflict.
5. Same-cart duplicate returns success and one row.
6. Cart token `A`, presented token `B`, seat held under `B` is rejected.
7. Presented-token validation failure does not mint replacement and record old-token seat.
8. Presented-token extension failure writes no claim.
9. Exact seat unique-index collision becomes seat conflict.
10. Unrelated `DbUpdateException` propagates and does not become `409`.

### Release tests

Prove interactive release:

1. Never invokes `ReleaseSeatsAsync`.
2. Removes local claim idempotently after renderer release is confirmed/reconciled.
3. Repeated local release succeeds without duplicate mutation.
4. Vendor object still held under cart token produces retryable response rather than second release call.
5. Background expiry/refund cleanup still invokes vendor release where backend owns operation.

### Checkout and booking tests

Using strict mocks or ordered assertions, prove:

1. Final `BookSeatsAsync` uses same cart hold token.
2. Vendor booking completes before capture/settlement.
3. Vendor booking completes before ticket issuance.
4. Booking failure causes no settlement and no tickets.
5. Partial multi-session booking failure enters explicit compensation/recovery state.
6. Retry after uncertain vendor response is idempotent.
7. Background sweep is not normal first booking attempt.

### SQL Server integration test

Run actual different-cart collision test described above. Report whether `IDEALI_TEST_SQLSERVER` was configured. A skipped or early-returning test is not a pass.

## Verification commands

```powershell
cd D:\V4Ideas\Ideali\ideali.api

dotnet test tests\Ideas.API.Tests\Ideas.API.Tests.csproj `
  --filter "FullyQualifiedName~EventCartSeatServiceTests|FullyQualifiedName~SeatsIoSeatOperationsTests"

dotnet test tests\Ideas.API.Tests\Ideas.API.Tests.csproj `
  --filter "FullyQualifiedName~EventCheckoutServiceTests|FullyQualifiedName~EventSeatHoldSweepServiceTests"

dotnet test tests\Ideas.API.Tests\Ideas.API.Tests.csproj `
  --filter "FullyQualifiedName~EventCartSeatSqlServerTests"

dotnet test tests\Ideas.API.Tests\Ideas.API.Tests.csproj
```

Also run:

```powershell
git diff --check
dotnet build --no-restore
```

Report exact passed, failed, and skipped totals for every command. Do not report compilation as test success.

## Acceptance criteria

Backend work is complete only when all statements are true:

- Interactive claim never calls Seats.io `/actions/hold`.
- One authoritative hold token exists per cart.
- Local seat claim is written only when Seats.io reports `reservedByToken` under that exact token.
- Invalid/expired/different presented token cannot be replaced mid-claim while old-token seat is recorded.
- Same-cart retries are idempotent.
- Only exact seat unique-index collision maps to HTTP `409`.
- Other database failures remain visible as real faults.
- Interactive release does not call Seats.io release.
- Backend cleanup/recovery retains vendor release ownership outside interactive chart flow.
- Final Seats.io booking succeeds before payment capture/settlement and ticket issuance.
- Booking failure cannot produce paid order or issued ticket without explicit compensation.
- Real SQL Server concurrent-claim test produces one winner, one `409`, and one live row.
- All targeted and full backend tests pass with zero unexplained skips.

## Do not apply fake fixes

- Do not catch every `DbUpdateException` as seat conflict.
- Do not accept cart token or presented token as interchangeable.
- Do not mint a new token after validating seat under a different token.
- Do not reintroduce backend `/actions/hold` in interactive claim.
- Do not keep renderer and backend as interactive release writers.
- Do not treat background booking retry as proof buyer was safely booked before charge.
- Do not remove database unique constraint.
- Do not use in-memory EF test as concurrency proof.
- Do not hide or delete failing tests.

## Required final agent report

Report:

1. Every backend file changed.
2. Final hold, release, and booking ownership model.
3. Authoritative token-selection algorithm.
4. Payment and Seats.io booking call order.
5. Tests added or changed.
6. Exact commands and pass/fail/skip totals.
7. Whether real SQL Server concurrency test actually ran.
8. Remaining risks.
9. Backend production recommendation: GO or NO-GO, with confidence score.

Do not commit unless explicitly asked.
