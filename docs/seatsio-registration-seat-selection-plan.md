# Seat selection in the registration form — plan

Repos: API `D:\V4Ideas\Ideali\ideali.api` (`sohail/features/event/event-registration-seatsio`), frontend `d:\V4Ideas\Ideali\UpcomingDevelopment\ideali-events` (`sohail/features/event/event-module`).

## What exists today

Organizer side is finished: chart designer, categories, per-session Seats.io event (`SessionSeatSelectionResponse` carries `seatsIoEventUniqueId` and `seatsIoChartUniqueId`), and ticket types mapped to a chart category with a capacity pulled from the layout.

Buyer side is entirely quantity-based. `TicketReservation` holds a *count* against a ticket type until `ReservedUntilUtc`; `EventSeatClaim` locks the ticket types and cuts the order down at payment start; `EventTicket` rows are minted at settlement with no seat identity. Nothing in the buyer path knows a seat exists — there is no hold token, no `book`, no `release` anywhere in the solution.

## The rule this plan exists to keep

**One seat, one buyer.** A seat that any buyer is holding or has bought cannot be held or bought by another, and no code path may mint two `EventTicket` rows for the same seat on the same session.

Four independent guards, so no single failure sells a seat twice:

1. **Seats.io hold token** — the vendor refuses a `hold` on an object already held or booked. This is the guard that works across servers, browsers and processes.
2. **Database unique index** — a filtered unique index on `(SessionId, ObjectLabel)` over live claims. Even if the vendor call is skipped, replayed or races, the second insert fails.
3. **Claim transaction** — seats are claimed inside the existing `EventSeatClaim` transaction that already locks ticket types, so quantity and seat identity move together or not at all.
4. **Settlement re-check** — booking asks Seats.io to `book` the exact objects the invoice names, and a rejection fails the settlement loudly rather than issuing a ticket for a seat someone else holds.

## Phases

Each phase lands with its own tests, builds clean, and is committed on its own.

### Phase 1 — Seat identity in the domain

- New entity `TicketReservationSeat` — `TicketReservationId`, `SessionId`, `TicketTypeId`, `ObjectLabel`, `CategoryKey`, `SeatsIoEventKey`, `Status`, `HeldUntilUtc`, `ReleasedUtc`.
- `EventTicket.SeatObjectLabel` (nullable — general-admission tickets keep none).
- Filtered unique index `IX_TicketReservationSeat_Live` on `(SessionId, ObjectLabel)` where the claim is live, plus a unique index on `(SessionId, SeatObjectLabel)` over non-cancelled `EventTicket` rows.
- EF configuration + one migration. Tests: the second live claim on the same seat throws; a released claim frees the seat; a cancelled ticket frees the seat.

### Phase 2 — Seats.io seating operations

- `ISeatsIoSeatingService` in `Ideas.SeatsIo`: `IssueHoldTokenAsync`, `HoldObjectsAsync`, `ReleaseObjectsAsync`, `BookObjectsAsync`, `ReadObjectStatusAsync`.
- Every call carries the workspace secret key resolved server-side; the buyer never receives it.
- A rejected hold is surfaced as a typed refusal ("that seat has just been taken") rather than a vendor error string.
- Tests against the existing fake handler: hold, release, book, token issue, and each failure path.

### Phase 3 — Public seating endpoints

- `Areas/Event/Controllers/EventSeatingController`, anonymous but rate-limited and cart-scoped:
  - `GET /api/events/{eventUniqueId}/register/sessions/{sessionUniqueId}/seating` — workspace **public** key, Seats.io event key, and the category → ticket type map with prices.
  - `POST .../seating/hold-token` — issues (or reuses) the cart's hold token.
  - `POST .../seating/hold` and `POST .../seating/release` — hold and release one object, writing the `TicketReservationSeat` row in the same transaction.
- Nothing here trusts a price, a category or a ticket type sent by the browser; all three are read from the session.

### Phase 4 — Cart and claim

- Cart lines carry their seat labels; the line quantity is derived from the seats, never sent by the client.
- `EventSeatClaim` claims the seats inside its existing transaction and reports a taken seat in the same wording it already uses for a sold-out ticket type.
- Reservation expiry releases the Seats.io objects as well as the count.

### Phase 5 — Settlement, refund, recovery

- Settlement books the objects, then mints `EventTicket` rows carrying the seat label.
- Refund and cancellation release the objects.
- The recovery job reconciles drift between our claims and Seats.io's own status.

### Phase 6 — Registration UI

- Seat picker in the registration wizard for a session that offers seat selection, driven by the hold token, wired to the purchase timer already on screen.
- Cart summary and review dialog name the seats.
- Unit tests plus a Playwright responsive spec at 320/375/768/1024/1440/1920.

### Phase 7 — Ticket and check-in

- Seat label on the ticket PDF, the confirmation email and the check-in screen.

## Out of scope

Best-available auto-assign, seat maps for the organizer's own manual orders, and per-seat pricing beyond the category's ticket type.
