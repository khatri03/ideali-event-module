/**
 * The slice of a TanStack mutation an invoice action control needs. Each detail page passes its own
 * module's mutation, so the control stays presentational and never decides which endpoint it calls.
 */
export interface InvoiceActionMutation<TVariables = void> {
  mutateAsync: (variables: TVariables) => Promise<unknown>
  reset: () => void
  isPending: boolean
  error: unknown
}
