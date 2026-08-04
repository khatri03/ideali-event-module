import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { useEventInvoiceDetail, useEventInvoices } from "./useEventInvoices"
import type { EventInvoiceFilters } from "@/api/eventInvoices"

const api = vi.hoisted(() => ({
  fetchEventInvoices: vi.fn(),
  fetchEventInvoiceDetail: vi.fn(),
}))

vi.mock("@/api/eventInvoices", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/eventInvoices")>()
  return { ...actual, ...api }
})

const FILTERS: EventInvoiceFilters = {
  eventUniqueIds: [],
  sessionUniqueIds: [],
  statuses: [],
  paymentMethods: [],
  invoiceDateFrom: null,
  invoiceDateTo: null,
  searchTerm: "",
}

/** Mirrors the app's client, whose two-minute staleTime is what a remount would otherwise honour. */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 1000 * 60 * 2, retry: false } },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useEventInvoices", () => {
  beforeEach(() => {
    api.fetchEventInvoices.mockReset().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 })
    api.fetchEventInvoiceDetail.mockReset().mockResolvedValue({ uniqueId: "invoice-1" })
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

  it("DetailRevisitedWithinTheStaleWindow_RefetchesRatherThanServingTheCache", async () => {
    const wrapper = createWrapper()
    const first = renderHook(() => useEventInvoiceDetail("invoice-1"), { wrapper })

    await waitFor(() => expect(api.fetchEventInvoiceDetail).toHaveBeenCalledTimes(1))
    first.unmount()

    renderHook(() => useEventInvoiceDetail("invoice-1"), { wrapper })

    await waitFor(() => expect(api.fetchEventInvoiceDetail).toHaveBeenCalledTimes(2))
  })

  it("DetailWithNoInvoiceId_RequestsNothing", () => {
    renderHook(() => useEventInvoiceDetail(undefined), { wrapper: createWrapper() })

    expect(api.fetchEventInvoiceDetail).not.toHaveBeenCalled()
  })
})
