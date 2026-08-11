import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import type { EventInvoiceDetail } from "@/api/eventInvoices"
import { system } from "@/theme"
import { APP_ROUTES } from "@/utils/routes"
import { EventInvoiceSummaryCard } from "./EventInvoiceSummaryCard"

const INVOICE: EventInvoiceDetail = {
  invoiceUniqueId: "invoice-1",
  invoiceNo: "INV-2001",
  invoiceStatus: "Paid",
  invoiceStatusLabel: "Paid",
  invoiceDateUtc: "2026-08-01T10:00:00Z",
  subTotal: 420,
  discountAmount: null,
  discountCouponCode: null,
  taxAmount: 75.56,
  platformCharges: 4,
  serviceCharges: 5,
  totalAmount: 504.56,
  balanceAmount: null,
  currencySymbol: "$",
  eventUniqueId: "event-1",
  eventName: "Annual Convention",
  buyerName: "Jane Doe",
  buyerEmail: "jane@example.com",
  buyerPhone: null,
  lineItems: [
    {
      invoiceItemUniqueId: "line-1",
      sessionUniqueId: "session-1",
      sessionName: "Friday Dinner",
      ticketTypeName: "Aga Khan",
      quantity: 1,
      unitPrice: 210,
      lineTotal: 210,
      attendees: [],
      tickets: [],
    },
    {
      invoiceItemUniqueId: "line-2",
      sessionUniqueId: "session-1",
      sessionName: "Friday Dinner",
      ticketTypeName: "Allama Iqbal",
      quantity: 1,
      unitPrice: 210,
      lineTotal: 210,
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
      amount: 75.56,
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
      amount: 4,
      displayOrder: 2,
    },
    {
      label: "Credit Card Fee",
      chargeKind: "PaymentMethod",
      chargeKindLabel: "Payment Method",
      sourceType: "PaymentProcessorFeeRule",
      sourceTypeLabel: "Payment Processor Fee Rule",
      calculationType: "Percent",
      calculationTypeLabel: "Percent",
      sourceUniqueId: "charge-3",
      value: 1,
      amount: 5,
      displayOrder: 3,
    },
  ],
  notes: [],
  payments: [],
}

function renderCard(invoice: EventInvoiceDetail = INVOICE) {
  return render(
    <ChakraProvider value={system}>
      <EventInvoiceSummaryCard invoice={invoice} />
    </ChakraProvider>,
  )
}

describe("EventInvoiceSummaryCard", () => {
  it("ChargeBreakdownPresent_RendersEachSavedChargeBelowSubtotal", () => {
    renderCard()

    expect(screen.getByText("Subtotal")).toBeInTheDocument()
    expect(screen.getByText("Sales Tax")).toBeInTheDocument()
    expect(screen.getByText("Platform Charges")).toBeInTheDocument()
    expect(screen.getByText("Credit Card Fee")).toBeInTheDocument()
    expect(screen.getByText("$75.56")).toBeInTheDocument()
    expect(screen.getByText("$4.00")).toBeInTheDocument()
    expect(screen.getByText("$5.00")).toBeInTheDocument()
    expect(screen.getByText("$504.56")).toBeInTheDocument()
    expect(screen.queryByText("Service charges")).not.toBeInTheDocument()
    expect(screen.getAllByText("-").length).toBeGreaterThan(0)
  })

  it("EventNamePresent_RendersWizardLinksThatOpenInANewTab", () => {
    renderCard()

    const links = screen.getAllByRole("link", { name: "Annual Convention" })

    expect(links).toHaveLength(2)

    for (const link of links) {
      expect(link).toHaveAttribute("href", APP_ROUTES.eventWizard.edit("event-1"))
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", "noopener noreferrer")
    }
  })
})
