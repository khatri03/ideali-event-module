import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { EventRegistrationTicket } from "@/api/events"
import type { EventCartPaymentBreakdown } from "@/features/events/schemas/eventCart.schemas"
import { PaymentBreakdownTable } from "./PaymentBreakdownTable"

const TICKET = { uniqueId: "ticket-1", name: "Aga Khan" } as unknown as EventRegistrationTicket

const SESSION_GROUPS = [
  {
    sessionId: "session-1",
    sessionName: "Friday Dinner & Entertainment",
    total: 210,
    items: [
      {
        sessionId: "session-1",
        sessionName: "Friday Dinner & Entertainment",
        ticketId: "ticket-1",
        ticketName: "Aga Khan",
        ticket: TICKET,
        quantity: 1,
        unitPrice: 210,
        lineTotal: 210,
      },
    ],
  },
]

/** Server figures from a 210 order with a 10 coupon: charges are rated on the discounted 200. */
const BREAKDOWN: EventCartPaymentBreakdown = {
  paymentMethod: "CreditCard",
  label: "Debit/Credit Card",
  isOrganizerOnly: false,
  merchantName: "Stripe",
  subtotal: 200,
  buyerChargeTotal: 42.38,
  grandTotal: 242.38,
  charges: [
    { source: "Event", title: "Tax", valueType: "Percentage", value: 17.99, amount: 35.98 },
    { source: "Platform", title: "Platform Charges", valueType: "Fixed", value: 4, amount: 4 },
  ],
}

function renderTable(discountAmount: number, grossSubtotal: number) {
  return render(
    <ChakraProvider value={system}>
      <PaymentBreakdownTable
        breakdown={BREAKDOWN}
        sessionGroups={SESSION_GROUPS}
        grossSubtotal={grossSubtotal}
        discountAmount={discountAmount}
        currencyCode="USD"
        onChangeQuantity={vi.fn()}
        onRequestRemove={vi.fn()}
      />
    </ChakraProvider>,
  )
}

function amountInRowLabelled(label: string) {
  const row = screen.getByText(label).closest("tr")
  expect(row).not.toBeNull()
  return within(row!).getAllByText(/USD\$/).at(-1)?.textContent
}

describe("PaymentBreakdownTable", () => {
  it("Subtotal_CouponApplied_ShowsTheAmountBeforeTheDiscount", () => {
    renderTable(10, 210)

    // The discount has its own row underneath. A net figure here reads as a second deduction.
    expect(amountInRowLabelled("Subtotal")).toBe("USD$210.00")
    expect(amountInRowLabelled("Coupon discount")).toBe("-USD$10.00")
  })

  it("Subtotal_CouponApplied_ShowsTheDiscountedAmountTheChargesAreRatedOn", () => {
    renderTable(10, 210)

    expect(amountInRowLabelled("Subtotal after discount")).toBe("USD$200.00")
    expect(amountInRowLabelled("Tax")).toBe("USD$35.98")
  })

  it("Subtotal_NoCoupon_ShowsNeitherTheDiscountNorTheDiscountedRow", () => {
    renderTable(0, 200)

    expect(screen.queryByText("Coupon discount")).toBeNull()
    expect(screen.queryByText("Subtotal after discount")).toBeNull()
    expect(amountInRowLabelled("Subtotal")).toBe("USD$200.00")
  })
})
