import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import type { EventInvoiceCharge } from "@/api/eventInvoices"
import { system } from "@/theme"
import { EventInvoiceChargeBreakdownSection } from "./EventInvoiceChargeBreakdownSection"

const CHARGES: EventInvoiceCharge[] = [
  {
    label: "Sales Tax",
    chargeKind: "Tax",
    chargeKindLabel: "Tax",
    sourceType: "EventChargeRule",
    sourceTypeLabel: "Event Charge Rule",
    calculationType: "Percent",
    calculationTypeLabel: "Percent",
    sourceUniqueId: "rule-1",
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
    sourceUniqueId: "rule-2",
    value: 4,
    amount: 4,
    displayOrder: 2,
  },
]

function renderSection(charges: EventInvoiceCharge[] = CHARGES) {
  return render(
    <ChakraProvider value={system}>
      <EventInvoiceChargeBreakdownSection charges={charges} currencySymbol="$" />
    </ChakraProvider>,
  )
}

describe("EventInvoiceChargeBreakdownSection", () => {
  it("ChargesPresent_ShowsSavedLabelsAndAmounts", () => {
    renderSection()

    expect(screen.getByRole("button", { name: /charge breakdown 2/i })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Sales Tax")).toBeInTheDocument()
    expect(screen.getByText("Platform Charges")).toBeInTheDocument()
    expect(screen.getByText("$75.56")).toBeInTheDocument()
    expect(screen.getByText("$4.00")).toBeInTheDocument()
    expect(screen.getByText("Event Charge Rule")).toBeInTheDocument()
    expect(screen.getByText("Revenue Plan Rule")).toBeInTheDocument()
  })

  it("NoCharges_HidesTheSection", () => {
    renderSection([])

    expect(screen.queryByRole("button", { name: /charge breakdown/i })).not.toBeInTheDocument()
  })
})
