import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { AxiosError, AxiosHeaders } from "axios"
import {
  useAddEventInvoiceNote,
  useCreateEventInvoicePaymentLink,
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
  linkEventInvoice: vi.fn(),
  unlinkEventInvoice: vi.fn(),
  createEventInvoicePaymentLink: vi.fn(),
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
    api.linkEventInvoice.mockReset().mockResolvedValue(undefined)
    api.unlinkEventInvoice.mockReset().mockResolvedValue(undefined)
  })

  /**
   * The link is written on both invoices, so both details and the list must refresh; if either detail
   * were skipped, that side would keep showing it stands alone until the organizer reloaded.
   */
  it("Link_Succeeds_LinksTheChosenTargetAndRefreshesBothDetailsAndTheList", async () => {
    const { queryClient, invalidateSpy } = createObservedClient()
    const { result } = renderHook(() => useLinkEventInvoice("invoice-1"), { wrapper: createWrapper(queryClient) })

    await result.current.mutateAsync("invoice-2")

    expect(api.linkEventInvoice).toHaveBeenCalledWith("invoice-1", "invoice-2")
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
    api.linkEventInvoice.mockRejectedValue(new Error("One of these invoices is already linked."))
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

    expect(api.unlinkEventInvoice).toHaveBeenCalledWith("invoice-1")
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
    api.unlinkEventInvoice.mockRejectedValue(new Error("This invoice is not linked."))
    const { result } = renderHook(() => useUnlinkEventInvoice("invoice-1", "invoice-2"), { wrapper: createWrapper() })

    await expect(result.current.mutateAsync()).rejects.toThrow()

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }))
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: "success" }))
  })
})

describe("useCreateEventInvoicePaymentLink", () => {
  beforeEach(() => {
    toastMock.mockReset()
    api.createEventInvoicePaymentLink
      .mockReset()
      .mockResolvedValue({ clientSecret: "pi_1_secret", paymentIntentId: "pi_1" })
  })

  /**
   * Opening a payment records a pending payment on the invoice, so the detail must refresh to show it,
   * and the organizer is told the payment is open.
   */
  it("Mint_Succeeds_ConfirmsAndRefreshesTheInvoiceDetail", async () => {
    const { queryClient, invalidateSpy } = createObservedClient()
    const { result } = renderHook(() => useCreateEventInvoicePaymentLink("invoice-1"), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync()

    expect(api.createEventInvoicePaymentLink).toHaveBeenCalledWith("invoice-1")
    expect(toastMock).toHaveBeenCalledWith({ type: "success", title: "Online payment opened for this invoice." })
    await waitFor(() => expect(invalidatedKeys(invalidateSpy)).toEqual([["event-invoice-detail", "invoice-1"]]))
  })

  /** The minted client secret is a payment credential and must never be echoed into a toast. */
  it("Mint_Succeeds_NeverPutsTheClientSecretInAMessage", async () => {
    const { result } = renderHook(() => useCreateEventInvoicePaymentLink("invoice-1"), { wrapper: createWrapper() })

    await result.current.mutateAsync()

    expect(JSON.stringify(toastMock.mock.calls)).not.toContain("pi_1_secret")
  })

  /**
   * A refused mint must never read as success: the organizer sees the server's reason, and the detail
   * still refreshes so it cannot show a payment that was never opened.
   */
  it("Mint_Refused_ToastsTheServerReasonAndStillRefreshesTheDetail", async () => {
    api.createEventInvoicePaymentLink.mockRejectedValue(new Error("Invoice not found."))
    const { queryClient, invalidateSpy } = createObservedClient()
    const { result } = renderHook(() => useCreateEventInvoicePaymentLink("invoice-1"), {
      wrapper: createWrapper(queryClient),
    })

    await expect(result.current.mutateAsync()).rejects.toThrow()

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }))
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: "success" }))
    await waitFor(() => expect(invalidatedKeys(invalidateSpy)).toContainEqual(["event-invoice-detail", "invoice-1"]))
  })

  /**
   * A refusal the server words for the organizer - here, a payment already mid-charge - reaches the toast
   * as written, so they learn why nothing new was opened instead of reading a generic failure.
   */
  it("Mint_RefusedWithAReason_ToastsThatReasonVerbatim", async () => {
    const reason = "A payment for this invoice is already in progress, so a new one cannot be started."
    api.createEventInvoicePaymentLink.mockRejectedValue(badRequest({ success: false, message: reason, data: null }))
    const { result } = renderHook(() => useCreateEventInvoicePaymentLink("invoice-1"), { wrapper: createWrapper() })

    await expect(result.current.mutateAsync()).rejects.toThrow()

    expect(toastMock).toHaveBeenCalledWith({ type: "error", title: reason })
  })
})

/** The 400 the API answers a refused service call with, carrying its camel-cased failure envelope. */
function badRequest(body: unknown) {
  return new AxiosError("Request failed with status code 400", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 400,
    statusText: "Bad Request",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: body,
  })
}
