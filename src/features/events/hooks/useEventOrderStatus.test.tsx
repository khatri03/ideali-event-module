import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { EventOrderStatus } from "@/features/events/schemas/eventOrder.schemas"
import { useEventOrderStatus } from "./useEventOrderStatus"

const { fetchEventOrderStatusMock } = vi.hoisted(() => ({ fetchEventOrderStatusMock: vi.fn() }))

vi.mock("@/api/eventOrders", () => ({ fetchEventOrderStatus: fetchEventOrderStatusMock }))

const ORDER_UNIQUE_ID = "order-1"

function buildOrder(overrides: Partial<EventOrderStatus>): EventOrderStatus {
  return {
    orderUniqueId: ORDER_UNIQUE_ID,
    invoiceNo: "EV-1001",
    orderState: "Processing",
    invoiceStatus: "Pending Payment",
    pollAfterSeconds: 5,
    buyerName: "Sohail Ahmed",
    buyerEmailMasked: "s******@gmail.com",
    subTotal: 240,
    discountAmount: null,
    discountCouponCode: null,
    taxAmount: null,
    platformCharges: null,
    serviceCharges: null,
    totalAmount: 239.98,
    amountPaid: 239.98,
    balanceAmount: null,
    currencySymbol: "USD",
    charges: [],
    lineItems: [],
    eventName: "Golden Jubilee",
    eventThemeColor: null,
    eventStartDateUtc: null,
    eventEndDateUtc: null,
    venueName: null,
    venueAddress: null,
    venueMapUrl: null,
    tickets: [],
    ...overrides,
  }
}

const CONFIRMED = buildOrder({ orderState: "Confirmed", invoiceStatus: "Paid", pollAfterSeconds: 0 })
const PROCESSING = buildOrder({})

function renderOrderStatus() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return renderHook(() => useEventOrderStatus(ORDER_UNIQUE_ID), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
}

/** RTL's waitFor cannot drive vitest's fake clock, so time is advanced explicitly instead. */
async function advance(milliseconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds)
  })
}

describe("useEventOrderStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fetchEventOrderStatusMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("OrderStatus_SettledOrder_StopsPollingImmediately", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(CONFIRMED)

    const { result } = renderOrderStatus()
    await advance(0)
    expect(result.current.order?.orderState).toBe("Confirmed")

    await advance(120_000)

    // A settled order has nothing left to tell us; asking again is pure noise on a public endpoint.
    expect(fetchEventOrderStatusMock).toHaveBeenCalledTimes(1)
  })

  it("OrderStatus_PendingOrder_KeepsAskingUntilItSettles", async () => {
    fetchEventOrderStatusMock.mockResolvedValueOnce(PROCESSING).mockResolvedValue(CONFIRMED)

    const { result } = renderOrderStatus()
    await advance(0)
    expect(result.current.order?.orderState).toBe("Processing")

    await advance(6_000)

    expect(result.current.order?.orderState).toBe("Confirmed")
  })

  it("OrderStatus_PendingBeyondThePollWindow_StopsAndSaysSo", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(PROCESSING)

    const { result } = renderOrderStatus()
    await advance(200_000)

    expect(result.current.hasPollWindowElapsed).toBe(true)

    const callsAtGiveUp = fetchEventOrderStatusMock.mock.calls.length
    await advance(200_000)

    // Bank rails take days. Past the window the buyer is emailed, not watched.
    expect(fetchEventOrderStatusMock.mock.calls.length).toBe(callsAtGiveUp)
  })

  it("Recheck_AfterThePollWindowClosed_ReopensIt", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(PROCESSING)

    const { result } = renderOrderStatus()
    await advance(200_000)
    expect(result.current.hasPollWindowElapsed).toBe(true)

    await act(async () => {
      await result.current.recheck()
    })

    expect(result.current.hasPollWindowElapsed).toBe(false)
  })
})
