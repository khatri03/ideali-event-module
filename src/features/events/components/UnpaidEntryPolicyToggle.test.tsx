import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { UnpaidEntryPolicyToggle } from "./UnpaidEntryPolicyToggle"

function renderToggle(isEnabled: boolean) {
  const onToggle = vi.fn()

  render(
    <ChakraProvider value={system}>
      <UnpaidEntryPolicyToggle isEnabled={isEnabled} onToggle={onToggle} />
    </ChakraProvider>,
  )

  return { onToggle, control: screen.getByLabelText("Refuse entry until the order is paid") }
}

describe("UnpaidEntryPolicyToggle", () => {
  it("UnpaidEntryAllowed_RendersTheSwitchOff", () => {
    const { control } = renderToggle(false)

    expect(control).not.toBeChecked()
  })

  /** The organizer is deciding who gets turned away, so the consequence is spelled out, not implied. */
  it("UnpaidEntryRefused_SaysWhatHappensAtTheDoor", () => {
    renderToggle(true)

    expect(screen.getByText("On")).toBeInTheDocument()
    expect(screen.getByText(/refused at the door/)).toBeInTheDocument()
  })

  it("OrganizerRefusesUnpaidEntry_ReportsTheChoice", async () => {
    const { control, onToggle } = renderToggle(false)

    await userEvent.click(control, { pointerEventsCheck: 0 })

    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it("OrganizerAllowsUnpaidEntry_ReportsTheChoice", async () => {
    const { control, onToggle } = renderToggle(true)

    await userEvent.click(control, { pointerEventsCheck: 0 })

    expect(onToggle).toHaveBeenCalledWith(false)
  })
})
