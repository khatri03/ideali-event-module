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

/** A seat at a numbered table, which is what the grouping heads with a table rather than a row. */
function tableSeat(objectLabel: string): EventSeat {
  return { ...STALLS_SEAT, objectLabel, ticketTypeName: "Standard Seat", price: 150 }
}

/** Renders the panel inside the theme the registration form draws it in. */
function renderPanel(props: { seats?: EventSeat[]; isBusy?: boolean } = {}) {
  const onReleaseSeats = vi.fn()

  render(
    <ChakraProvider value={system}>
      <SelectedSeatsPanel
        sessionName="Opening Night"
        seats={props.seats ?? [STALLS_SEAT]}
        currencyCode="USD"
        isBusy={props.isBusy ?? false}
        onReleaseSeats={onReleaseSeats}
      />
    </ChakraProvider>,
  )

  return { onReleaseSeats }
}

/** Answers the confirmation the way a buyer who meant it does. */
async function confirmRemoval() {
  await userEvent.click(await screen.findByRole("button", { name: "Remove" }))
}

describe("SelectedSeatsPanel", () => {
  /**
   * The buyer chose particular seats, so the basket has to name them: a count cannot be checked against the map,
   * and a wrong seat found at the door is not something anybody can fix then.
   */
  it("names every seat the buyer is holding, with what it costs", () => {
    renderPanel()

    expect(screen.getByText("Row A")).toBeInTheDocument()
    expect(screen.getByText("Seat 14")).toBeInTheDocument()
    expect(screen.getByText("1 seat, $40.00 ($40.00 each)")).toBeInTheDocument()
  })

  /**
   * Seats at one table are all sold as the same thing, and naming that ticket type on every seat buries the numbers
   * the buyer came to check under nine copies of one sentence.
   */
  it("names a table's ticket type once rather than on every seat under it", () => {
    renderPanel({ seats: [tableSeat("19-1"), tableSeat("19-2")] })

    expect(screen.getByText("Standard Seat")).toBeInTheDocument()
  })

  /** A table whose seats are sold at different prices has no single answer, so the heading names none. */
  it("states no single price when a table's seats are not sold alike", () => {
    renderPanel({
      seats: [tableSeat("19-1"), { ...tableSeat("19-2"), price: 50 }],
    })

    expect(screen.getAllByText("2 seats, $200.00")).toHaveLength(2)
  })

  /**
   * A price belongs to the category a seat is drawn in, not to the seat, so a table sold alike states it once and
   * says it is what each seat costs. Repeating it on every seat says nothing new nine times.
   */
  it("prices a table sold alike once, as what one seat costs", () => {
    renderPanel({ seats: [tableSeat("19-1"), tableSeat("19-2")] })

    expect(screen.getByText("2 seats, $300.00 ($150.00 each)")).toBeInTheDocument()
    expect(screen.queryByText("$150.00")).not.toBeInTheDocument()
  })

  /** Seats at a mixed table are not all the same purchase, so each names the category that prices it. */
  it("names the category on each seat of a table sold as a mixture", () => {
    renderPanel({
      seats: [tableSeat("19-1"), { ...tableSeat("19-2"), ticketTypeName: "Premium Seat", price: 50 }],
    })

    expect(screen.getByText("Standard Seat")).toBeInTheDocument()
    expect(screen.getByText("Premium Seat")).toBeInTheDocument()
  })

  /**
   * Seats at one table were picked as a party and are read as one. Listing them flat leaves the buyer counting
   * labels to work out which of them sit together.
   */
  it("lists seats at the same table under that table", () => {
    renderPanel({ seats: [tableSeat("19-2"), tableSeat("19-3"), tableSeat("18-1")] })

    expect(screen.getByText("Table 19")).toBeInTheDocument()
    expect(screen.getByText("Table 18")).toBeInTheDocument()
    expect(screen.getByText("2 seats, $300.00 ($150.00 each)")).toBeInTheDocument()
  })

  /**
   * A buyer who picked the wrong seat has to be able to give up that one alone. Clearing the whole selection would
   * hand back seats they had already settled on.
   */
  it("gives up the one seat the buyer asked to remove", async () => {
    const { onReleaseSeats } = renderPanel({
      seats: [STALLS_SEAT, { ...STALLS_SEAT, objectLabel: "A-15" }],
    })

    await userEvent.click(screen.getByRole("button", { name: "Remove Seat 15 at Row A" }))
    await confirmRemoval()

    expect(onReleaseSeats).toHaveBeenCalledExactlyOnceWith(["A-15"])
  })

  /**
   * A party that shrank gives up its table, and pressing eight separate buttons to do it is where a buyer gives up
   * on the form instead.
   */
  it("gives up every seat at a table in one go", async () => {
    const { onReleaseSeats } = renderPanel({
      seats: [tableSeat("19-2"), tableSeat("19-3"), tableSeat("18-1")],
    })

    await userEvent.click(screen.getByRole("button", { name: "Remove Table 19" }))
    await confirmRemoval()

    expect(onReleaseSeats).toHaveBeenCalledExactlyOnceWith(["19-2", "19-3"])
  })

  /** Dropping a session is the buyer changing their mind about attending it, not about one seat in it. */
  it("gives up every seat picked for the session in one go", async () => {
    const { onReleaseSeats } = renderPanel({
      seats: [tableSeat("19-2"), tableSeat("18-1")],
    })

    await userEvent.click(screen.getByRole("button", { name: "Remove all seats for Opening Night" }))
    await confirmRemoval()

    expect(onReleaseSeats).toHaveBeenCalledExactlyOnceWith(["19-2", "18-1"])
  })

  /**
   * A seat handed back goes on sale the moment it is released and may be gone for good, so the buyer is told what
   * they are about to lose before it happens rather than after.
   */
  it("names what is being given up before anything is released", async () => {
    const { onReleaseSeats } = renderPanel({ seats: [tableSeat("19-2"), tableSeat("19-3")] })

    await userEvent.click(screen.getByRole("button", { name: "Remove Table 19" }))

    expect(await screen.findByText("Remove Table 19?")).toBeInTheDocument()
    expect(onReleaseSeats).not.toHaveBeenCalled()
  })

  /** A buyer who opened the confirmation by mistake must be able to back out with their seats untouched. */
  it("keeps the seats when the buyer cancels the confirmation", async () => {
    const { onReleaseSeats } = renderPanel()

    await userEvent.click(screen.getByRole("button", { name: "Remove Seat 14 at Row A" }))
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }))

    expect(onReleaseSeats).not.toHaveBeenCalled()
    expect(screen.getByText("Seat 14")).toBeInTheDocument()
  })

  /**
   * A second press while the first release is still in flight would race two answers into one basket, and the
   * later one winning is not something the buyer chose.
   */
  it("does not give up a seat twice while a change is still in flight", async () => {
    const { onReleaseSeats } = renderPanel({ isBusy: true })

    await userEvent.click(screen.getByRole("button", { name: "Remove Seat 14 at Row A" }))

    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument()
    expect(onReleaseSeats).not.toHaveBeenCalled()
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
