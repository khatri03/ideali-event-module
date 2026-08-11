# Handoff — Cheque notes shipped; per-method invoice notes scoped, unbuilt

## Current objective

Extend "invoice notes" capability from Cheque-only to every payment method. User corrected the
target table mid-investigation: it is **`InvoiceNote`** (one Invoice has many `InvoiceNote` rows),
not `InvoicePayment.Notes` (the column the already-shipped Cheque feature uses). No frontend code
for `InvoiceNote` exists yet — investigation only, nothing implemented.

## Completed work

**Cheque notes (done, tested, uncommitted on this branch):**
Optional `notes` textarea added to the cheque payment flow, wired end to end:
`ChequePaymentFields.tsx` (textarea) → `PaymentStep.tsx` (prop passthrough) →
`EventRegisterWizard.tsx` (`chequeNotes` state, trimmed to `undefined` when empty, sent in
`recordChequePaymentMutation` payload) → backend `InvoicePayment.Notes` (already had the column,
cheque endpoint already accepted it — confirmed before wiring, not assumed).

Also uncommitted on this branch: `OrganizerEventCard.tsx` — three-dot menu item renamed "Invoice"
→ "Invoices".

**Invoice-notes-per-method (investigation only, nothing built):**
- Confirmed correct target is `InvoiceNote` entity (`Id`, `Note`, `InvoiceId` FK,
  `BaseAuditEntity<int>`), not `InvoicePayment.Notes`. User's explicit correction — treat as
  binding.
- Confirmed a generic, module-agnostic backend API for it already exists and is NOT new work:
  - `IInvoiceService.AddInvoiceNoteAsync(Guid uniqueId, InvoiceNoteDto dto)` /
    `GetInvoiceNotesAsync(Guid uniqueId)`, implemented in
    `Invoice.DonationService.cs` (write) / `Invoice.PresentationService.cs` (read), under
    `Ideas.Invoice.Infrastructure\Services`.
  - Exposed via generic `InvoiceController.cs`:
    `POST /invoice/{invoiceUniqueId:guid}/add-note`, `GET /invoice/{invoiceUniqueId:guid}/notes`,
    `[Authorize(Policy = AuthorizationPolicies.OrganizerModuleAccess)]`.
  - The underlying query has no module filter, so it should already work against Event-module
    invoices with zero backend changes — **unverified assumption, not yet tested against a real
    Event invoice.**
- Open, unresolved: `DonationInvoiceController.cs` also exposes its own `AddInvoiceNote` route
  hitting the same service method. Unclear whether Event frontend should call the generic
  `InvoiceController` route or whether a parallel Event-specific route is expected. Not
  investigated further.
- Confirmed via full-repo grep (`add-note`, `InvoiceNote`, `invoiceNote`): **zero matches**
  anywhere in `ideali-events/src`. No `api/` function, hook, schema, or UI exists for this.
- Open, unresolved: where in the registration flow the notes input should live for non-Cheque
  methods. User proposed a "Review Purchase" modal — pushed back on, since no such modal exists
  ("Review Purchase" is just the final wizard-step button label, confirmed at
  `EventRegisterWizard.tsx:451`). User overrode the "should we even do per-method notes" question
  but did not confirm an alternative UI placement.
- Open, unresolved: invoice does not exist until checkout completes — exact point `Invoice`
  `UniqueId` becomes available mid-wizard (which response, which step) not yet traced. Needed
  before deciding when the `add-note` call can fire.

## Architectural decisions and reasons

- **`InvoiceNote` is invoice-level, not payment-method-level.** One invoice, many notes,
  independent of `PaymentProduct`. This means the eventual UI does not need to branch per method —
  one note input, fired once an invoice exists, regardless of Card/Cheque/ACH. Confirmed by entity
  shape, not yet reflected in any code.
- **Cheque notes correctly stayed on `InvoicePayment.Notes`.** That field is one row per payment
  attempt and was already wired for cheque before this session's new request — not to be touched
  or migrated to `InvoiceNote`; the two are separate concepts serving separate rows.
- Standing rules (CLAUDE.md, unchanged): API layer thin (fetch + Zod parse only, `src/api/`),
  TanStack Query hooks in `features/[domain]/hooks/`, components never call `src/api/` directly,
  Zod schema is single source of truth for forms, no mock-data expansion, no new dependency without
  approval.

## Files changed (this branch, uncommitted)

- `src/features/events/components/registration/ChequePaymentFields.tsx` — notes textarea (+28/-2)
- `src/features/events/components/registration/PaymentStep.tsx` — `chequeNotes` /
  `onChequeNotesChange` prop passthrough (+6)
- `src/features/events/components/registration/PaymentStep.test.tsx` — prop added to test harness
  (+2)
- `src/features/events/pages/EventRegisterWizard.tsx` — `chequeNotes` state, trimmed into mutation
  payload, prop wiring (+4)
- `src/components/events/OrganizerEventCard.tsx` — menu label "Invoice" → "Invoices" (1 line)

No backend changes this session. No files created yet for `InvoiceNote`.

## Important commands and test results

- `npm run lint` — **1 warning, 0 errors**, pre-existing and unrelated
  (`SeatsIoChartCategoriesCard.tsx:98`, React Compiler skip on RHF's `watch()`, not touched this
  session).
- `npx vitest run src/features/events/components/registration/PaymentStep.test.tsx` —
  **7/7 passed**.
- Backend not re-tested this session (no backend changes made).

## Known bugs or limitations

- None newly introduced. Cheque notes feature has no known gaps — optional field, trimmed,
  matches backend contract.
- Per-method invoice notes: entirely unbuilt on the frontend. Backend readiness for Event invoices
  specifically is assumed, not verified.

## Unfinished tasks, priority order

1. Verify `POST /invoice/{invoiceUniqueId}/add-note` and `GET .../notes` actually work against an
   Event-module invoice (call it manually or add an integration test) — the one backend unknown
   blocking frontend work.
2. Resolve the generic-`InvoiceController` vs `DonationInvoiceController`-route ambiguity — confirm
   which route Event should call, or whether a third Event-specific route is expected.
3. Decide UI placement for the notes input (works for all methods, since `InvoiceNote` isn't
   method-specific) — needs user confirmation, "Review Purchase modal" idea already rejected as
   nonexistent.
4. Trace exactly when `Invoice.UniqueId` becomes available in the wizard flow, to know when the
   add-note call can fire.
5. Build frontend wiring: `api/invoiceNotes.ts` (fetch + Zod parse), TanStack Query hook(s)
   (`useAddInvoiceNote`, `useInvoiceNotes`), UI component, tests (success + failure paths) — per
   CLAUDE.md, ships in the same change, not after.
6. Commit the already-completed, currently-uncommitted work (cheque notes + menu label rename) —
   not committed yet in this session; needs explicit user go-ahead per repo rule (never commit
   unasked).
7. Carried, unscheduled: manual browser verification of the cheque flow as Organizer 1 at
   `/events/b1825109-3ec5-4fec-85a0-3694508a1008/register` — never done.
8. Carried, unscheduled, separate initiative: `EventOrderRecovery` / `EventRefundService` /
   Hangfire sweeper plan at `C:\Users\khatr\.claude\plans\piped-meandering-waffle.md` — full design
   exists, not started, not part of this thread of work.

## Exact next action

Answer priority-1 above: confirm (by testing, not re-reading code) whether
`GetInvoiceNotesAsync`/`AddInvoiceNoteAsync` actually return/accept data for an Event invoice's
`UniqueId`, since the whole "no backend work needed" plan rests on that being true.

## Assumptions that must not be changed

- Target table for per-method notes is `InvoiceNote`, not `InvoicePayment.Notes` — user's explicit
  correction, binding.
- Cheque's existing `InvoicePayment.Notes` wiring stays as-is; do not fold it into the new
  `InvoiceNote` feature or remove it.
- No `npm install` without explicit approval. Chakra UI v3 only. `date-fns` for dates. No
  `localStorage`/`sessionStorage`.
- Never commit or push without an explicit ask in that message. No `Co-Authored-By` trailer.
- `mock.ts` is temporary — do not expand it; this feature has a real backend, so mock data is not
  an option here regardless.
- Event registration UI stays in this repo (`ideali-events`), never in the membership checkout
  repo.

## Branch and commit status

- **Frontend**: `sohail/features/event/event-registration-cart-table`, working tree has 5 modified
  files (listed above), none staged or committed. HEAD at `84a850a`.
- **Backend**: `sohail/features/event/event-registration` (different branch name than frontend —
  pre-existing, not something to reconcile here), working tree clean, HEAD at `83370573`. No
  backend changes needed yet for this task; verification (priority 1 above) doesn't require code
  changes, just a call against a real Event invoice.
