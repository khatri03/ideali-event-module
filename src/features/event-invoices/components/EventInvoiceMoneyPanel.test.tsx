import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import type { EventInvoiceDetail } from "@/api/eventInvoices"
import { system } from "@/theme"
import { EventInvoiceMoneyPanel } from "./EventInvoiceMoneyPanel"

function makeInvoice(overrides: Partial<EventInvoiceDetail> = {}): EventInvoiceDetail {
  return {
    invoiceUniqueId: "invoice-1",
    invoiceNo: "INV-2001",
    invoiceStatus: "Paid",
    invoiceStatusLabel: "Paid",
    invoiceDateUtc: "2026-08-01T10:00:00Z",
    subTotal: "420",
    discountAmount: null,
    discountCouponCode: null,
    taxAmount: "75.56",
    platformCharges: "4",
    serviceCharges: "5",
    totalAmount: "504.56",
    balanceAmount: null,
    currencySymbol: "$",
    eventUniqueId: "event-1",
    eventName: "Annual Convention",
    buyerName: "Jane Doe",
    buyerEmail: "jane@example.com",
    buyerPhone: null,
    canMarkAsPaid: false,
    canCancel: false,
    canResendTickets: true,
    canEditBuyer: true,
    lineItems: [
      {
        invoiceItemUniqueId: "line-1",
        sessionUniqueId: "session-1",
        sessionName: "Friday Dinner",
        ticketTypeName: "Aga Khan",
        quantity: 1,
        unitPrice: "210",
        lineTotal: "210",
        attendees: [],
        tickets: [],
      },
      {
        invoiceItemUniqueId: "line-2",
        sessionUniqueId: "session-1",
        sessionName: "Friday Dinner",
        ticketTypeName: "Allama Iqbal",
        quantity: 1,
        unitPrice: "210",
        lineTotal: "210",
        attendees: [],
        tickets: [],
      },
    ],
    charges: [
      {
        label: "Sales Tax",
        chargeKind: "Tax",
        chargeKindLabel: "Tax",
        sourceType: "EventChargeRule",
        sourceTypeLabel: "Event Charge Rule",
        calculationType: "Percent",
        calculationTypeLabel: "Percent",
        sourceUniqueId: "charge-1",
        value: 17.99,
        amount: "75.56",
        displayOrder: 1,
      },
      {
        label: "Platform Charges",
        chargeKind: "RevenuePlan",
        chargeKindLabel: "Revenue Plan",
        sourceType: "RevenuePlanRule",
        sourceTypeLabel: "Revenue Plan Rule",
        calculationType: "Fixed",
        calculationTypeLabel: "Fixed",
        sourceUniqueId: "charge-2",
        value: 4,
        amount: "4",
        displayOrder: 2,
      },
    ],
    notes: [],
    payments: [],
    ...overrides,
  }
}

function renderPanel(overrides: Partial<EventInvoiceDetail> = {}) {
  const view = render(
    <ChakraProvider value={system}>
      <EventInvoiceMoneyPanel invoice={makeInvoice(overrides)} />
    </ChakraProvider>,
  )
  return {
    ...view,
    balanceTone: () => view.container.querySelector("[data-balance-tone]")?.getAttribute("data-balance-tone") ?? null,
  }
}

describe("EventInvoiceMoneyPanel", () => {
  it("ChargeBreakdownPresent_RendersEachSavedChargeBelowSubtotal", () => {
    renderPanel()

    expect(screen.getByText("Subtotal")).toBeInTheDocument()
    expect(screen.getByText("Sales Tax")).toBeInTheDocument()
    expect(screen.getByText("Platform Charges")).toBeInTheDocument()
    expect(screen.getByText("$75.56")).toBeInTheDocument()
    expect(screen.getByText("$4.00")).toBeInTheDocument()
    expect(screen.getByText("$504.56")).toBeInTheDocument()
  })

  it("TicketLinesBelongToTheDeliverySection_SoTheMoneyPanelNeverRepeatsThem", () => {
    renderPanel()

    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.queryByText("Unit price")).not.toBeInTheDocument()
    expect(screen.queryByText("Aga Khan")).not.toBeInTheDocument()
    expect(screen.getByText("2 tickets across 2 lines")).toBeInTheDocument()
  })

  it("BalanceStillOwed_HighlightsTheAmountAsOutstanding", () => {
    const view = renderPanel({ balanceAmount: "120.50" })

    expect(view.balanceTone()).toBe("outstanding")
    expect(screen.getByText("Outstanding balance")).toBeInTheDocument()
    expect(screen.getByText("$120.50")).toBeInTheDocument()
  })

  it("BalanceZero_StatesTheOrderIsSettledInsteadOfHighlightingAZero", () => {
    const view = renderPanel({ balanceAmount: "0.00" })

    expect(view.balanceTone()).toBe("settled")
    expect(screen.getByText("Settled in full")).toBeInTheDocument()
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument()
  })

  it("BalanceNegative_ReadsAsCreditOwedBackToTheBuyer", () => {
    const view = renderPanel({ balanceAmount: "-45" })

    expect(view.balanceTone()).toBe("credit")
    expect(screen.getByText("Credit due to buyer")).toBeInTheDocument()
    expect(screen.getByText("$45.00")).toBeInTheDocument()
  })

  it("BalanceNotSentByTheServer_ShowsNoBalanceClaimAtAll", () => {
    const view = renderPanel({ balanceAmount: null })

    expect(view.balanceTone()).toBeNull()
    expect(screen.queryByText("Settled in full")).not.toBeInTheDocument()
    expect(screen.queryByText("Outstanding balance")).not.toBeInTheDocument()
  })

  it("BuyerContactMissing_RendersTheSharedEmptyGlyph", () => {
    renderPanel({ buyerEmail: null, buyerPhone: null })

    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2)
  })

  it("CouponApplied_NamesTheCodeOnTheOrderPanel", () => {
    renderPanel({ discountCouponCode: "EARLYBIRD", discountAmount: "-50" })

    expect(screen.getByText("EARLYBIRD")).toBeInTheDocument()
    expect(screen.getByText("Discount")).toBeInTheDocument()
    expect(screen.getByText("-$50.00")).toBeInTheDocument()
  })
})
