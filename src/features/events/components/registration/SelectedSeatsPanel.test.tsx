import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { SelectedSeatsPanel } from "./SelectedSeatsPanel"
import type { EventSeat } from "@/features/events/schemas/eventSeating.schemas"

const STALLS_SEAT: EventSeat = {
  objectLabel: "A-14",
  categoryKey: "cat-stalls",
  ticketTypeUniqueId: "ticket-1",
  ticketTypeName: "Stalls",
  price: 40,
}

/** Renders the panel inside the theme the registration form draws it in. */
function renderPanel(props: { seats?: EventSeat[]; isBusy?: boolean } = {}) {
  const onReleaseSeat = vi.fn()

  render(
    <ChakraProvider value={system}>
      <SelectedSeatsPanel
        seats={props.seats ?? [STALLS_SEAT]}
        currencyCode="USD"
        isBusy={props.isBusy ?? false}
        onReleaseSeat={onReleaseSeat}
      />
    </ChakraProvider>,
  )

  return { onReleaseSeat }
}

describe("SelectedSeatsPanel", () => {
  /**
   * The buyer chose particular seats, so the basket has to name them: a count cannot be checked against the map,
   * and a wrong seat found at the door is not something anybody can fix then.
   */
  it("names every seat the buyer is holding, with what it costs", () => {
    renderPanel()

    expect(screen.getByText("Seat A-14")).toBeInTheDocument()
    expect(screen.getByText("$40.00")).toBeInTheDocument()
  })

  /**
   * A buyer who picked the wrong seat has to be able to give up that one alone. Clearing the whole selection would
   * hand back seats they had already settled on.
   */
  it("gives up the one seat the buyer asked to remove", async () => {
    const { onReleaseSeat } = renderPanel({
      seats: [STALLS_SEAT, { ...STALLS_SEAT, objectLabel: "A-15" }],
    })

    await userEvent.click(screen.getByRole("button", { name: "Remove seat A-15" }))

    expect(onReleaseSeat).toHaveBeenCalledExactlyOnceWith("A-15")
  })

  /**
   * A second press while the first release is still in flight would race two answers into one basket, and the
   * later one winning is not something the buyer chose.
   */
  it("does not give up a seat twice while a change is still in flight", async () => {
    const { onReleaseSeat } = renderPanel({ isBusy: true })

    await userEvent.click(screen.getByRole("button", { name: "Remove seat A-14" }))

    expect(onReleaseSeat).not.toHaveBeenCalled()
  })

  /**
   * An empty basket has to say what to do next. A blank panel reads as a screen that failed to load rather than
   * one waiting for a choice.
   */
  it("says how to start when no seat has been picked", () => {
    renderPanel({ seats: [] })

    expect(screen.getByText("No seats chosen yet")).toBeInTheDocument()
  })
})
