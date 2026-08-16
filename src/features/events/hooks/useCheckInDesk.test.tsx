import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useCheckInDesk } from "./useCheckInDesk"

const { checkInMock, undoMock, rosterMock, resendMock } = vi.hoisted(() => ({
  checkInMock: vi.fn(),
  undoMock: vi.fn(),
  rosterMock: vi.fn(),
  resendMock: vi.fn(),
}))

vi.mock("@/api/eventCheckIn", () => ({
  checkInTicket: checkInMock,
  undoTicketCheckIn: undoMock,
  fetchSessionAttendees: rosterMock,
}))

vi.mock("@/api/eventInvoices", () => ({ resendEventInvoiceTicket: resendMock }))

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }))

vi.mock("@/lib/toaster", () => ({ toaster: { create: toastMock } }))

const EMPTY_ROSTER = {
  sessionName: "Opening Night",
  counts: { issued: 0, arrived: 0, expected: 0 },
  attendees: { pageNo: 1, pageSize: 25, totalRecordsCount: 0, pageData: [] },
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function renderDesk() {
  return renderHook(() => useCheckInDesk("event-1", "session-1"), { wrapper })
}

beforeEach(() => {
  checkInMock.mockReset()
  undoMock.mockReset()
  rosterMock.mockReset()
  rosterMock.mockResolvedValue(EMPTY_ROSTER)
  resendMock.mockReset().mockResolvedValue(undefined)
  toastMock.mockReset()
})

describe("useCheckInDesk", () => {
  it("KeepsTheOutcomeOfTheLastScanOnScreen", async () => {
    checkInMock.mockResolvedValue({
      outcome: "Success",
      ticketCode: "TKT-1",
      message: "Ticket checked in successfully.",
      checkedInAtUtc: "2026-08-17T18:00:00Z",
    })

    const { result } = renderDesk()
    act(() => result.current.admit("TKT-1"))

    await waitFor(() => expect(result.current.attempt?.outcome).toBe("Success"))
    expect(result.current.attempt?.ticketCode).toBe("TKT-1")
  })

  /**
   * The card under the scanner is easy to miss with a queue moving, which is why the outcome is also
   * spoken by a toast - including the refusals, which used to arrive silently.
   */
  it("AnnouncesAnAdmissionAsASuccessToast", async () => {
    checkInMock.mockResolvedValue({
      outcome: "Success",
      ticketCode: "TKT-1",
      message: "Ticket checked in successfully.",
      checkedInAtUtc: null,
    })

    const { result } = renderDesk()
    act(() => result.current.admit("TKT-1"))

    await waitFor(() => expect(toastMock).toHaveBeenCalled())
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success", title: "Admit: TKT-1" }),
    )
  })

  it("AnnouncesARefusedTicketAsAnErrorToast", async () => {
    checkInMock.mockResolvedValue({
      outcome: "Invalid",
      ticketCode: "TKT-9",
      message: "This ticket is not valid for this session.",
      checkedInAtUtc: null,
    })

    const { result } = renderDesk()
    act(() => result.current.admit("TKT-9"))

    await waitFor(() => expect(toastMock).toHaveBeenCalled())
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        title: "Do not admit: TKT-9",
        description: "This ticket is not valid for this session.",
      }),
    )
  })

  /** Neutral styling would read as another admission, which is the one thing it must not look like. */
  it("AnnouncesATicketAlreadyInsideAsAWarningToast", async () => {
    checkInMock.mockResolvedValue({
      outcome: "AlreadyCheckedIn",
      ticketCode: "TKT-2",
      message: "This ticket was already checked in.",
      checkedInAtUtc: "2026-08-17T18:00:00Z",
    })

    const { result } = renderDesk()
    act(() => result.current.admit("TKT-2"))

    await waitFor(() => expect(toastMock).toHaveBeenCalled())
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "warning", title: "Already inside: TKT-2" }),
    )
  })

  it("ShowsAReversalAsItsOwnOutcomeRatherThanLeavingTheAdmissionOnScreen", async () => {
    undoMock.mockResolvedValue({
      ticketCode: "TKT-1",
      ticketStatus: "Active",
      reversedAtUtc: "2026-08-17T18:05:00Z",
      message: "Check-in reversed.",
    })

    const { result } = renderDesk()
    act(() => result.current.reverse("TKT-1"))

    await waitFor(() => expect(result.current.attempt?.outcome).toBe("ManualOverride"))
  })

  /** The scanner restarts its camera when this callback changes, blanking the preview mid-queue. */
  it("KeepsTheScanHandlerStableAcrossAScan", async () => {
    checkInMock.mockResolvedValue({
      outcome: "Success",
      ticketCode: "TKT-1",
      message: "",
      checkedInAtUtc: null,
    })

    const { result } = renderDesk()
    const admitBefore = result.current.admit

    act(() => result.current.admit("TKT-1"))
    await waitFor(() => expect(result.current.attempt?.outcome).toBe("Success"))

    expect(result.current.admit).toBe(admitBefore)
  })

  it("ReturnsToTheFirstPageWhenTheRosterIsFilteredAgain", async () => {
    const { result } = renderDesk()

    act(() => result.current.setPage(3))
    await waitFor(() => expect(result.current.page).toBe(3))

    act(() => result.current.setScope("Arrived"))

    await waitFor(() => expect(result.current.page).toBe(1))
  })

  it("NamesTheTicketItIsWaitingOnSoOnlyThatRowGoesBusy", async () => {
    let admitted: (value: unknown) => void = () => undefined
    checkInMock.mockImplementation(() => new Promise((resolve) => (admitted = resolve)))

    const { result } = renderDesk()
    act(() => result.current.admit("TKT-7"))

    await waitFor(() => expect(result.current.busyTicketCode).toBe("TKT-7"))

    await act(async () => {
      admitted({ outcome: "Success", ticketCode: "TKT-7", message: "", checkedInAtUtc: null })
    })

    await waitFor(() => expect(result.current.busyTicketCode).toBeNull())
  })

  it("SendsATicketAgainOnTheOrderItWasBoughtOn", async () => {
    const { result } = renderDesk()

    act(() => result.current.sendTicket({ invoiceUniqueId: "invoice-1", ticketUniqueId: "ticket-1" }))

    await waitFor(() => expect(resendMock).toHaveBeenCalledWith("invoice-1", "ticket-1"))
  })

  it("NamesTheTicketBeingSentSoOnlyThatRowGoesBusy", async () => {
    let sent: (value: unknown) => void = () => undefined
    resendMock.mockImplementation(() => new Promise((resolve) => (sent = resolve)))

    const { result } = renderDesk()
    act(() => result.current.sendTicket({ invoiceUniqueId: "invoice-1", ticketUniqueId: "ticket-9" }))

    await waitFor(() => expect(result.current.sendingTicketUniqueId).toBe("ticket-9"))

    await act(async () => {
      sent(undefined)
    })

    await waitFor(() => expect(result.current.sendingTicketUniqueId).toBeNull())
  })

  it("AsksForNothingWhileTheDoorIsOffline", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)

    renderDesk()

    await waitFor(() => expect(rosterMock).not.toHaveBeenCalled())
    vi.restoreAllMocks()
  })
})
