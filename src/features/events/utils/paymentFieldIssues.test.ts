import { describe, expect, it } from "vitest"
import { getPaymentFieldIssues, type PaymentFieldState } from "./paymentFieldIssues"

function stateOf(overrides: Partial<PaymentFieldState> = {}): PaymentFieldState {
  return {
    hasSelectedMethod: true,
    isCardMethod: false,
    cardHolderName: "",
    isChequeMethod: false,
    chequeReferenceNo: "",
    ...overrides,
  }
}

describe("getPaymentFieldIssues", () => {
  it("NoMethodSelected_AsksForOne", () => {
    const issues = getPaymentFieldIssues(stateOf({ hasSelectedMethod: false }))

    expect(issues).toEqual([{ message: "Select a payment method.", target: "payment-method" }])
  })

  it("CardWithoutAName_AsksForTheCardholderName", () => {
    const issues = getPaymentFieldIssues(stateOf({ isCardMethod: true }))

    expect(issues).toEqual([{ message: "Enter the cardholder name.", target: "payment-method" }])
  })

  it("ChequeWithoutAReference_AsksForTheReferenceNumber", () => {
    const issues = getPaymentFieldIssues(stateOf({ isChequeMethod: true }))

    expect(issues).toEqual([{ message: "Enter the cheque reference number.", target: "payment-method" }])
  })

  it("ChequeWithOnlySpaces_AsksForTheReferenceNumber", () => {
    const issues = getPaymentFieldIssues(stateOf({ isChequeMethod: true, chequeReferenceNo: "   " }))

    expect(issues).toHaveLength(1)
  })

  it("ChequeWithAReference_Passes", () => {
    const issues = getPaymentFieldIssues(stateOf({ isChequeMethod: true, chequeReferenceNo: "CHQ-1001" }))

    expect(issues).toEqual([])
  })

  /** The cheque rule must not leak onto a card order, which has no reference to give. */
  it("CardWithANameAndNoReference_Passes", () => {
    const issues = getPaymentFieldIssues(stateOf({ isCardMethod: true, cardHolderName: "Ada Lovelace" }))

    expect(issues).toEqual([])
  })
})
