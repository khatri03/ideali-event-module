# Seats.io Selection Hold Race — Implementation Handoff

## Instruction to coding agent

Do not stop at analysis. Implement this fix across both repositories, add required unit and E2E coverage, run verification, and report exact results. Do not commit unless explicitly asked.

- Frontend: `D:\V4Ideas\Ideali\UpcomingDevelopment\ideali-events`
- Backend: `D:\V4Ideas\Ideali\ideali.api`
- Affected route: `/events/{eventUniqueId}/register`

Production status: **NO-GO** until acceptance criteria below pass.

## Root cause verdict

Confidence: **9.5/10**.

Seats.io renderer and backend both try to hold same object with same hold token.

Current renderer uses a manual Seats.io session. In this mode, browser automatically starts an asynchronous hold when buyer selects an object. Current frontend reacts to `onObjectSelected` immediately and starts cart claim. Backend cart claim still calls Seats.io `/actions/hold`. These two writers race.

Possible order:

1. Buyer selects seat.
2. Seats.io renderer schedules browser hold.
3. `onObjectSelected` fires.
4. Frontend immediately starts backend cart-seat request.
5. Backend `/actions/hold` wins and changes seat to `reservedByToken`.
6. Renderer hold arrives second.
7. Seats.io rejects renderer hold because object is already `reservedByToken`.
8. Renderer displays built-in modal: **“Your selection could not be reserved. Please refresh the page and try again.”**

If renderer wins, backend may receive same-status error instead. Current backend reread logic recovers only that direction. It cannot stop renderer losing and showing modal. Timing explains intermittent behavior.

## Decisive evidence

### Frontend starts server work before hold confirmation

- `src/features/events/components/registration/SeatMapPanel.tsx:219` calls application selection from `onObjectSelected`.
- `src/features/events/hooks/useSeatSelection.ts:151` can immediately call `claimSeat(...)` when cart exists.
- `src/features/events/pages/EventRegisterWizard.tsx:464` also invokes `claimPendingSeats()` when buyer details become valid.

Seats.io documents that browser hold starts asynchronously after selection. Successful confirmation is `onHoldSucceeded(objects, ticketTypes)`, not `onObjectSelected`.

### Backend remains second Seats.io hold writer

- `D:\V4Ideas\Ideali\ideali.api\src\Modules\Organizer\Ideas.Organizer.Infrastructure\Services\EventCartSeatService.cs:423-426` conditionally calls `seatingService.HoldSeatsAsync(...)`.
- Lines `428-438` reread status after backend hold refusal. Useful recovery, but only when backend loses race.

### Production-like log proves duplicate hold behavior

File:

`D:\V4Ideas\Ideali\ideali.api\src\Presentation\Ideas.API\Logs\2026-09\2026-09-10.txt`

- Line `79930`: one cart-seat POST returns `200`.
- Lines `79935-79936`: another hold for object `8` fails with:

  `Cannot change status of object 8 to reservedByToken because it is already in that status`

- Line `79945`: overlapping cart-seat POST returns `400`.

Screenshot also shows object `8` selected when renderer displays reservation failure. Evidence aligns exactly.

## Secondary cause: frontend operations are counted, not serialized

`runExclusively` in `src/features/events/hooks/useSeatSelection.ts:126-134` is misnamed. It increments `pendingCount`, awaits supplied work, then decrements count. It does not provide mutual exclusion.

`claimPendingSeats()` computes pending seats before entering that wrapper. Two callers can see same seat absent from `heldKeysRef` and both send cart-seat POSTs. `heldKeysRef` is updated only after request succeeds. `EventRegisterWizard` effect can re-enter while earlier claim remains in flight.

This creates duplicate backend requests, database unique-index collisions, stale cart responses, and more chances for Seats.io status races.

## Why existing changes are not enough

Keep these changes; they are useful:

- Per-event hold-token cookie.
- Presented-token validation.
- Hold-token extension endpoint and renewal.
- Backend same-token status checks.
- Backend reread after failed hold.
- `onHoldFailed` and token-expiry handling.
- Database uniqueness for live seat claims.

But issue remains because backend still calls `/actions/hold`, frontend still claims from `onObjectSelected`, and cart mutations still overlap.

## Required design

Use **one Seats.io hold owner**.

For interactive chart selection with `session="manual"` and `holdToken`, renderer owns Seats.io hold/release operations. Backend owns local cart records, validation, pricing, database uniqueness, and final booking.

Seats.io explicitly says manual `/hold` is unnecessary when renderer session holds objects on click.

### Required frontend changes

1. In `SeatMapPanel.tsx`, stop calling `onSelectSeat` from `onObjectSelected`.
2. Add `onHoldSucceeded`. Only objects supplied by this callback may enter application selection and cart-claim flow.
3. Handle every object in callback. Table selection may return multiple objects. Deduplicate by `sessionUniqueId + objectLabel`.
4. Add `onHoldCallsInProgress` and `onHoldCallsComplete` state.
5. Disable Continue/Next and other progression while renderer hold calls or local cart mutations remain pending.
6. Pass failed labels from `onHoldFailed`. Remove/reconcile those labels idempotently, refresh seating data, and show buyer-facing message.
7. Replace `runExclusively` with real serialization:
   - one promise queue/mutex for cart-seat mutations;
   - synchronous per-seat in-flight set before first `await`;
   - clear key in `finally`;
   - recompute pending seats inside queue, not before entering it.
8. Make `claimPendingSeats()` safe under React Strict Mode and repeated effects. Concurrent calls for same seat must produce one HTTP request.
9. Do not swallow hold-token renewal failure. Reconcile expired selection/cart and show explicit recovery state.
10. Validate restored cookie token before allowing interactive selection. Never render a pickable chart with unverified/expired token.

### Required backend changes

1. Change interactive `HoldSeatAsync` flow into **record confirmed renderer hold**, not **create vendor hold**.
2. Remove `seatingService.HoldSeatsAsync(...)` from interactive chart claim path.
3. Require Seats.io status to be `reservedByToken` under cart/presented hold token before writing local claim. A `free`, `booked`, or different-token object must be rejected with correct conflict response. Do not turn `free` into held here.
4. Make same-cart duplicate request idempotent. Existing live claim for same cart/session/object returns current cart with success; it must not call Seats.io or insert duplicate row.
5. Keep database unique constraint for cross-cart concurrency. Map competing claim to HTTP `409`, not generic `400`.
6. Keep final Seats.io booking authoritative. Book using same hold token before charging/settling payment; handle booking failure without charging buyer.
7. Audit deselection path under same one-owner rule. Renderer session automatically releases deselected objects. Backend must not race renderer with second release call. Persist local removal only after renderer release operation completes, using idempotent reconciliation.
8. Keep server-side event eligibility, ticket-sale, category, purchase-limit, price, and ownership validation. Removing backend vendor hold must not remove business validation.

## Do not apply these fake fixes

- Do not hide Seats.io modal with CSS.
- Do not retry `/hold` blindly.
- Do not treat `already in reservedByToken` as universal success; token ownership must match.
- Do not remove database unique constraint.
- Do not add debounce as substitute for serialization/idempotency.
- Do not keep both renderer and backend as hold writers.
- Do not declare fixed because backend request returns `200`; renderer may still lose afterward.

## Mandatory tests

### Frontend unit/component tests

Add tests proving:

1. `onObjectSelected` does not call cart claim.
2. `onHoldSucceeded` records and claims each successful object exactly once.
3. Two concurrent `claimPendingSeats()` calls create one request per seat.
4. Buyer-info effect re-entry cannot duplicate seat claim.
5. Continue stays disabled from `onHoldCallsInProgress` until `onHoldCallsComplete` and local claim completion.
6. `onHoldFailed` reconciles exact failed labels and refreshes map.
7. Multi-object table hold processes all objects once.
8. Expired/restored-invalid token cannot leave chart falsely pickable.

### Backend tests

Add tests proving:

1. Confirmed same-token renderer hold creates local claim without invoking `HoldSeatsAsync`.
2. Free seat is rejected; backend does not hold it.
3. Seat held by another token is rejected with conflict.
4. Duplicate same-cart request returns success and one database row.
5. Concurrent different-cart claims produce one winner and one `409`.
6. Final booking uses matching hold token and precedes payment capture/settlement.

### E2E tests

Browser test must exercise real callback ordering, not only mock endpoint success.

1. Select one seat with existing cart.
2. Assert Seats.io browser hold completes before local cart claim begins.
3. Assert exactly one local cart-seat request for object.
4. Assert backend makes no `/actions/hold` request for interactive selection.
5. Assert no Seats.io “selection could not be reserved” modal appears.
6. Repeat with rapid multi-seat clicks, table selection, buyer-field changes, refresh, slow network, and expired token.
7. Run at least 50 repeated selections under network jitter to expose timing races.

## Verification commands

Frontend:

```powershell
cd D:\V4Ideas\Ideali\UpcomingDevelopment\ideali-events
npm test
npm run lint
npm run build
npx playwright test
```

Backend: run targeted `EventCartSeatServiceTests`, checkout/booking tests, then relevant full test project. Run SQL Server concurrency tests with required test database configured; do not count early-return/skipped integration tests as passed.

## Acceptance criteria

Fix is complete only when all statements are true:

- Renderer is sole Seats.io hold/release writer during interactive chart selection.
- Application selection changes only after confirmed renderer hold.
- One seat produces at most one in-flight local claim per cart.
- Same-cart retries are idempotent.
- Competing carts remain protected by Seats.io and database constraint.
- Continue cannot run while vendor/local seat operations remain pending.
- Expiry and hold failure reconcile UI, cart, and vendor state.
- Required unit, backend, integration, and E2E tests pass.
- Repeated network-jitter E2E run shows zero reservation-failure modals caused by own requests.

## Official Seats.io references

- [Temporarily hold objects](https://docs.seats.io/docs/api/temporarily-hold-objects/): renderer sessions already hold on click; manual `/hold` is not needed.
- [onHoldSucceeded](https://docs.seats.io/docs/renderer/events-onholdsucceeded/): fires after Seats.io confirms browser hold.
- [onHoldCallsInProgress](https://docs.seats.io/docs/renderer/events-onholdcallsinprogress/): disable progression until hold calls complete.
- [onHoldCallsComplete](https://docs.seats.io/docs/renderer/events-onholdcallscomplete/): signals no hold calls remain.
- [Manual session and hold token](https://docs.seats.io/docs/renderer/config-session/): manual renderer session uses supplied hold token.
- [Object statuses](https://docs.seats.io/docs/api/objects/): `reservedByToken` identifies temporary token ownership.
- [Get objects for a hold token](https://docs.seats.io/docs/api/get-objects-for-a-hold-token/): final booking with hold token is authoritative; pre-validation alone cannot guarantee later booking.

## Final agent report required

Report:

1. Files changed in both repositories.
2. Exact ownership model after fix.
3. Tests added.
4. Commands run and pass/fail counts.
5. Any remaining risk.
6. Production recommendation: GO or NO-GO, with confidence score.
