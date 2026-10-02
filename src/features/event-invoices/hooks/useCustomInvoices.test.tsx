import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import {
  useAddCustomInvoiceNote,
  useCancelCustomInvoice,
  useCustomInvoiceDetail,
  useEmailCustomInvoice,
  useLinkCustomInvoice,
  useMarkCustomInvoiceAsPaid,
  useUnlinkCustomInvoice,
} from "./useCustomInvoices"

const api = vi.hoisted(() => ({
  fetchCustomInvoiceDetail: vi.fn(),
  markCustomInvoiceAsPaid: vi.fn(),
  cancelCustomInvoice: vi.fn(),
  sendCustomInvoice: vi.fn(),
  addCustomInvoiceNote: vi.fn(),
  linkCustomInvoice: vi.fn(),
  unlinkCustomInvoice: vi.fn(),
}))

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }))

vi.mock("@/lib/toaster", () => ({ toaster: { create: toastMock } }))

vi.mock("@/api/customInvoices", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/customInvoices")>()
  return { ...actual, ...api }
})

/** A client whose invalidations can be observed, so a test can name exactly which views a mutation refreshes. */
function createObservedClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 1000 * 60 * 2, retry: false }, mutations: { retry: false } },
  })
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return { wrapper: Wrapper, invalidateSpy }
}

function invalidatedKeys(invalidateSpy: ReturnType<typeof createObservedClient>["invalidateSpy"]) {
  return invalidateSpy.mock.calls.map(([filters]) => filters?.queryKey)
}

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset().mockResolvedValue(undefined))
  toastMock.mockReset()
})

describe("useCustomInvoiceDetail", () => {
  /** A buyer can pay while the organizer is away, so reopening the detail asks the server rather than the cache. */
  it("DetailRevisitedWithinTheStaleWindow_RefetchesRatherThanServingTheCache", async () => {
    api.fetchCustomInvoiceDetail.mockResolvedValue({ invoiceUniqueId: "invoice-1" })
    const { wrapper } = createObservedClient()
    const first = renderHook(() => useCustomInvoiceDetail("invoice-1"), { wrapper })
    await waitFor(() => expect(api.fetchCustomInvoiceDetail).toHaveBeenCalledTimes(1))
    first.unmount()

    renderHook(() => useCustomInvoiceDetail("invoice-1"), { wrapper })

    await waitFor(() => expect(api.fetchCustomInvoiceDetail).toHaveBeenCalledTimes(2))
  })

  /** Without an id in the route there is nothing to load, so no request is made for an undefined invoice. */
  it("DetailWithNoInvoiceId_RequestsNothing", () => {
    renderHook(() => useCustomInvoiceDetail(undefined), { wrapper: createObservedClient().wrapper })

    expect(api.fetchCustomInvoiceDetail).not.toHaveBeenCalled()
  })
})

describe("custom invoice actions", () => {
  /** Settling changes the invoice's status and its row, so its detail and the Event Invoices list both refresh. */
  it.each([
    ["mark paid", "Invoice marked as paid.", () => useMarkCustomInvoiceAsPaid("invoice-1").mutateAsync],
    [
      "cancel",
      "Invoice cancelled.",
      () => {
        const { mutateAsync } = useCancelCustomInvoice("invoice-1")
        return () => mutateAsync("Sponsor withdrew.")
      },
    ],
    [
      "add note",
      "Invoice note added.",
      () => {
        const { mutateAsync } = useAddCustomInvoiceNote("invoice-1")
        return () => mutateAsync("Call finance.")
      },
    ],
  ] as const)("%s_Succeeds_ToastsAndRefreshesTheDetailAndTheList", async (_action, title, useRunAction) => {
    const { wrapper, invalidateSpy } = createObservedClient()
    const { result } = renderHook(useRunAction, { wrapper })

    await result.current()

    expect(toastMock).toHaveBeenCalledWith({ type: "success", title })
    await waitFor(() =>
      expect(invalidatedKeys(invalidateSpy)).toEqual([["custom-invoice-detail", "invoice-1"], ["event-invoices"]]),
    )
  })

  /** Emailing a custom invoice reports invoice language, never the ticket-resend copy that has nothing to send. */
  it("Email_Succeeds_SendsThroughTheSendActionWithInvoiceWordedSuccess", async () => {
    const { result } = renderHook(() => useEmailCustomInvoice("invoice-1"), { wrapper: createObservedClient().wrapper })

    await result.current.mutateAsync()

    expect(api.sendCustomInvoice).toHaveBeenCalledWith("invoice-1")
    expect(toastMock).toHaveBeenCalledWith({ type: "success", title: "Invoice emailed to the buyer." })
  })

  /** A refused action never reads as success: the organizer sees an error toast and no success copy. */
  it("MarkPaid_Refused_ToastsAnErrorAndNeverClaimsSuccess", async () => {
    api.markCustomInvoiceAsPaid.mockRejectedValue(new Error("A payment is in progress."))
    const { result } = renderHook(() => useMarkCustomInvoiceAsPaid("invoice-1"), { wrapper: createObservedClient().wrapper })

    await expect(result.current.mutateAsync()).rejects.toThrow()

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }))
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: "success" }))
  })
})

describe("custom invoice link mutations", () => {
  /**
   * The link is written on both invoices, so both details and the list must refresh; if either detail
   * were skipped, that side would keep showing it stands alone until the organizer reloaded.
   */
  it("Link_Succeeds_LinksTheChosenTargetAndRefreshesBothDetailsAndTheList", async () => {
    const { wrapper, invalidateSpy } = createObservedClient()
    const { result } = renderHook(() => useLinkCustomInvoice("invoice-1"), { wrapper })

    await result.current.mutateAsync("invoice-2")

    expect(api.linkCustomInvoice).toHaveBeenCalledWith("invoice-1", "invoice-2")
    expect(toastMock).toHaveBeenCalledWith({ type: "success", title: "Invoices linked." })
    await waitFor(() =>
      expect(invalidatedKeys(invalidateSpy)).toEqual([
        ["custom-invoice-detail", "invoice-1"],
        ["custom-invoice-detail", "invoice-2"],
        ["event-invoices"],
      ]),
    )
  })

  /** A refused link shows the server's reason and still refreshes both sides, so a concurrent change is not hidden. */
  it("Link_Refused_ToastsTheServerReasonAndStillRefreshesBothSides", async () => {
    api.linkCustomInvoice.mockRejectedValue(new Error("One of these invoices is already linked."))
    const { wrapper, invalidateSpy } = createObservedClient()
    const { result } = renderHook(() => useLinkCustomInvoice("invoice-1"), { wrapper })

    await expect(result.current.mutateAsync("invoice-2")).rejects.toThrow()

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }))
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: "success" }))
    await waitFor(() => expect(invalidatedKeys(invalidateSpy)).toContainEqual(["custom-invoice-detail", "invoice-2"]))
  })

  /** Removing a link clears it on both invoices, so the invoice on the other side must refresh too. */
  it("Unlink_Succeeds_RefreshesThisDetailTheLinkedDetailAndTheList", async () => {
    const { wrapper, invalidateSpy } = createObservedClient()
    const { result } = renderHook(() => useUnlinkCustomInvoice("invoice-1", "invoice-2"), { wrapper })

    await result.current.mutateAsync()

    expect(api.unlinkCustomInvoice).toHaveBeenCalledWith("invoice-1")
    expect(toastMock).toHaveBeenCalledWith({ type: "success", title: "Link removed." })
    await waitFor(() =>
      expect(invalidatedKeys(invalidateSpy)).toEqual([
        ["custom-invoice-detail", "invoice-1"],
        ["custom-invoice-detail", "invoice-2"],
        ["event-invoices"],
      ]),
    )
  })

  /** A failed unlink leaves the link in place, so the organizer must be told rather than shown success. */
  it("Unlink_Refused_ToastsAnErrorAndNeverClaimsSuccess", async () => {
    api.unlinkCustomInvoice.mockRejectedValue(new Error("This invoice is not linked."))
    const { result } = renderHook(() => useUnlinkCustomInvoice("invoice-1", "invoice-2"), {
      wrapper: createObservedClient().wrapper,
    })

    await expect(result.current.mutateAsync()).rejects.toThrow()

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }))
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: "success" }))
  })
})
