import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import {
  useAddEventInvoiceNote,
  useEventInvoiceDetail,
  useEventInvoices,
  useResendEventInvoice,
} from "./useEventInvoices"
import type { EventInvoiceFilters } from "@/api/eventInvoices"

const api = vi.hoisted(() => ({
  fetchEventInvoices: vi.fn(),
  fetchEventInvoiceDetail: vi.fn(),
  addEventInvoiceNote: vi.fn(),
  resendEventInvoice: vi.fn(),
}))

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }))

vi.mock("@/lib/toaster", () => ({ toaster: { create: toastMock } }))

vi.mock("@/api/eventInvoices", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/eventInvoices")>()
  return { ...actual, ...api }
})

const FILTERS: EventInvoiceFilters = {
  eventUniqueIds: [],
  sessionUniqueIds: [],
  statuses: [],
  paymentMethods: [],
  invoiceTypes: [],
  overdueOnly: false,
  invoiceDateFrom: null,
  invoiceDateTo: null,
  searchTerm: "",
}

/** Mirrors the app's client, whose two-minute staleTime is what a remount would otherwise honour. */
function createWrapper(
  queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 1000 * 60 * 2, retry: false } } }),
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useEventInvoices", () => {
  beforeEach(() => {
    api.fetchEventInvoices.mockReset().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 })
    api.fetchEventInvoiceDetail.mockReset().mockResolvedValue({ uniqueId: "invoice-1" })
    api.addEventInvoiceNote.mockReset().mockResolvedValue(undefined)
  })

  /**
   * Payment status changes behind the organizer's back, so returning to the list must ask the server
   * rather than serve whoever was unpaid when the page was last open.
   */
  it("ListRevisitedWithinTheStaleWindow_RefetchesRatherThanServingTheCache", async () => {
    const wrapper = createWrapper()
    const first = renderHook(() => useEventInvoices(FILTERS, 1, 20, "invoiceDateUtc", "desc"), { wrapper })

    await waitFor(() => expect(api.fetchEventInvoices).toHaveBeenCalledTimes(1))
    first.unmount()

    renderHook(() => useEventInvoices(FILTERS, 1, 20, "invoiceDateUtc", "desc"), { wrapper })

    await waitFor(() => expect(api.fetchEventInvoices).toHaveBeenCalledTimes(2))
  })

  /** A ticket order settles behind the organizer's back too, so reopening its detail asks the server again. */
  it("DetailRevisitedWithinTheStaleWindow_RefetchesRatherThanServingTheCache", async () => {
    const wrapper = createWrapper()
    const first = renderHook(() => useEventInvoiceDetail("invoice-1"), { wrapper })

    await waitFor(() => expect(api.fetchEventInvoiceDetail).toHaveBeenCalledTimes(1))
    first.unmount()

    renderHook(() => useEventInvoiceDetail("invoice-1"), { wrapper })

    await waitFor(() => expect(api.fetchEventInvoiceDetail).toHaveBeenCalledTimes(2))
  })

  /** Without an id in the route there is nothing to load, so no request is made for an undefined invoice. */
  it("DetailWithNoInvoiceId_RequestsNothing", () => {
    renderHook(() => useEventInvoiceDetail(undefined), { wrapper: createWrapper() })

    expect(api.fetchEventInvoiceDetail).not.toHaveBeenCalled()
  })

  /** A saved note must appear on the trail, so the detail is refetched after the write. */
  it("AddNote_SavesTheNoteAndInvalidatesInvoiceDetail", async () => {
    const wrapper = createWrapper()
    const detail = renderHook(() => useEventInvoiceDetail("invoice-1"), { wrapper })

    await waitFor(() => expect(api.fetchEventInvoiceDetail).toHaveBeenCalledTimes(1))
    detail.unmount()

    const mutation = renderHook(() => useAddEventInvoiceNote("invoice-1"), { wrapper })
    await mutation.result.current.mutateAsync("Call finance.")

    expect(api.addEventInvoiceNote).toHaveBeenCalledWith("invoice-1", "Call finance.")

    renderHook(() => useEventInvoiceDetail("invoice-1"), { wrapper })
    await waitFor(() => expect(api.fetchEventInvoiceDetail).toHaveBeenCalledTimes(2))
  })
})

describe("ticket resend", () => {
  beforeEach(() => {
    toastMock.mockReset()
    api.resendEventInvoice.mockReset().mockResolvedValue(undefined)
  })

  /** Resending a ticket order reports ticket language; the invoice-email copy belongs to custom invoices only. */
  it("ResendAllTickets_ReportsTicketWordedSuccess", async () => {
    const { result } = renderHook(() => useResendEventInvoice("invoice-1"), { wrapper: createWrapper() })

    await result.current.mutateAsync()

    expect(api.resendEventInvoice).toHaveBeenCalledWith("invoice-1")
    expect(toastMock).toHaveBeenCalledWith({ type: "success", title: "Tickets queued for resend." })
  })
})
