import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { SeatsIoCategoryCapacityButton } from "./SeatsIoCategoryCapacityButton"

/** Renders the button inside the theme the ticket modal draws it in. */
function renderButton(props: { isBusy?: boolean; disabledReason?: string | null; onPull?: () => void } = {}) {
  const onPull = props.onPull ?? vi.fn()

  render(
    <ChakraProvider value={system}>
      <SeatsIoCategoryCapacityButton
        isBusy={props.isBusy ?? false}
        disabledReason={props.disabledReason ?? null}
        onPull={onPull}
      />
    </ChakraProvider>,
  )

  return { onPull }
}

describe("SeatsIoCategoryCapacityButton", () => {
  /**
   * The whole point of the button is to spare the organizer counting seats in the designer, so a press has to ask
   * for the count.
   */
  it("asks for the seat count when pressed", async () => {
    const { onPull } = renderButton()

    await userEvent.click(screen.getByRole("button", { name: /use layout count/i }))

    expect(onPull).toHaveBeenCalledTimes(1)
  })

  /**
   * A button that cannot act has to say why. Chakra's `disabled` would take the tooltip with it and leave a grey
   * control the organizer can only guess at, so the reason has to survive on a still-hoverable button.
   */
  it("refuses to act and carries the reason when there is no category to count", async () => {
    const { onPull } = renderButton({ disabledReason: "Select a category first." })

    const button = screen.getByRole("button", { name: /use layout count/i })
    expect(button).toHaveAttribute("aria-disabled", "true")

    await userEvent.click(button)
    expect(onPull).not.toHaveBeenCalled()

    await userEvent.hover(button)
    expect(await screen.findByText("Select a category first.")).toBeInTheDocument()
  })

  /**
   * A second press while the first count is still in flight would race two answers into one field, and the later
   * one winning is not something the organizer chose.
   */
  it("does not ask again while a count is already being read", async () => {
    const { onPull } = renderButton({ isBusy: true })

    const button = screen.getByRole("button", { name: /counting/i })
    await userEvent.click(button)

    expect(onPull).not.toHaveBeenCalled()
  })
})
