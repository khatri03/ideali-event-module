import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { system } from "@/theme"
import type { EventOrderStatus } from "@/features/events/schemas/eventOrder.schemas"
import { APP_ROUTES } from "@/utils/routes"
import { EventOrderConfirmationPage } from "./EventOrderConfirmationPage"

const { fetchEventOrderStatusMock, confirmEventCheckoutMock } = vi.hoisted(() => ({
  fetchEventOrderStatusMock: vi.fn(),
  confirmEventCheckoutMock: vi.fn(),
}))

vi.mock("@/api/eventOrders", () => ({ fetchEventOrderStatus: fetchEventOrderStatusMock }))
vi.mock("@/api/eventCheckout", () => ({ confirmEventCheckout: confirmEventCheckoutMock }))

const ORDER_UNIQUE_ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301"
const CART_UNIQUE_ID = "cart-1"

function buildOrder(overrides: Partial<EventOrderStatus>): EventOrderStatus {
  return {
    orderUniqueId: ORDER_UNIQUE_ID,
    invoiceNo: "EV-1001",
    orderState: "Confirmed",
    invoiceStatus: "Paid",
    pollAfterSeconds: 0,
    buyerName: "Sohail Ahmed",
    buyerEmailMasked: "s******@gmail.com",
    totalAmount: 239.98,
    currencySymbol: "USD",
    eventName: "Golden Jubilee",
    eventThemeColor: null,
    eventStartDateUtc: null,
    eventEndDateUtc: null,
    venueName: "Ismaili Centre",
    venueAddress: "49 Nile St, London",
    venueMapUrl: null,
    tickets: [],
    ...overrides,
  }
}

const ISSUED_TICKET = {
  ticketUniqueId: "ticket-1",
  ticketCode: "GJ-9F2K-114",
  ticketTypeName: "Aga Khan",
  sessionName: "Friday Dinner & Entertainment",
  sessionStartDateUtc: null,
  attendeeName: "Sohail Ahmed",
  ticketStatus: "Active",
}

function renderPage(search = "") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`${APP_ROUTES.eventOrder(ORDER_UNIQUE_ID)}${search}`]}>{children}</MemoryRouter>
      </QueryClientProvider>
    </ChakraProvider>
  )

  return render(
    <Routes>
      <Route path={APP_ROUTES.eventOrderRoute} element={<EventOrderConfirmationPage />} />
    </Routes>,
    { wrapper },
  )
}

describe("EventOrderConfirmationPage", () => {
  beforeEach(() => {
    fetchEventOrderStatusMock.mockReset()
    confirmEventCheckoutMock.mockReset().mockResolvedValue({})
  })

  it("Confirmation_SettledOrder_ShowsTheReferenceTotalAndEveryIssuedTicket", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(buildOrder({ tickets: [ISSUED_TICKET] }))

    renderPage()

    await waitFor(() => expect(screen.getByText("You're going")).toBeTruthy())
    expect(screen.getByText("EV-1001")).toBeTruthy()
    expect(screen.getByText("USD$239.98")).toBeTruthy()
    expect(screen.getByText("GJ-9F2K-114")).toBeTruthy()
    expect(screen.getByRole("link", { name: "View ticket" }).getAttribute("href")).toBe(
      APP_ROUTES.eventTicketView("ticket-1"),
    )
  })

  it("Confirmation_PendingOrder_SaysNoActionIsNeededAndOffersARecheck", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(
      buildOrder({ orderState: "Processing", invoiceStatus: "Pending Payment", pollAfterSeconds: 5 }),
    )

    renderPage()

    await waitFor(() => expect(screen.getByText("Payment received")).toBeTruthy())
    expect(screen.getByRole("button", { name: "Check again" })).toBeTruthy()
  })

  it("Confirmation_FailedOrder_SaysTheOrderIsNotActive", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(buildOrder({ orderState: "Failed", invoiceStatus: "Cancelled" }))

    renderPage()

    await waitFor(() => expect(screen.getByText("This order is not active")).toBeTruthy())
  })

  it("Confirmation_UnknownOrderReference_ShowsNoInternalDetail", async () => {
    fetchEventOrderStatusMock.mockRejectedValue(new Error("Order not found."))

    renderPage()

    await waitFor(() => expect(screen.getByText("We can't find that order")).toBeTruthy())
    expect(screen.queryByText(/Order not found\./)).toBeNull()
  })

  it("Confirmation_ArrivedFromAStripeRedirect_RunsTheConfirmFastPathOnce", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(buildOrder({ tickets: [ISSUED_TICKET] }))

    renderPage(`?cart=${CART_UNIQUE_ID}`)

    await waitFor(() => expect(confirmEventCheckoutMock).toHaveBeenCalledWith(CART_UNIQUE_ID))
    await waitFor(() => expect(screen.getByText("You're going")).toBeTruthy())
    expect(confirmEventCheckoutMock).toHaveBeenCalledTimes(1)
  })

  it("Confirmation_ConfirmFastPathFails_StillShowsTheOrderFromTheServer", async () => {
    confirmEventCheckoutMock.mockRejectedValue(new Error("Checkout could not be confirmed."))
    fetchEventOrderStatusMock.mockResolvedValue(buildOrder({ tickets: [ISSUED_TICKET] }))

    renderPage(`?cart=${CART_UNIQUE_ID}`)

    // The webhook settles the order regardless, so a failed fast-path must not become the buyer's problem.
    await waitFor(() => expect(screen.getByText("You're going")).toBeTruthy())
    expect(screen.queryByText(/Checkout could not be confirmed\./)).toBeNull()
  })
})
