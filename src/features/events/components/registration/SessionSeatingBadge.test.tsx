import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { SessionSeatingBadge } from "./SessionSeatingBadge"

function renderBadge() {
  return render(
    <ChakraProvider value={system}>
      <SessionSeatingBadge />
    </ChakraProvider>,
  )
}

describe("SessionSeatingBadge", () => {
  /**
   * The mark is a picture with no words beside it. Without a name of its own a screen reader announces nothing at
   * all, and the one thing separating a seated session from every other card is silent.
   */
  it("names itself for a buyer who cannot see the seat", () => {
    renderBadge()

    expect(screen.getByRole("img", { name: "Seat selection" })).toBeInTheDocument()
  })

  /**
   * A seat drawn on a card is a guess until it is explained. Hovering must say what the session will actually ask
   * of the buyer rather than leaving them to read the icon.
   */
  it("explains what the seat means when it is pointed at", async () => {
    renderBadge()

    await userEvent.hover(screen.getByRole("img", { name: "Seat selection" }))

    expect(await screen.findByText("Seats for this session are picked from a seating plan.")).toBeInTheDocument()
  })

  /** A tooltip that only opens on hover is unreachable from a keyboard, so the mark takes focus of its own. */
  it("takes keyboard focus so its explanation is reachable without a pointer", async () => {
    renderBadge()

    await userEvent.tab()

    expect(screen.getByRole("img", { name: "Seat selection" })).toHaveFocus()
  })
})
