import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { SelectedSeatsPanel } from "./SelectedSeatsPanel"
import type { EventSeat } from "@/features/events/schemas/eventSeating.schemas"

const STALLS_SEAT: EventSeat = {
  objectLabel: "A-14",
  objectType: "seat",
  categoryKey: "cat-stalls",
  ticketTypeUniqueId: "ticket-1",
  ticketTypeName: "Stalls",
  price: 40,
}

/** A seat at a numbered table, which is what the grouping heads with a table rather than a row. */
function tableSeat(objectLabel: string): EventSeat {
  return { ...STALLS_SEAT, objectLabel, ticketTypeName: "Standard Seat", price: 150 }
}

/** The chart's own colour for the ticket type the seats here are sold as. */
const STALLS_COLOR = "rgb(117, 81, 255)"

/** Renders the panel inside the theme the registration form draws it in. */
function renderPanel(
  props: { seats?: EventSeat[]; isBusy?: boolean; seatColorByTicketType?: Record<string, string> } = {},
) {
  const onReleaseSeats = vi.fn()

  const view = render(
    <ChakraProvider value={system}>
      <SelectedSeatsPanel
        sessionName="Opening Night"
        seats={props.seats ?? [STALLS_SEAT]}
        currencyCode="USD"
        seatColorByTicketType={props.seatColorByTicketType ?? { "ticket-1": STALLS_COLOR }}
        isBusy={props.isBusy ?? false}
        onReleaseSeats={onReleaseSeats}
      />
    </ChakraProvider>,
  )

  return { onReleaseSeats, container: view.container }
}

/** Every colour the panel drew, in document order, so a rule can say which seats wore which. */
function readSeatColors(container: HTMLElement): string[] {
  const isPainted = (color: string) => color !== "" && color !== "transparent" && color !== "rgba(0, 0, 0, 0)"

  return [...container.querySelectorAll('[aria-hidden="true"]')]
    .map((dot) => window.getComputedStyle(dot).backgroundColor)
    .filter(isPainted)
}

/** Answers the confirmation the way a buyer who meant it does. */
async function confirmRemoval() {
  await userEvent.click(await screen.findByRole("button", { name: "Remove" }))
}

describe("SelectedSeatsPanel", () => {
  /**
   * The basket is where the buyer checks what they have taken of each category, and the chart's colour is what
   * carries that at a glance. A basket in neutral greys makes them match seat numbers back to the map by hand.
   */
  it("wears the colour the chart draws those seats in", () => {
    const { container } = renderPanel()

    expect(readSeatColors(container)).toContain(STALLS_COLOR)
  })

  /**
   * Colour never carries the meaning on its own. The ticket type is named beside the dot, so a buyer who cannot
   * tell two categories apart by colour reads the same basket.
   */
  it("names the ticket type beside the colour it is drawn in", () => {
    renderPanel()

    expect(screen.getByText("Stalls")).toBeInTheDocument()
  })

  /**
   * A ticket type the chart gave no colour for has nothing on the map to match. Drawing a swatch anyway would
   * point the buyer at seats of some other category.
   */
  it("draws no colour for a ticket type the chart never coloured", () => {
    const { container } = renderPanel({ seatColorByTicketType: {} })

    expect(readSeatColors(container)).toHaveLength(0)
  })

  /**
   * Seats at one table sold as different ticket types have no single colour between them, so the heading must not
   * claim one - each seat carries its own instead, or the buyer reads the whole table as one category.
   */
  it("colours each seat of a table sold as a mixture on its own", () => {
    const { container } = renderPanel({
      seats: [
        tableSeat("18-1"),
        { ...tableSeat("18-2"), ticketTypeUniqueId: "ticket-2", ticketTypeName: "Premium Seat", price: 300 },
      ],
      seatColorByTicketType: { "ticket-1": STALLS_COLOR, "ticket-2": "rgb(1, 181, 116)" },
    })

    expect(readSeatColors(container)).toEqual([STALLS_COLOR, "rgb(1, 181, 116)"])
  })

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

describe("SelectedSeatsPanel object naming", () => {
  /**
   * The reported defect: a whole table picked under a "Standard Table" category was listed as "Seat 8", because
   * the plan labels a table sold whole with a bare number just as it labels a chair. The basket has to name back
   * what the buyer actually took, or they are told they bought a chair for the price of a table.
   */
  it("names a table sold as one object a table rather than a seat", () => {
    renderPanel({
      seats: [
        {
          objectLabel: "8",
          objectType: "table",
          categoryKey: "cat-tables",
          ticketTypeUniqueId: "ticket-2",
          ticketTypeName: "Standard Table",
          price: 1000,
        },
      ],
      seatColorByTicketType: { "ticket-2": STALLS_COLOR },
    })

    expect(screen.getByText("Table 8")).toBeInTheDocument()
    expect(screen.queryByText("Seat 8")).not.toBeInTheDocument()
  })

  /**
   * A chair at a table keeps reading as a seat under its table's heading. The fix for the table must not rename
   * every ordinary seat along with it.
   */
  it("still names a chair at a table a seat", () => {
    renderPanel({ seats: [tableSeat("20-11")] })

    expect(screen.getByText("Table 20")).toBeInTheDocument()
    expect(screen.getByText("Seat 11")).toBeInTheDocument()
  })
})
