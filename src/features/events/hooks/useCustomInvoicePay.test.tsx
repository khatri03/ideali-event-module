import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useCustomInvoicePaySummary, useStartCustomInvoicePayment } from "./useCustomInvoicePay"

const payApiMocks = vi.hoisted(() => ({
  fetchCustomInvoicePaySummary: vi.fn(),
  startCustomInvoicePayment: vi.fn(),
}))

vi.mock("@/api/customInvoicePayment", () => payApiMocks)

const INVOICE_UNIQUE_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7"
const SUMMARY_KEY = ["custom-invoice-pay", INVOICE_UNIQUE_ID]

/** A fresh client per test with retries off, so a failure is observed on its first attempt. */
function createHarness() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, invalidateSpy, wrapper }
}

describe("useCustomInvoicePay", () => {
  beforeEach(() => {
    payApiMocks.fetchCustomInvoicePaySummary.mockReset()
    payApiMocks.startCustomInvoicePayment.mockReset()
  })

  /**
   * The start mutation invalidates by this key; if the query were cached under any other key, a refused
   * start (invoice paid meanwhile) would leave the buyer looking at a stale card form.
   */
  it("Summary_UnknownInvoice_ResolvesNullUnderTheInvoiceKey", async () => {
    payApiMocks.fetchCustomInvoicePaySummary.mockResolvedValue(null)
    const { queryClient, wrapper } = createHarness()

    const { result } = renderHook(() => useCustomInvoicePaySummary(INVOICE_UNIQUE_ID), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
    expect(queryClient.getQueryState(SUMMARY_KEY)?.status).toBe("success")
    expect(payApiMocks.fetchCustomInvoicePaySummary).toHaveBeenCalledWith(INVOICE_UNIQUE_ID)
  })

  /** Without an id there is no invoice to ask about; a request would only 404. */
  it("Summary_WithoutAnInvoiceId_DoesNotFetch", () => {
    const { wrapper } = createHarness()

    renderHook(() => useCustomInvoicePaySummary(""), { wrapper })

    expect(payApiMocks.fetchCustomInvoicePaySummary).not.toHaveBeenCalled()
  })

  /** After a successful start the invoice may have moved on, so the summary is re-read. */
  it("Start_Succeeds_InvalidatesTheSummary", async () => {
    payApiMocks.startCustomInvoicePayment.mockResolvedValue({ clientSecret: "pi_1_secret_2", paymentIntentId: "pi_1" })
    const { invalidateSpy, wrapper } = createHarness()

    const { result } = renderHook(() => useStartCustomInvoicePayment(INVOICE_UNIQUE_ID), { wrapper })
    await result.current.mutateAsync()

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: SUMMARY_KEY }))
    expect(payApiMocks.startCustomInvoicePayment).toHaveBeenCalledWith(INVOICE_UNIQUE_ID)
  })

  /** A refused start usually means the invoice changed state; the page must re-read it rather than keep offering a card form. */
  it("Start_Fails_StillInvalidatesTheSummary", async () => {
    payApiMocks.startCustomInvoicePayment.mockRejectedValue(new Error("This invoice has already been paid."))
    const { invalidateSpy, wrapper } = createHarness()

    const { result } = renderHook(() => useStartCustomInvoicePayment(INVOICE_UNIQUE_ID), { wrapper })
    await expect(result.current.mutateAsync()).rejects.toThrow("This invoice has already been paid.")

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: SUMMARY_KEY }))
  })
})
