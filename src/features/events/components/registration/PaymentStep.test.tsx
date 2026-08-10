import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { EventCartPaymentBreakdown } from "@/features/events/schemas/eventCart.schemas"
import { PaymentStep } from "./PaymentStep"

const BREAKDOWN: EventCartPaymentBreakdown = {
  paymentMethod: "CreditCard",
  label: "Debit/Credit Card",
  isOrganizerOnly: false,
  merchantName: "Stripe",
  subtotal: 200,
  buyerChargeTotal: 39.98,
  grandTotal: 239.98,
  charges: [],
}

interface PaymentStepOverrides {
  acceptsDiscountCoupons?: boolean
  appliedCouponCode?: string | null
  isChequeMethodSelected?: boolean
}

function renderPaymentStep({
  acceptsDiscountCoupons = true,
  appliedCouponCode = null,
  isChequeMethodSelected = false,
}: PaymentStepOverrides = {}) {
  return render(
    <ChakraProvider value={system}>
      <PaymentStep
        breakdowns={[BREAKDOWN]}
        selectedBreakdown={BREAKDOWN}
        onSelectMethod={vi.fn()}
        sessionGroups={[]}
        grossSubtotal={200}
        ticketSubtotal={200}
        discountAmount={appliedCouponCode ? 10 : 0}
        acceptsDiscountCoupons={acceptsDiscountCoupons}
        appliedCouponCode={appliedCouponCode}
        onApplyCoupon={vi.fn()}
        onRemoveCoupon={vi.fn()}
        isCouponSyncing={false}
        currencyCode="USD"
        formAccent="#123456"
        isLoading={false}
        hasVisiblePaymentMethods
        validationMessage={null}
        methodValidationRef={createRef<HTMLDivElement>()}
        onChangeQuantity={vi.fn()}
        onRequestRemove={vi.fn()}
        // Keeps Stripe Elements out of the tree; the coupon gate is what is under test.
        isCardMethodSelected={false}
        cardHolderName=""
        onCardHolderNameChange={vi.fn()}
        isChequeMethodSelected={isChequeMethodSelected}
        chequeReferenceNo=""
        onChequeReferenceNoChange={vi.fn()}
      />
    </ChakraProvider>,
  )
}

describe("PaymentStep coupon entry", () => {
  it("CouponField_EventHasARedeemableCoupon_IsOffered", () => {
    renderPaymentStep()

    expect(screen.getByText("Have a coupon?")).toBeTruthy()
  })

  it("CouponField_NoRedeemableCouponOnTheEvent_IsNotOffered", () => {
    renderPaymentStep({ acceptsDiscountCoupons: false })

    // Discounts off, or every coupon deactivated or spent: inviting a code that cannot pass is worse
    // than showing nothing.
    expect(screen.queryByText("Have a coupon?")).toBeNull()
  })

  it("CouponField_CouponAlreadyOnTheCart_StaysSoItCanBeRemoved", () => {
    renderPaymentStep({ acceptsDiscountCoupons: false, appliedCouponCode: "SAVE10" })

    expect(screen.getByText("SAVE10")).toBeTruthy()
    expect(screen.getByRole("button", { name: /Remove/ })).toBeTruthy()
  })
})

describe("PaymentStep cheque entry", () => {
  it("ChequeFields_ChequeMethodSelected_AskForTheReferenceNumber", () => {
    renderPaymentStep({ isChequeMethodSelected: true })

    expect(screen.getByPlaceholderText("Enter the number printed on the cheque")).toBeTruthy()
  })

  it("ChequeFields_ReferenceNumber_IsMarkedRequired", () => {
    renderPaymentStep({ isChequeMethodSelected: true })

    expect(screen.getByText(/Cheque reference number/).textContent).toContain("*")
  })

  it("ChequeFields_ChequeMethodSelected_SayTheOrderStaysOwing", () => {
    renderPaymentStep({ isChequeMethodSelected: true })

    expect(screen.getByText(/stays marked as owing/i)).toBeTruthy()
  })

  it("ChequeFields_AnotherMethodSelected_AreNotRendered", () => {
    renderPaymentStep()

    expect(screen.queryByPlaceholderText("Enter the number printed on the cheque")).toBeNull()
  })
})
