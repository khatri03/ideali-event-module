import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { EventCartPaymentCharge } from "@/features/events/schemas/eventCart.schemas"
import { PurchaseReviewDialog } from "./PurchaseReviewDialog"

const TICKET_ROWS = [
  { sessionName: "Friday Dinner & Entertainment", ticketName: "Aga Khan", quantity: 1, lineTotal: 210 },
]

/** Server figures from a 210 order with a 10 coupon: charges are rated on the discounted 200. */
const CHARGES: EventCartPaymentCharge[] = [
  { source: "Event", title: "Tax", valueType: "Percentage", value: 17.99, amount: 35.98 },
  { source: "processor-fee", title: "Card fee", valueType: "Fixed", value: 4, amount: 4 },
]

function renderDialog(overrides: Partial<Parameters<typeof PurchaseReviewDialog>[0]> = {}) {
  return render(
    <ChakraProvider value={system}>
      <PurchaseReviewDialog
        isOpen
        onOpenChange={vi.fn()}
        eventTitle="Golden Jubilee"
        currencyCode="USD"
        accentColor="#123456"
        selectedTicketCount={1}
        paymentMethodLabel="Debit/Credit Card"
        isCardPayment
        validationMessage={null}
        ticketRows={TICKET_ROWS}
        grossSubtotal={210}
        discountAmount={10}
        netSubtotal={200}
        chargeRows={CHARGES}
        grandTotal={239.98}
        invoiceNote=""
        isConfirming={false}
        onInvoiceNoteChange={vi.fn()}
        onConfirm={vi.fn()}
        {...overrides}
      />
    </ChakraProvider>,
  )
}

function amountBesideLabel(label: string) {
  const row = screen.getAllByText(label).at(-1)?.closest("div")?.parentElement
  expect(row).not.toBeNull()
  return within(row!).getAllByText(/USD\$/).at(-1)?.textContent
}

describe("PurchaseReviewDialog", () => {
  it("Review_AnyOrder_LeadsWithTheAmountTheBuyerWillBeCharged", () => {
    renderDialog()

    // The ticket subtotal is not what leaves the buyer's account; the grand total is.
    expect(screen.getAllByText("USD$239.98").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Total to pay").length).toBe(2)
  })

  it("Review_CardPayment_PutsTheAmountOnTheConfirmButton", () => {
    renderDialog()

    expect(screen.getByRole("button", { name: "Pay USD$239.98" })).toBeTruthy()
  })

  it("Review_CouponApplied_ShowsTheSubtotalTheDiscountAndTheRatedSubtotal", () => {
    renderDialog()

    expect(amountBesideLabel("Ticket subtotal")).toBe("USD$210.00")
    expect(amountBesideLabel("Coupon discount")).toBe("-USD$10.00")
    expect(amountBesideLabel("Subtotal after discount")).toBe("USD$200.00")
  })

  it("Review_NoCoupon_ShowsNeitherTheDiscountNorTheRatedSubtotal", () => {
    renderDialog({ discountAmount: 0, grossSubtotal: 200, netSubtotal: 200 })

    expect(screen.queryByText("Coupon discount")).toBeNull()
    expect(screen.queryByText("Subtotal after discount")).toBeNull()
  })

  it("Review_UnresolvedComplaint_BlocksConfirmAndShowsIt", () => {
    renderDialog({ validationMessage: "Accept the terms and conditions to continue." })

    expect(screen.getByRole("alert").textContent).toContain("Accept the terms and conditions to continue.")
    expect(screen.getByRole("button", { name: "Pay USD$239.98" }).hasAttribute("disabled")).toBe(true)
  })

  it("Review_NonCardPayment_DoesNotPromiseAnImmediateCharge", () => {
    renderDialog({ isCardPayment: false })

    expect(screen.getByRole("button", { name: "Confirm purchase" })).toBeTruthy()
  })

  it("Review_AnyPaymentMethod_OffersOneInvoiceNote", () => {
    renderDialog()

    expect(screen.getByPlaceholderText("Add an optional note for this invoice")).toBeTruthy()
  })
})
