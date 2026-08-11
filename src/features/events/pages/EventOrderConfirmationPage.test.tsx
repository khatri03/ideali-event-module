import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { system } from "@/theme"
import type { EventOrderStatus } from "@/features/events/schemas/eventOrder.schemas"
import { APP_ROUTES } from "@/utils/routes"
import { EventOrderConfirmationPage } from "./EventOrderConfirmationPage"

const { fetchEventOrderStatusMock, confirmEventCheckoutMock, browserTabMocks } = vi.hoisted(() => ({
  fetchEventOrderStatusMock: vi.fn(),
  confirmEventCheckoutMock: vi.fn(),
  browserTabMocks: {
    reloadTab: vi.fn(),
    openPath: vi.fn(),
    requestTabClose: vi.fn(),
    isTabClosed: vi.fn(() => true),
  },
}))

vi.mock("@/api/eventOrders", () => ({ fetchEventOrderStatus: fetchEventOrderStatusMock }))
vi.mock("@/api/eventCheckout", () => ({ confirmEventCheckout: confirmEventCheckoutMock }))
vi.mock("@/utils/browserTab", () => browserTabMocks)

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

function renderPage(search = "", state?: { registerPath: string }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const pathname = APP_ROUTES.eventOrder(ORDER_UNIQUE_ID)

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[{ pathname, search, state }]}>{children}</MemoryRouter>
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
    browserTabMocks.reloadTab.mockReset()
    browserTabMocks.openPath.mockReset()
    browserTabMocks.requestTabClose.mockReset()
    browserTabMocks.isTabClosed.mockReset().mockReturnValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
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

  it("Completion_ConfirmedOrder_AsksWhetherToBuyAgainOrCloseTheTab", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(buildOrder({ tickets: [ISSUED_TICKET] }))

    renderPage()

    await waitFor(() => expect(screen.getByText("Registration complete")).toBeTruthy())
    expect(screen.getByTestId("order-next-step-dialog-content")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Buy more tickets" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Close this tab" })).toBeTruthy()
  })

  it("Completion_OrderStillProcessing_DoesNotAskAnything", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(buildOrder({ orderState: "Processing", pollAfterSeconds: 5 }))

    renderPage()

    await waitFor(() => expect(screen.getByText("Payment received")).toBeTruthy())
    expect(screen.queryByText("Registration complete")).toBeNull()
  })

  it("Completion_BuyMoreTickets_OpensAFreshRegistrationForTheSameEvent", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(buildOrder({}))
    const registerPath = APP_ROUTES.eventRegister("event-1")

    renderPage("", { registerPath })
    await waitFor(() => expect(screen.getByText("Registration complete")).toBeTruthy())

    await userEvent.click(screen.getByRole("button", { name: "Buy more tickets" }))

    expect(browserTabMocks.openPath).toHaveBeenCalledWith(registerPath)
    expect(browserTabMocks.reloadTab).not.toHaveBeenCalled()
  })

  it("Completion_BuyMoreTicketsWithoutAKnownRegistrationLink_ReloadsInstead", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(buildOrder({}))

    renderPage()
    await waitFor(() => expect(screen.getByText("Registration complete")).toBeTruthy())

    await userEvent.click(screen.getByRole("button", { name: "Buy more tickets" }))

    expect(browserTabMocks.openPath).not.toHaveBeenCalled()
    expect(browserTabMocks.reloadTab).toHaveBeenCalledTimes(1)
  })

  it("Completion_PromptDismissedWithoutChoosing_ReloadsTheTab", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(buildOrder({}))

    renderPage()
    await waitFor(() => expect(screen.getByText("Registration complete")).toBeTruthy())

    await userEvent.keyboard("{Escape}")

    await waitFor(() => expect(browserTabMocks.reloadTab).toHaveBeenCalledTimes(1))
  })

  it("Completion_BrowserRefusesToCloseTheTab_TellsTheBuyerToCloseItManually", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(buildOrder({}))
    browserTabMocks.isTabClosed.mockReturnValue(false)

    renderPage()
    await waitFor(() => expect(screen.getByText("Registration complete")).toBeTruthy())

    await userEvent.click(screen.getByRole("button", { name: "Close this tab" }))

    expect(browserTabMocks.requestTabClose).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("would not close this tab"))
  })
})
