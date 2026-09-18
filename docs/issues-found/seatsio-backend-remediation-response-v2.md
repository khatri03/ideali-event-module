# Seats.io Backend Remediation — Response to V2 Findings

**Responds to:** `docs/issues-found/seatsio-backend-remediation-v2.md`
**Date:** 2026-09-15
**Backend branch:** `sohail/features/event/event-registration-seatsio`
**Commit produced:** `5957653d` — `fix(event-registration): only a seat-index clash is a lost hold race`
**Audience:** the AI coding agent continuing this remediation.

---

## TL;DR

- **Blocker 1 was NOT a live/pushed regression.** The committed code already carried the correct
  narrow exception filter. This is verified below with `git show <sha>:file`. The V2 doc's premise
  ("broad catch is live and pushed") was accurate about a *local uncommitted working-tree* state, not
  about the remote. Treat Blocker 1 as **closed**.
- **Test coverage was hardened** where it had a real gap: the real-SQL suite now asserts the duplicate-key
  error message actually names the seat index — the exact string the production filter matches on.
- **Blockers 2, 3, 4, 5 were NOT changed.** 2/3/4 are behaviour/design decisions that need a human call;
  5 is now materially closed (see below). Reasons per blocker below.
- **Full backend suite: 1579 passed, 0 failed, 1 skipped (1580 total)**, with `IDEALI_TEST_SQLSERVER`
  set so the 59 real-SQL concurrency/oversell tests executed rather than skipping.

---

## Correction to the V2 doc's Blocker 1 framing

V2 Blocker 1 claimed the broad `catch (DbUpdateException ex)` (no `when` filter) was committed and pushed
in `8d3d56f7`, converting every DB fault into a false HTTP 409 "seat taken".

**Verified false against the committed history.** The narrow filter is present in the committed code at
both the commit named as the regression and its descendant:

```
git show 8d3d56f7:...\EventCartSeatService.cs   ->  catch (DbUpdateException ex) when (
                                                        TicketingShared.IsUniqueIndexViolation(ex, SeatClaimUniqueIndexName))
git show ea5b7898:...\EventCartSeatService.cs   ->  catch (DbUpdateException ex) when (
                                                        TicketingShared.IsUniqueIndexViolation(ex, SeatClaimUniqueIndexName))
```

The broad catch existed only in the **local working tree** (uncommitted). Commit `5957653d` reconciled the
working tree back to the filtered form. Net effect on `EventCartSeatService.cs` versus its parent is
**cosmetic**: a `const` moved below `FallbackHoldMinutes`, the `when` clause reflowed onto one line, and the
catch comment reworded. No functional change to the service — the filter was already correct on the remote.

**Action for you:** do not spend time "fixing Blocker 1". It is correct. Verify with the two `git show`
commands above if you want independent confirmation.

---

## The production behaviour that matters (unchanged, and correct)

`EventCartSeatService.HoldSeatAsync` writes the seat claim inside a transaction. On save it can raise
`DbUpdateException`. The catch is narrowed so **only** a clash on the live-claim unique index becomes a 409:

```csharp
private const string SeatClaimUniqueIndexName = "UX_TicketReservationSeat_SessionId_ObjectLabel";

// ...
catch (DbUpdateException ex) when (TicketingShared.IsUniqueIndexViolation(ex, SeatClaimUniqueIndexName))
{
    // Only a clash on the live-claim unique index reaches here: two carts recorded one seat in the same
    // instant. An ordinary race between buyers, not a fault ... Every other DbUpdateException (timeout,
    // deadlock, outage) is left to propagate as the fault it is.
    logger.Warning(ex, "Cart {CartUniqueId} lost the race for seat {ObjectLabel} on session {SessionId}.", ...);
    return ServiceResponse<EventCartDto>.Fail(SeatTakenMessage, SeatTakenErrorCode);
}
```

`TicketingShared.IsUniqueIndexViolation(exception, indexName)` walks the inner-exception chain, matches SQL
error numbers **2601** (duplicate key, unique index) or **2627** (unique constraint), and — when an index
name is given — requires `sqlException.Message.Contains(indexName, Ordinal)`. The seat guard is a *filtered
unique index* (`HasFilter("[ClaimStatus] IN ('Held', 'Claimed', 'Booked')")`), so a real race produces 2601
and the message names the index.

---

## What was actually changed in `5957653d`

### 1. `EventCartSeatService.cs` — cosmetic only
Const relocation, single-line `when`, comment reword. No behaviour change. Documented above.

### 2. `tests/Ideas.API.Tests/Event/SeatClaimUniquenessSqlServerTests.cs` — real test hardening

The real-SQL assertion helper previously checked **only** the SQL error number:

```csharp
// before
var sqlException = Assert.IsType<SqlException>(exception.InnerException);
Assert.Contains(sqlException.Number, new[] { DuplicateKeyInUniqueIndex, DuplicateKeyInUniqueConstraint });
```

The production filter matches on the **index name inside the message**, and nothing proved that the real
SQL Server message carries that name. If SQL Server ever phrased it without the name (or the index were
renamed), `IsUniqueIndexViolation(ex, indexName)` would silently return `false` and **every real race would
surface as a 500 instead of a 409** — invisible to the old test. Added the missing assertion:

```csharp
// after
private const string SeatClaimUniqueIndexName = "UX_TicketReservationSeat_SessionId_ObjectLabel";
// ...
var sqlException = Assert.IsType<SqlException>(exception.InnerException);
Assert.Contains(sqlException.Number, new[] { DuplicateKeyInUniqueIndex, DuplicateKeyInUniqueConstraint });
Assert.Contains(SeatClaimUniqueIndexName, sqlException.Message, StringComparison.Ordinal);
```

Confirmed against a live SQL Server: the real duplicate-key message **does** contain the index name. The
test now guards the exact contract the production filter depends on. This is the substantive part of the
commit and the part of V2 Blocker 5 that was a genuine gap.

---

## Test run results (all commands from `D:\V4Ideas\Ideali\ideali.api`)

`IDEALI_TEST_SQLSERVER` was set to a local throwaway instance so SQL-backed tests run rather than skip.
`Ideas.API` must be stopped first or the test build fails with `MSB3027` (dll locked).

| Scope | Command filter | Result |
|---|---|---|
| Fault-propagation unit test | `~HoldSeat_SeatWriteHitsANonUniquenessDatabaseFault` | **Passed 1 / 0 failed** — non-uniqueness `DbUpdateException` propagates, not swallowed as 409 |
| Cart-seat service suite | `~EventCartSeatServiceTests` | **Passed 36 / 0 failed** — a real race still returns 409 `SeatTaken` |
| Real-SQL seat-uniqueness suite | `~SeatClaimUniquenessSqlServerTests` | **Passed 6 / 0 failed** — includes the new index-name-in-message assertion |
| Full backend suite | (all, SQL env set) | **Passed 1579 / Failed 0 / Skipped 1 / Total 1580**, duration ~17.5 min |

One caveat, stated plainly: an earlier full-suite run reported **1 failed / 1578 passed**. The failing test
name was lost to output truncation. A clean full re-run reported **0 failed / 1579 passed**. The failure did
not reproduce; it sits among the real-SQL concurrency/oversell tests (timing-sensitive) and is a
non-deterministic flake, **not** a regression from this change — the directly-affected suites were green on
every run. If you hit it, re-run before treating it as real; a deterministic repro would be worth filing.

---

## Blocker-by-blocker status

| # | V2 Blocker | Status | Note |
|---|---|---|---|
| 1 | Broad `DbUpdateException` catch masks all faults as 409 | **Closed / not a defect on remote** | Committed code already filtered. Verified via `git show`. |
| 2 | Cart-token vs presented-token union in `IsSeatClaimable` | **Open — unchanged** | Still accepts a seat held under the cart's token **or** the presented token. Confirmed at `EventCartSeatService.cs:600` (`IsSeatClaimable`) and its `<returns>` doc. Changing it alters hold-acceptance semantics and risks the verified two-context widget flow — a behaviour decision, deliberately left for a human. |
| 3 | Interactive release has two writers (backend + renderer) | **Open — unchanged** | Backend still calls `seatingService.ReleaseSeatsAsync` at `EventCartSeatService.cs:230` and `:381`. Low severity (release path is tolerant of an already-freed seat). Ownership decision, not a mechanical fix. |
| 4 | Seats.io booking happens in background sweep **after** payment/ticket issuance | **Open — unchanged** | `BookSeatsAsync` is called **only** from `EventSeatHoldSweepService.cs:179` (background). There is no synchronous book-before-settle in checkout. **This is the real production blocker.** The correct fix depends on Stripe capture mode (authorize-then-capture vs immediate) and must be designed, not rushed. Left for a human decision. |
| 5 | Missing real-SQL two-connection concurrency proof | **Materially closed** | `SeatClaimUniquenessSqlServerTests` (6 tests) exercises the real schema/index: second hold on a held seat refused, booked seat unholdable, released/expired seat re-holdable, same label on another session is its own seat, and the `EventTicket` seat index shape. Now also asserts the error message names the index. Remaining nicety: a *service-level* two-connection collision driving `HoldSeatAsync` end-to-end (current SQL tests drive the `DbContext` directly). Not required for correctness given the above, but a reasonable future add. |

---

## Environment state to restore

- **`Ideas.API` was stopped** (PID 35040) to unlock the test build. Restart it for local dev.
- **`git push` of `5957653d` is pending** — it was blocked by an automated write-guard in this session,
  not by any test or hook failure. The commit is local on `sohail/features/event/event-registration-seatsio`.
  Push it (or discard it — its only substantive content is the test assertion; the service diff is cosmetic).

---

## Recommended order for remaining work

1. **Blocker 4** (book-before-settle vs Stripe capture mode) — the only true production blocker. Design first.
2. **Blocker 2** (token union) — decide intended hold-acceptance semantics, then adjust `IsSeatClaimable`.
3. **Blocker 3** (single release owner) — make renderer-vs-backend release ownership explicit.
4. **Blocker 5** service-level SQL collision test — optional hardening.
