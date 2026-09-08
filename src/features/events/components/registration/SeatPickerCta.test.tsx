import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { SeatPickerCta } from "./SeatPickerCta"

function renderCta(seatCount: number) {
  const onOpen = vi.fn()

  render(
    <ChakraProvider value={system}>
      <SeatPickerCta seatCount={seatCount} accentColor="#7551FF" onOpen={onOpen} />
    </ChakraProvider>,
  )

  return { onOpen }
}

describe("SeatPickerCta", () => {
  /** A buyer holding no seats yet is being invited to start, and the button has to say so in those words. */
  it("invites the buyer to pick when no seats are held", () => {
    renderCta(0)

    expect(screen.getByRole("button", { name: "Pick seats" })).toBeInTheDocument()
  })

  /**
   * A buyer who already holds seats needs to know this button changes them rather than starting again, and how
   * many are at stake, before they press something that reopens the map.
   */
  it("says how many seats are already held", () => {
    renderCta(3)

    expect(screen.getByRole("button", { name: "Change seats · 3 picked" })).toBeInTheDocument()
  })

  /** The map is the caller's to open; a button that swallowed the press would leave the buyer with no way in. */
  it("reports the press to the caller", async () => {
    const { onOpen } = renderCta(0)

    await userEvent.click(screen.getByRole("button", { name: "Pick seats" }))

    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
