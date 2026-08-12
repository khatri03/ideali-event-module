# Handoff - Invoice charges shown inline

## Current objective
Show the saved invoice charge breakdown inline under Subtotal on the invoice detail page, using the charge records returned by the invoice detail API, and keep the detail view aligned with registration totals.

## Completed work
- `EventInvoiceSummaryCard` now renders `invoice.charges` directly under Subtotal, sorted by `displayOrder`.
- The summary card no longer shows the old hardcoded `Tax`, `Platform charges`, and `Service charges` rows.
- The invoice detail e2e spec now asserts the saved charge labels and amounts are visible.
- The summary card unit test now covers the inline charge breakdown and verifies `Service charges` is not rendered as a synthetic label.
- The invoice detail API normalization now maps `charges` into `EventInvoiceDetail`.

## Architectural decisions and reasons
- The detail page should use saved charge snapshots from the API, not hardcoded UI labels.
- Inline rendering under Subtotal is clearer than a separate accordion and keeps the invoice breakdown consistent with registration.
- Charge order comes from `displayOrder` so the UI matches the backend-provided sequence.

## Files changed
- `e2e/event-invoice-detail.spec.ts`
- `src/api/eventInvoices.ts`
- `src/api/eventInvoices.test.ts`
- `src/features/event-invoices/components/EventInvoiceSummaryCard.tsx`
- `src/features/event-invoices/components/EventInvoiceSummaryCard.test.tsx`
- `src/features/event-invoices/components/EventInvoiceChargeBreakdownSection.tsx`
- `src/features/event-invoices/components/EventInvoiceChargeBreakdownSection.test.tsx`

## Important commands and test results
- `git log --oneline -3` -> latest commit is `f00ccba fix(invoices): show charge labels inline`
- `git status --short` -> clean after commit
- `npm test -- src/api/eventInvoices.test.ts src/features/event-invoices/components/EventInvoiceSummaryCard.test.tsx src/features/event-invoices/components/EventInvoiceChargeBreakdownSection.test.tsx src/features/event-invoices/components/EventInvoiceNotesSection.test.tsx src/features/event-invoices/components/EventInvoiceTable.test.tsx src/features/event-invoices/hooks/useEventInvoices.test.ts` -> passed
- `npx playwright test e2e/event-invoice-detail.spec.ts` -> passed

## Known bugs or limitations
- `EventInvoiceChargeBreakdownSection` still exists in the repo, but the invoice detail page no longer uses it.
- The commit is local only; the push was not completed because the remote push step was blocked.

## Unfinished tasks in priority order
1. Push commit `f00ccba` after explicit approval to push to the configured remote.
2. Remove or repurpose the now-unused charge breakdown component and test if we want to trim dead code.
3. Continue invoice-detail QA if any follow-up UI drift is reported.

## Exact next action
Push `f00ccba` once the remote push is explicitly approved.

## Assumptions that must not be changed
- Saved charge labels come from the API charge payload, not hardcoded UI strings.
- Invoice notes work remains separate from charge rendering.
- Never commit or push without an explicit user ask in the current message.
- No new dependencies, no snapshot tests, no localStorage/sessionStorage.

## Branch and commit status
- Branch: `sohail/features/event/event-registration-cart-table`
- HEAD: `f00ccba`
- Working tree: clean
- Remote push: pending
