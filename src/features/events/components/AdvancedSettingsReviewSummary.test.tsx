import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { AdvancedSettingsReviewSummary } from "./AdvancedSettingsReviewSummary"

function renderSummary(overrides: Partial<Parameters<typeof AdvancedSettingsReviewSummary>[0]> = {}) {
  render(
    <ChakraProvider value={system}>
      <AdvancedSettingsReviewSummary
        visibilityLabel="Public"
        purchaseTimeLimitMinutes={15}
        passesPaymentFeesToBuyer={false}
        refusesUnpaidEntry={false}
        {...overrides}
      />
    </ChakraProvider>,
  )
}

describe("AdvancedSettingsReviewSummary", () => {
  /**
   * Review is the last place the organizer sees where the payment method fee lands. Leaving it off the
   * summary means the choice is confirmed without being seen, and the shortfall shows up in the payout.
   */
  it("SaysTheBuyerCarriesTheFeeWhenTheChargeIsPassedOn", () => {
    renderSummary({ passesPaymentFeesToBuyer: true })

    expect(screen.getByText("Buyer pays the payment method fee")).toBeInTheDocument()
  })

  it("SaysTheOrganizerCarriesTheFeeWhenTheChargeIsNotPassedOn", () => {
    renderSummary()

    expect(screen.getByText("Organizer absorbs the payment method fee")).toBeInTheDocument()
  })

  /** The door policy has no override, so publishing it unseen strands guests on the event day. */
  it("SaysUnpaidOrdersAreRefusedWhenTheDoorPolicyIsOn", () => {
    renderSummary({ refusesUnpaidEntry: true })

    expect(screen.getByText("Unpaid orders refused at the door")).toBeInTheDocument()
  })

  it("SaysUnpaidOrdersAreAdmittedWhenTheDoorPolicyIsOff", () => {
    renderSummary()

    expect(screen.getByText("Unpaid orders admitted at the door")).toBeInTheDocument()
  })

  it("NamesTheVisibilityAndPurchaseWindowAlongsideThePolicies", () => {
    renderSummary({ visibilityLabel: "Invitation", purchaseTimeLimitMinutes: 20 })

    expect(screen.getByText("Invitation")).toBeInTheDocument()
    expect(screen.getByText("20 minutes")).toBeInTheDocument()
  })

  it("KeepsTheMinuteLabelSingularForAOneMinuteWindow", () => {
    renderSummary({ purchaseTimeLimitMinutes: 1 })

    expect(screen.getByText("1 minute")).toBeInTheDocument()
  })
})
