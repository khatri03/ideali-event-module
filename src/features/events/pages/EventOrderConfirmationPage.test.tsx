import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { system } from "@/theme"
import type { EventOrderStatus } from "@/features/events/schemas/eventOrder.schemas"
import { APP_ROUTES } from "@/utils/routes"
import { EventOrderConfirmationPage } from "./EventOrderConfirmationPage"

const { fetchEventOrderStatusMock, confirmEventCheckoutMock, browserTabMocks, cartCookieMocks } = vi.hoisted(() => ({
  fetchEventOrderStatusMock: vi.fn(),
  confirmEventCheckoutMock: vi.fn(),
  browserTabMocks: {
    reloadTab: vi.fn(),
    openPath: vi.fn(),
    requestTabClose: vi.fn(),
    isTabClosed: vi.fn(() => true),
  },
  cartCookieMocks: {
    readStoredCartId: vi.fn(() => null),
    storeCartId: vi.fn(),
    clearStoredCartId: vi.fn(),
  },
}))

vi.mock("@/api/eventOrders", () => ({ fetchEventOrderStatus: fetchEventOrderStatusMock }))
vi.mock("@/api/eventCheckout", () => ({ confirmEventCheckout: confirmEventCheckoutMock }))
vi.mock("@/utils/browserTab", () => browserTabMocks)
vi.mock("@/features/events/utils/registrationCartCookie", () => cartCookieMocks)

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
    venueName: "Ismaili Centre",
    venueAddress: "49 Nile St, London",
    venueMapUrl: null,
    tickets: [],
    ...overrides,
  }
}

/** A discounted, taxed order that settled in full - the shape the breakdown has to add up for. */
const PRICED_ORDER: Partial<EventOrderStatus> = {
  subTotal: 220,
  discountAmount: 20,
  discountCouponCode: "SAVE20",
  taxAmount: 15.6,
  platformCharges: 6,
  serviceCharges: 5,
  totalAmount: 226.6,
  amountPaid: 226.6,
  balanceAmount: null,
  charges: [
    { label: "Sales Tax", chargeKind: "Tax", amount: 15.6 },
    { label: "Platform Charges", chargeKind: "Revenue Plan", amount: 6 },
    { label: "Credit Card Fee", chargeKind: "Payment Method", amount: 5 },
  ],
  lineItems: [
    {
      sessionName: "Friday Dinner & Entertainment",
      ticketTypeName: "Aga Khan",
      quantity: 2,
      unitPrice: 110,
      discountAmount: 20,
      lineTotal: 220,
    },
  ],
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
    cartCookieMocks.clearStoredCartId.mockReset()
    cartCookieMocks.readStoredCartId.mockReset().mockReturnValue(null)
    cartCookieMocks.storeCartId.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("Confirmation_SettledOrder_ShowsTheReferenceTotalAndEveryIssuedTicket", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(buildOrder({ tickets: [ISSUED_TICKET] }))

    renderPage()

    await waitFor(() => expect(screen.getByText("You're going")).toBeTruthy())
    expect(screen.getByText("EV-1001")).toBeTruthy()
    // The same figure repeats in the breakdown below, so this is scoped to the headline it labels.
    const totalPaid = screen.getByText("Total paid").parentElement as HTMLElement
    expect(within(totalPaid).getByText("USD$239.98")).toBeTruthy()
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

  /**
   * A bank transfer leaves the order processing for days while its ticket rows may already exist. The
   * ticket view refuses those anyway, so offering the link would only hand the buyer a dead end.
   */
  it("Tickets_OrderStillProcessing_OffersNoTicketLink", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(
      buildOrder({ orderState: "Processing", invoiceStatus: "Pending Payment", pollAfterSeconds: 5, tickets: [ISSUED_TICKET] }),
    )

    renderPage()

    await waitFor(() => expect(screen.getByText("GJ-9F2K-114")).toBeTruthy())
    expect(screen.queryByRole("link", { name: "View ticket" })).toBeNull()
    expect(screen.getByText("Available once payment clears")).toBeTruthy()
  })

  it("Breakdown_PricedOrder_ShowsEveryLineChargeAndTheAmountCollected", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(buildOrder({ ...PRICED_ORDER, tickets: [ISSUED_TICKET] }))

    renderPage()

    await waitFor(() => expect(screen.getByText("Payment summary")).toBeTruthy())
    expect(screen.getByText("Aga Khan")).toBeTruthy()
    expect(screen.getByText("2 × USD$110.00")).toBeTruthy()
    expect(screen.getByText("Sales Tax")).toBeTruthy()
    expect(screen.getByText("USD$15.60")).toBeTruthy()
    expect(screen.getByText("Credit Card Fee")).toBeTruthy()
    expect(screen.getByText("Amount paid")).toBeTruthy()
  })

  it("Breakdown_DiscountedOrder_ShowsTheCreditAndTheCouponItCameFrom", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(buildOrder(PRICED_ORDER))

    renderPage()

    await waitFor(() => expect(screen.getByText("Payment summary")).toBeTruthy())
    expect(screen.getByText("Discount")).toBeTruthy()
    expect(screen.getByText("SAVE20")).toBeTruthy()
    expect(screen.getByText("−USD$20.00")).toBeTruthy()
  })

  it("Breakdown_SettledOrder_ShowsNoBalanceDueRow", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(buildOrder(PRICED_ORDER))

    renderPage()

    await waitFor(() => expect(screen.getByText("Payment summary")).toBeTruthy())
    expect(screen.queryByText("Balance due")).toBeNull()
  })

  it("Breakdown_PartiallyPaidOrder_ShowsWhatIsStillOwed", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(buildOrder({ ...PRICED_ORDER, amountPaid: 200, balanceAmount: 26.6 }))

    renderPage()

    await waitFor(() => expect(screen.getByText("Balance due")).toBeTruthy())
    expect(screen.getByText("USD$26.60")).toBeTruthy()
  })

  it("Breakdown_OrderWithoutCharges_ShowsNoEmptyChargeRows", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(buildOrder({}))

    renderPage()

    await waitFor(() => expect(screen.getByText("Payment summary")).toBeTruthy())
    expect(screen.queryByText("Sales Tax")).toBeNull()
    expect(screen.queryByText("Discount")).toBeNull()
  })

  it("Completion_ConfirmedOrder_OffersBothWaysOutOnThePage", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(buildOrder({ tickets: [ISSUED_TICKET] }))

    renderPage()

    await waitFor(() => expect(screen.getByRole("button", { name: "New Registration" })).toBeTruthy())
    expect(screen.getByRole("button", { name: "Close This Window" })).toBeTruthy()
  })

  it("Completion_OrderStillProcessing_OffersNoExitYet", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(buildOrder({ orderState: "Processing", pollAfterSeconds: 5 }))

    renderPage()

    await waitFor(() => expect(screen.getByText("Payment received")).toBeTruthy())
    expect(screen.queryByRole("button", { name: "New Registration" })).toBeNull()
  })

  it("Completion_NewRegistration_OpensAFreshCartForTheSameEvent", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(buildOrder({}))
    const registerPath = APP_ROUTES.eventRegister("event-1")

    renderPage("", { registerPath })
    await waitFor(() => expect(screen.getByRole("button", { name: "New Registration" })).toBeTruthy())

    await userEvent.click(screen.getByRole("button", { name: "New Registration" }))

    // The cart behind this order is spent, so it must not be resumed by the registration it reopens.
    expect(cartCookieMocks.clearStoredCartId).toHaveBeenCalledTimes(1)
    expect(browserTabMocks.openPath).toHaveBeenCalledWith(registerPath)
    expect(browserTabMocks.reloadTab).not.toHaveBeenCalled()
  })

  it("Completion_NewRegistrationWithoutAKnownRegistrationLink_ReloadsInstead", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(buildOrder({}))

    renderPage()
    await waitFor(() => expect(screen.getByRole("button", { name: "New Registration" })).toBeTruthy())

    await userEvent.click(screen.getByRole("button", { name: "New Registration" }))

    expect(browserTabMocks.openPath).not.toHaveBeenCalled()
    expect(browserTabMocks.reloadTab).toHaveBeenCalledTimes(1)
  })

  it("Completion_BrowserRefusesToCloseTheWindow_TellsTheBuyerToCloseItManually", async () => {
    fetchEventOrderStatusMock.mockResolvedValue(buildOrder({}))
    browserTabMocks.isTabClosed.mockReturnValue(false)

    renderPage()
    await waitFor(() => expect(screen.getByRole("button", { name: "Close This Window" })).toBeTruthy())

    await userEvent.click(screen.getByRole("button", { name: "Close This Window" }))

    expect(browserTabMocks.requestTabClose).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("would not close this window"))
  })
})
