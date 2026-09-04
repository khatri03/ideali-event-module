import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AxiosError, AxiosHeaders } from "axios"
import type { CheckInAttempt } from "@/api/eventCheckIn"
import { useTicketCheckIn, useUndoTicketCheckIn } from "./useTicketCheckIn"

const { checkInMock, undoMock } = vi.hoisted(() => ({
  checkInMock: vi.fn(),
  undoMock: vi.fn(),
}))

vi.mock("@/api/eventCheckIn", () => ({
  checkInTicket: checkInMock,
  undoTicketCheckIn: undoMock,
}))

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }))

vi.mock("@/lib/toaster", () => ({ toaster: { create: toastMock } }))

const SESSION = { eventUniqueId: "event-1", sessionUniqueId: "session-1" }
const ROSTER_KEY = ["session-attendees", "event-1", "session-1"]

let queryClient: QueryClient

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function attempt(overrides: Partial<CheckInAttempt> = {}): CheckInAttempt {
  return {
    outcome: "Success",
    ticketCode: "TKT-1",
    attendeeName: "Amina Yusuf",
    seatLabel: null,
    message: "Ticket checked in successfully.",
    checkedInAtUtc: "2026-08-17T18:00:00Z",
    outstandingAmount: null,
    outstandingCurrency: null,
    ...overrides,
  }
}

function serverError(data: unknown, status: number) {
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", undefined, null, {
    status,
    statusText: "Error",
    data,
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  })
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  checkInMock.mockReset()
  undoMock.mockReset()
  toastMock.mockReset()
})

describe("useTicketCheckIn", () => {
  it.each([
    ["Success", "success", "Check-in successful", 2500],
    ["AlreadyCheckedIn", "warning", "Already inside", 5000],
    ["Invalid", "error", "Do not admit", 9000],
    ["PaymentRequired", "error", "Payment required", 9000],
  ] as const)(
    "AnnouncesOutcome_%s_WithMatchingToneAndDwellTime",
    async (outcome, toastType, heading, duration) => {
      checkInMock.mockResolvedValue(attempt({ outcome, message: "Reason the operator reads." }))

      const { result } = renderHook(() => useTicketCheckIn(SESSION), { wrapper })
      act(() => result.current.mutate("TKT-1"))

      await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1))
      expect(toastMock).toHaveBeenCalledWith({
        type: toastType,
        title: `${heading}: TKT-1`,
        description: "Reason the operator reads.",
        duration,
      })
    },
  )

  it("OmitsDescription_WhenServerSendsNoReason", async () => {
    checkInMock.mockResolvedValue(attempt({ message: "" }))

    const { result } = renderHook(() => useTicketCheckIn(SESSION), { wrapper })
    act(() => result.current.mutate("TKT-1"))

    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1))
    expect(toastMock.mock.calls[0][0].description).toBeUndefined()
  })

  it("ShowsOnlyServerWording_WhenScanFails", async () => {
    checkInMock.mockRejectedValue(
      serverError({ title: "Check-in is closed for this session.", status: 409 }, 409),
    )

    const { result } = renderHook(() => useTicketCheckIn(SESSION), { wrapper })
    act(() => result.current.mutate("TKT-1"))

    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1))
    expect(toastMock).toHaveBeenCalledWith({ type: "error", title: "Check-in is closed for this session." })
  })

  it("LeaksNoTransportDetail_WhenFailureCarriesNoServerBody", async () => {
    checkInMock.mockRejectedValue(
      new AxiosError("connect ECONNREFUSED 10.0.0.4:5001", "ECONNREFUSED"),
    )

    const { result } = renderHook(() => useTicketCheckIn(SESSION), { wrapper })
    act(() => result.current.mutate("TKT-1"))

    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1))
    expect(toastMock).toHaveBeenCalledWith({ type: "error", title: "An unexpected error occurred." })
  })

  it("RefreshesRoster_AfterAdmittedScan", async () => {
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    checkInMock.mockResolvedValue(attempt())

    const { result } = renderHook(() => useTicketCheckIn(SESSION), { wrapper })
    act(() => result.current.mutate("TKT-1"))

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ROSTER_KEY }))
  })

  it("RefreshesRoster_AfterFailedScan", async () => {
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    checkInMock.mockRejectedValue(serverError({ title: "Session not found." }, 404))

    const { result } = renderHook(() => useTicketCheckIn(SESSION), { wrapper })
    act(() => result.current.mutate("TKT-1"))

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ROSTER_KEY }))
  })
})

describe("useUndoTicketCheckIn", () => {
  it("AnnouncesReversal_WithTheCodeItReleased", async () => {
    undoMock.mockResolvedValue({ ticketCode: "TKT-9", message: "Check-in reversed." })

    const { result } = renderHook(() => useUndoTicketCheckIn(SESSION), { wrapper })
    act(() => result.current.mutate("TKT-9"))

    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1))
    expect(toastMock).toHaveBeenCalledWith({
      type: "info",
      title: "Check-in reversed: TKT-9",
      duration: 4000,
    })
  })

  it("ShowsOnlyServerWording_WhenReversalIsRefused", async () => {
    undoMock.mockRejectedValue(serverError({ title: "That ticket was never checked in." }, 400))

    const { result } = renderHook(() => useUndoTicketCheckIn(SESSION), { wrapper })
    act(() => result.current.mutate("TKT-9"))

    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1))
    expect(toastMock).toHaveBeenCalledWith({ type: "error", title: "That ticket was never checked in." })
  })

  it("RefreshesRoster_AfterReversalIsRefused", async () => {
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    undoMock.mockRejectedValue(serverError({ title: "That ticket was never checked in." }, 400))

    const { result } = renderHook(() => useUndoTicketCheckIn(SESSION), { wrapper })
    act(() => result.current.mutate("TKT-9"))

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ROSTER_KEY }))
  })
})
