import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { SeatIdentity } from "@/features/events/utils/seatGrouping"
import { SeatLabelSummary } from "./SeatLabelSummary"

const TABLE_18_SEATS: SeatIdentity[] = [
  { objectLabel: "18-2", objectType: "seat" },
  { objectLabel: "18-8", objectType: "seat" },
]

function renderSummary(props: Partial<Parameters<typeof SeatLabelSummary>[0]> = {}) {
  const onRemoveSeat = vi.fn()

  render(
    <ChakraProvider value={system}>
      <SeatLabelSummary seats={TABLE_18_SEATS} {...props} />
    </ChakraProvider>,
  )

  return { onRemoveSeat }
}

describe("SeatLabelSummary", () => {
  /** With no seats the panel points the buyer back to where seats come from, rather than showing an empty frame. */
  it("says where seats come from when none are held", () => {
    renderSummary({ seats: [] })

    expect(screen.getByText(/appear here/i)).toBeInTheDocument()
  })

  /**
   * Read-only is the default: the payment review lists seats without letting them be dropped, so a summary with no
   * remove handler must render plain labels and never a control that hands a seat back.
   */
  it("lists seats without any remove control when no handler is given", () => {
    renderSummary()

    expect(screen.getByText("Table 18")).toBeInTheDocument()
    expect(screen.getByText("Seat 2")).toBeInTheDocument()
    expect(screen.getByText("Seat 8")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  /**
   * A seat handed back goes on sale again at once, so the buyer confirms against the seat by name before it goes.
   * Confirming is what releases it, and it releases exactly the object the buyer pressed.
   */
  it("releases one named seat only after the buyer confirms it", async () => {
    const { onRemoveSeat } = renderSummary({ onRemoveSeat: (label) => onRemoveSeat(label) })

    await userEvent.click(screen.getByRole("button", { name: "Remove Seat 2 at Table 18" }))

    expect(screen.getByText("Remove Seat 2 at Table 18?")).toBeInTheDocument()
    expect(onRemoveSeat).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Remove" }))

    expect(onRemoveSeat).toHaveBeenCalledExactlyOnceWith("18-2")
  })

  /** Backing out of the confirmation keeps the seat, so a mis-tap never costs the buyer a chair. */
  it("keeps the seat when the buyer cancels the confirmation", async () => {
    const { onRemoveSeat } = renderSummary({ onRemoveSeat: (label) => onRemoveSeat(label) })

    await userEvent.click(screen.getByRole("button", { name: "Remove Seat 8 at Table 18" }))
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onRemoveSeat).not.toHaveBeenCalled()
  })

  /** While a release is in flight the seats cannot be dropped again, so one confirmation cannot fire twice. */
  it("does not open the confirmation while a seat change is in flight", async () => {
    const { onRemoveSeat } = renderSummary({ onRemoveSeat: (label) => onRemoveSeat(label), isBusy: true })

    await userEvent.click(screen.getByRole("button", { name: "Remove Seat 2 at Table 18" }))

    expect(screen.queryByText("Remove Seat 2 at Table 18?")).not.toBeInTheDocument()
    expect(onRemoveSeat).not.toHaveBeenCalled()
  })
})
