import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { PaymentMethodChargesToggle } from "./PaymentMethodChargesToggle"

function renderToggle(isEnabled: boolean, onToggle = vi.fn()) {
  render(
    <ChakraProvider value={system}>
      <PaymentMethodChargesToggle isEnabled={isEnabled} onToggle={onToggle} />
    </ChakraProvider>,
  )

  return { onToggle, control: screen.getByLabelText("Pass payment method charges to the buyer") }
}

describe("PaymentMethodChargesToggle", () => {
  it("ChargesNotPassedOn_RendersTheSwitchOff", () => {
    const { control } = renderToggle(false)

    expect(control).not.toBeChecked()
  })

  it("ChargesPassedOn_SaysSoRatherThanLeavingTheOrganizerToGuess", () => {
    renderToggle(true)

    expect(screen.getByText("On")).toBeInTheDocument()
    expect(screen.getByText(/added to their total/)).toBeInTheDocument()
  })

  it("OrganizerTurnsItOn_ReportsTheOptIn", async () => {
    const { control, onToggle } = renderToggle(false)

    await userEvent.click(control, { pointerEventsCheck: 0 })

    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it("OrganizerTurnsItOff_ReportsTheOptOut", async () => {
    const { control, onToggle } = renderToggle(true)

    await userEvent.click(control, { pointerEventsCheck: 0 })

    expect(onToggle).toHaveBeenCalledWith(false)
  })
})
