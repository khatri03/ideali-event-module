import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { RegistrationAcknowledgementCard } from "./RegistrationAcknowledgementCard"

const LABEL = "I accept the registration terms and conditions."

function renderCard(isInvalid: boolean, onAcceptedChange = vi.fn()) {
  render(
    <ChakraProvider value={system}>
      <RegistrationAcknowledgementCard
        label={LABEL}
        actionLabel="View terms"
        isAccepted={false}
        isInvalid={isInvalid}
        onAcceptedChange={onAcceptedChange}
        onViewContent={vi.fn()}
        accentColor="#4C1D95"
        validationRef={createRef<HTMLDivElement>()}
      />
    </ChakraProvider>,
  )

  return onAcceptedChange
}

describe("RegistrationAcknowledgementCard", () => {
  it("Label_BlockedTheLastPayAttempt_IsMarkedInvalidForAssistiveTech", () => {
    renderCard(true)

    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true")
  })

  it("Label_NotBlocking_CarriesNoInvalidState", () => {
    renderCard(false)

    // Chakra always writes the attribute, so the value is what carries the state.
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "false")
  })

  it("Checkbox_Ticked_ReportsAcceptanceSoTheHighlightCanClear", async () => {
    const onAcceptedChange = renderCard(true)

    await userEvent.click(screen.getByText(LABEL))

    expect(onAcceptedChange).toHaveBeenCalledWith(true)
  })
})
