# Handoff - Invoice detail money panel

## Current objective
Round out the invoice detail money panel (`EventInvoiceMoneyPanel`): priced items table, discount styling, a derived Subtotal row, and percent-based charge rates shown inline. No open ask right now — last three user requests are implemented, tested, committed, and pushed.

## Completed work
- Line items moved out of the resend-ticket cards into a dedicated priced table (`EventInvoiceItemsTable`) rendered above the totals block; `EventInvoiceLineItemsSection` no longer takes `currencySymbol` or prices its cards.
- Discount row renders in green (`status.success.fg`) with a forced `-` prefix regardless of the API's sign convention.
- Original total row relabeled "Line Item Total"; a new "Subtotal" row (Line Item Total minus the discount's magnitude) renders directly under Discount, only when a discount is applied, with top/bottom borders.
- Added `subtractMoney` to `src/utils/format.ts` — BigInt-cents decimal-text subtraction, no float arithmetic on money.
- Charge rows now show their rate in parentheses beside the label when `calculationType === "Percent"` (e.g. `Sales Tax (17.99%)`), matching the pattern already used in Organizer Charge Rules and Admin Revenue Plan tables. Fixed-amount charges show no suffix.
- `EventInvoiceChargeBreakdownSection` and `EventInvoiceSummaryCard` (referenced in an older handoff) are gone from the repo — fully superseded by `EventInvoiceMoneyPanel` + `EventInvoiceItemsTable`. Do not resurrect them.

## Architectural decisions and reasons
- Discount sign is normalized in the UI (magnitude + manual `-`) rather than trusted from the API, so rendering is correct whether the API sends the discount as negative or positive text.
- `subtractMoney` exists because CLAUDE.md forbids float arithmetic on money; `moneySign`/`formatCurrency` already followed this decimal-text pattern, `subtractMoney` extends it.
- The conditional Subtotal row only renders when `hasDiscount` is true — no discount means no extra row, avoiding a redundant duplicate of Line Item Total.
- Percent rate display reuses the existing `Intl.NumberFormat` two-decimal-max pattern already used in `ChargeRulesManager.formatChargeValue` and `EventChargeRulesSection.formatChargeValue`, kept local to `EventInvoiceMoneyPanel` as `formatChargeRate` rather than extracted to a shared util (only one other component would use it, not yet at the third-callsite extraction threshold).

## Files changed (this round, all pushed)
- `src/features/event-invoices/components/EventInvoiceItemsTable.tsx` (new)
- `src/features/event-invoices/components/EventInvoiceLineItemsSection.tsx` / `.test.tsx`
- `src/features/event-invoices/components/EventInvoiceMoneyPanel.tsx` / `.test.tsx`
- `src/features/event-invoices/pages/EventInvoiceDetailPage.tsx` / `.test.tsx`
- `src/utils/format.ts`

## Important commands and test results
- `npx tsc -b` -> clean, no errors.
- `npx vitest run src/features/event-invoices src/utils` -> 21 test files passed, 169 tests passed.
- `npm run lint` -> 0 errors, 1 pre-existing warning at `src/features/seating-layouts/components/SeatsIoChartCategoriesCard.tsx:98:22` (React Compiler skip on `react-hook-form`'s `watch()`; unrelated to invoice work, not introduced this round).
- `git log --oneline -3` -> `cb1f9f3 feat(event-invoices): break out the priced items table and refine the money panel totals`, `700a424 fix(event-invoices): keep dialogs mounted across opens and move settlement CTAs above the order panels`, `63b700e feat(event-invoices): make the invoice detail page production ready and let buyer details be corrected`.
- `git status --short` -> clean.

## Known bugs or limitations
- No browser/visual verification at 375/768/1280 for the money panel's new rows (Line Item Total, conditional Discount+Subtotal, percent-rate labels) or print output — happy-dom can't substitute for this; needs a real authenticated organizer session.
- 77 brand-gradient literal usages remain across 51 files repo-wide (pre-existing, explicitly out of scope, not touched this round).
- `EmailAddressRule`'s permissiveness was flagged in an earlier session as worth a separate look; not investigated.

## Unfinished tasks in priority order
1. Manual browser verification of the money panel at 375/768/1280 and print output (blocked on an authenticated organizer session).
2. Backend-dependent, not built: activity timeline, record partial payment / mark cheque cleared, refund (P6 scope).
3. Optional cleanup: revisit `EmailAddressRule` permissiveness if it resurfaces.

## Exact next action
None queued. Next session should confirm with the user whether to proceed to manual browser QA of the money panel, or start the next scoped feature request.

## Assumptions that must not be changed
- Never commit or push without an explicit user ask in the current message.
- Never add a `Co-Authored-By: Claude` trailer to any commit.
- Money is never routed through float arithmetic (`parseFloat`/`Number` on amounts) — decimal-text + `Intl.NumberFormat`/BigInt only.
- Discount's displayed sign is always derived in the UI (magnitude + manual `-`), never trusted verbatim from the API.
- No new dependencies, no snapshot tests, no localStorage/sessionStorage.
- `src/data/mock.ts` stays as-is — not expanded.

## Branch and commit status
- Branch: `sohail/features/event/event-registration-cart-table`
- HEAD: `cb1f9f3`
- Working tree: clean
- Remote: up to date, pushed
