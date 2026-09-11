import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { SeatPickerDialog } from "./SeatPickerDialog"

function renderDialog(isOpen: boolean) {
  const onOpenChange = vi.fn()

  render(
    <ChakraProvider value={system}>
      <SeatPickerDialog
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        sessionName="Opening Night"
        accentColor="#7551FF"
      >
        <div>Seat map</div>
      </SeatPickerDialog>
    </ChakraProvider>,
  )

  return { onOpenChange }
}

describe("SeatPickerDialog", () => {
  /**
   * The whole point of moving the chart behind a button is that a session nobody opens costs nothing to draw.
   * A body mounted while shut would put every seated session's renderer back on the page.
   */
  it("mounts nothing of its body until it is opened", () => {
    renderDialog(false)

    expect(screen.queryByText("Seat map")).not.toBeInTheDocument()
  })

  /** Once opened it has to name the session, or a buyer with several open sessions cannot tell which map this is. */
  it("names the session the seats are being picked for", () => {
    renderDialog(true)

    expect(screen.getByText("Opening Night")).toBeInTheDocument()
    expect(screen.getByText("Seat map")).toBeInTheDocument()
  })

  /** Closing is the caller's decision to record, so the buyer is never trapped on a map they are done with. */
  it("asks the caller to close when the buyer presses the Close button", async () => {
    const { onOpenChange } = renderDialog(true)

    await userEvent.click(screen.getByRole("button", { name: "Close" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  /**
   * The corner dismiss was removed so leaving is a deliberate press of the Close CTA, never a stray click that
   * discards a half-finished seat pick. Its return would put the accidental exit back.
   */
  it("offers no corner close control, only the Close button", () => {
    renderDialog(true)

    expect(screen.queryByRole("button", { name: "Close the seat map" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument()
  })
})
