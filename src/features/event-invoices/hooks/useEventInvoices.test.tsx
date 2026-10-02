import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import {
  useAddEventInvoiceNote,
  useEventInvoiceDetail,
  useEventInvoices,
  useLinkEventInvoice,
  useUnlinkEventInvoice,
} from "./useEventInvoices"
import type { EventInvoiceFilters } from "@/api/eventInvoices"

const api = vi.hoisted(() => ({
  fetchEventInvoices: vi.fn(),
  fetchEventInvoiceDetail: vi.fn(),
  addEventInvoiceNote: vi.fn(),
}))

const customApi = vi.hoisted(() => ({
  linkCustomInvoice: vi.fn(),
  unlinkCustomInvoice: vi.fn(),
}))

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }))

vi.mock("@/lib/toaster", () => ({ toaster: { create: toastMock } }))

vi.mock("@/api/eventInvoices", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/eventInvoices")>()
  return { ...actual, ...api }
})

vi.mock("@/api/customInvoices", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/customInvoices")>()
  return { ...actual, ...customApi }
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

/** A client whose invalidations can be observed, so a test can name exactly which views a mutation refreshes. */
function createObservedClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
  return { queryClient, invalidateSpy }
}

function invalidatedKeys(invalidateSpy: ReturnType<typeof createObservedClient>["invalidateSpy"]) {
  return invalidateSpy.mock.calls.map(([filters]) => filters?.queryKey)
}

describe("invoice link mutations", () => {
  beforeEach(() => {
    toastMock.mockReset()
    customApi.linkCustomInvoice.mockReset().mockResolvedValue(undefined)
    customApi.unlinkCustomInvoice.mockReset().mockResolvedValue(undefined)
  })

  /**
   * The link is written on both invoices, so both details and the list must refresh; if either detail
   * were skipped, that side would keep showing it stands alone until the organizer reloaded.
   */
  it("Link_Succeeds_LinksTheChosenTargetAndRefreshesBothDetailsAndTheList", async () => {
    const { queryClient, invalidateSpy } = createObservedClient()
    const { result } = renderHook(() => useLinkEventInvoice("invoice-1"), { wrapper: createWrapper(queryClient) })

    await result.current.mutateAsync("invoice-2")

    expect(customApi.linkCustomInvoice).toHaveBeenCalledWith("invoice-1", "invoice-2")
    expect(toastMock).toHaveBeenCalledWith({ type: "success", title: "Invoices linked." })
    await waitFor(() =>
      expect(invalidatedKeys(invalidateSpy)).toEqual([
        ["event-invoice-detail", "invoice-1"],
        ["event-invoice-detail", "invoice-2"],
        ["event-invoices"],
      ]),
    )
  })

  /**
   * A refused link must never read as success: the organizer sees the server's reason, and both details
   * still refresh so a partial or concurrent change is not hidden behind a stale view.
   */
  it("Link_Refused_ToastsTheServerReasonAndStillRefreshesBothSides", async () => {
    customApi.linkCustomInvoice.mockRejectedValue(new Error("One of these invoices is already linked."))
    const { queryClient, invalidateSpy } = createObservedClient()
    const { result } = renderHook(() => useLinkEventInvoice("invoice-1"), { wrapper: createWrapper(queryClient) })

    await expect(result.current.mutateAsync("invoice-2")).rejects.toThrow()

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }))
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: "success" }))
    await waitFor(() => expect(invalidatedKeys(invalidateSpy)).toContainEqual(["event-invoice-detail", "invoice-2"]))
  })

  /** Removing a link clears it on both invoices, so the invoice on the other side must refresh too. */
  it("Unlink_Succeeds_RefreshesThisDetailTheLinkedDetailAndTheList", async () => {
    const { queryClient, invalidateSpy } = createObservedClient()
    const { result } = renderHook(() => useUnlinkEventInvoice("invoice-1", "invoice-2"), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync()

    expect(customApi.unlinkCustomInvoice).toHaveBeenCalledWith("invoice-1")
    expect(toastMock).toHaveBeenCalledWith({ type: "success", title: "Link removed." })
    await waitFor(() =>
      expect(invalidatedKeys(invalidateSpy)).toEqual([
        ["event-invoice-detail", "invoice-1"],
        ["event-invoice-detail", "invoice-2"],
        ["event-invoices"],
      ]),
    )
  })

  /** A failed unlink leaves the link in place, so the organizer must be told rather than shown success. */
  it("Unlink_Refused_ToastsAnErrorAndNeverClaimsSuccess", async () => {
    customApi.unlinkCustomInvoice.mockRejectedValue(new Error("This invoice is not linked."))
    const { result } = renderHook(() => useUnlinkEventInvoice("invoice-1", "invoice-2"), { wrapper: createWrapper() })

    await expect(result.current.mutateAsync()).rejects.toThrow()

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }))
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: "success" }))
  })
})

