import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { EventSeatingMap } from "@/features/events/schemas/eventSeating.schemas"
import { UNAVAILABLE_SEAT_COLOR } from "@/features/events/utils/seatColors"
import { SeatMapPanel } from "./SeatMapPanel"

/**
 * Stands in for the vendor renderer, which draws to a WebGL canvas served by Seats.io. The chart itself is theirs
 * to test; what this file protects is how it is addressed and what the buyer is shown when it cannot be drawn.
 */
const deselectObjects = vi.fn().mockResolvedValue(undefined)

type MockObject = { label: string; objectType?: string; category?: { key: string | number } }

vi.mock("@seatsio/seatsio-react", () => ({
  SeatsioSeatingChart: ({
    mode,
    session,
    holdToken,
    selectedObjects,
    maxSelectedObjects,
    priceFormatter,
    objectColor,
    extraConfig,
    onRenderStarted,
    onObjectSelected,
    onHoldSucceeded,
    onHoldCallsInProgress,
    onHoldCallsComplete,
    onChartRenderingFailed,
  }: {
    mode: string
    session: string
    holdToken?: string
    selectedObjects: Array<{ label: string }>
    maxSelectedObjects: Array<{ category: string; quantity: number }>
    priceFormatter: (price: number) => string
    objectColor: (
      object: { isSelectable?: () => boolean },
      defaultColor: string,
      extraConfig: Record<string, unknown>,
    ) => string
    extraConfig: Record<string, unknown>
    onRenderStarted: (chart: unknown) => void
    onObjectSelected: (object: MockObject) => void
    onHoldSucceeded: (objects: MockObject[], ticketTypes: unknown[]) => void
    onHoldCallsInProgress: () => void
    onHoldCallsComplete: () => void
    onChartRenderingFailed: () => void
  }) => (
    <div
      ref={() => onRenderStarted({ deselectObjects })}
      data-mode={mode}
      data-session={session}
      data-hold-token={holdToken ?? ""}
      data-selected={selectedObjects.map((object) => object.label).join(",")}
      data-max-selected={maxSelectedObjects.map((limit) => `${limit.category}:${limit.quantity}`).join(",")}
      data-example-price={priceFormatter(40)}
      data-extra-config-color={String(extraConfig.unavailableSeatColor)}
      data-taken-seat-color={objectColor({ isSelectable: () => false }, "#7551FF", extraConfig)}
      data-free-seat-color={objectColor({ isSelectable: () => true }, "#7551FF", extraConfig)}
      data-unverdicted-color={objectColor({}, "#7551FF", extraConfig)}
    >
      <button
        type="button"
        onClick={() => onObjectSelected({ label: "A-14", objectType: "seat", category: { key: "stalls" } })}
      >
        Click seat A-14
      </button>
      <button
        type="button"
        onClick={() => onHoldSucceeded([{ label: "A-14", objectType: "seat", category: { key: "stalls" } }], [])}
      >
        Confirm hold A-14
      </button>
      <button
        type="button"
        onClick={() =>
          onHoldSucceeded(
            [
              { label: "T1-1", objectType: "seat", category: { key: "stalls" } },
              { label: "T1-2", objectType: "seat", category: { key: "stalls" } },
              { label: "T1-1", objectType: "seat", category: { key: "stalls" } },
            ],
            [],
          )
        }
      >
        Confirm table hold
      </button>
      <button type="button" onClick={onHoldCallsInProgress}>
        Hold calls started
      </button>
      <button type="button" onClick={onHoldCallsComplete}>
        Hold calls complete
      </button>
      <button type="button" onClick={onChartRenderingFailed}>
        Fail the chart
      </button>
    </div>
  ),
}))

const SEATING_MAP: EventSeatingMap = {
  sessionUniqueId: "session-1",
  seatsIoPublicKey: "public-key",
  region: "eu",
  seatsIoEventKey: "event-key",
  holdToken: "hold-token",
  holdTokenExpiresAtUtc: null,
  categories: [
    {
      categoryKey: "stalls",
      categoryName: "Stalls",
      ticketTypeUniqueId: "ticket-1",
      ticketTypeName: "Stalls",
      price: 40,
      color: "#7551FF",
      maxPurchase: 1,
      showRemainingTickets: false,
      remainingSeats: null,
    },
    {
      categoryKey: "balcony",
      categoryName: "Balcony",
      ticketTypeUniqueId: "ticket-2",
      ticketTypeName: "Balcony",
      price: 15,
      color: "#01B574",
      maxPurchase: null,
      showRemainingTickets: false,
      remainingSeats: null,
    },
  ],
  selectedSeats: [],
}

/** Renders the panel around one seating map, since every rule here turns on what that map carries. */
function renderPanel(seatingMap: EventSeatingMap | null, selectedSeatLabels: string[] = []) {
  const onSelectSeat = vi.fn()
  const onHoldPendingChange = vi.fn()

  const view = render(
    <ChakraProvider value={system}>
      <SeatMapPanel
        seatingMap={seatingMap}
        isBusy={false}
        selectedSeatLabels={selectedSeatLabels}
        currencyCode="USD"
        onSelectSeat={onSelectSeat}
        onDeselectSeat={vi.fn()}
        onHoldPendingChange={onHoldPendingChange}
        onHoldTokenExpired={vi.fn()}
        onHoldFailed={vi.fn()}
        onSelectionInvalid={vi.fn()}
      />
    </ChakraProvider>,
  )

  return { onSelectSeat, onHoldPendingChange, rerender: view.rerender }
}

describe("SeatMapPanel", () => {
  /**
   * A session whose seating plan was never published has no chart to address. Handing the renderer an empty event
   * key leaves a grey box the buyer reads as still loading, and they wait for a map that is never coming.
   */
  it("says the seating plan is unpublished rather than drawing an unaddressable chart", () => {
    renderPanel({ ...SEATING_MAP, seatsIoEventKey: "" })

    expect(screen.getByRole("alert")).toHaveTextContent("has not been published yet")
  })

  /**
   * The renderer fails silently - it reports the failure and leaves its container empty. Without this the buyer is
   * left staring at blank space with no way to tell a broken map from a slow one.
   */
  it("names a chart that failed to draw instead of leaving an empty frame", async () => {
    renderPanel(SEATING_MAP)

    await userEvent.click(screen.getByRole("button", { name: "Fail the chart" }))

    expect(screen.getByRole("alert")).toHaveTextContent("The seating plan failed to load")
  })

  /**
   * A click only schedules the chart's asynchronous hold; the seat is not the buyer's until that hold lands. Entering
   * it into the order on the click raced the server's read against a hold that had not yet been placed, which is the
   * "could not be reserved" dead-end this whole panel exists to avoid. So a bare selection claims nothing.
   */
  it("does not enter a seat into the order on selection alone, before its hold is confirmed", async () => {
    const { onSelectSeat } = renderPanel(SEATING_MAP)

    await userEvent.click(screen.getByRole("button", { name: "Click seat A-14" }))

    expect(onSelectSeat).not.toHaveBeenCalled()
  })

  /**
   * The confirmed hold is the seat becoming the buyer's, and only then does it enter the order - carrying its label,
   * the category that prices it, and its object type. Claiming from here rather than the click is what keeps the
   * server's read and the chart's hold from racing on the same seat.
   */
  it("enters a seat into the order once the chart confirms its hold", async () => {
    const { onSelectSeat } = renderPanel(SEATING_MAP)

    await userEvent.click(screen.getByRole("button", { name: "Confirm hold A-14" }))

    expect(onSelectSeat).toHaveBeenCalledExactlyOnceWith("A-14", "stalls", "seat")
    expect(screen.getByText(/held for you the moment you pick them/i)).toBeInTheDocument()
  })

  /**
   * A table hands back every seat it holds in one confirmation, the same seat can arrive twice in it, and each seat
   * is a ticket the order must account for exactly once. A label entered twice is a seat charged twice, so a repeat
   * within the batch is passed on only the first time.
   */
  it("enters each seat of a confirmed table hold exactly once", async () => {
    const { onSelectSeat } = renderPanel(SEATING_MAP)

    await userEvent.click(screen.getByRole("button", { name: "Confirm table hold" }))

    expect(onSelectSeat).toHaveBeenCalledTimes(2)
    expect(onSelectSeat).toHaveBeenCalledWith("T1-1", "stalls", "seat")
    expect(onSelectSeat).toHaveBeenCalledWith("T1-2", "stalls", "seat")
  })

  /**
   * Progression must wait on the chart's own hold calls, not only the local cart mutations. The panel reports the
   * first call starting and the last one finishing, so a step that reads held seats cannot open while the chart is
   * still placing them.
   */
  it("reports when the chart's hold calls are outstanding and when they clear", async () => {
    const { onHoldPendingChange } = renderPanel(SEATING_MAP)

    await userEvent.click(screen.getByRole("button", { name: "Hold calls started" }))
    expect(onHoldPendingChange).toHaveBeenLastCalledWith(true)

    await userEvent.click(screen.getByRole("button", { name: "Hold calls complete" }))
    expect(onHoldPendingChange).toHaveBeenLastCalledWith(false)
  })

  /**
   * A manual session holds seats under a token, and Seats.io refuses to open one without a token to hold under. So
   * before that token has been issued the chart cannot be drawn at all: the buyer waits on a skeleton rather than
   * being handed a chart that would fail to render the instant it mounted.
   */
  it("does not draw the chart until a hold token has been issued", () => {
    renderPanel({ ...SEATING_MAP, holdToken: "" })

    expect(screen.queryByRole("button", { name: "Click seat A-14" })).not.toBeInTheDocument()
  })

  /**
   * The chart holds every seat the buyer picks under this token, which is what takes the seat out of every other
   * buyer's chart in real time. A manual session is what carries a token we minted rather than one the chart keeps
   * for itself, so the chart must draw under exactly the token it was handed.
   */
  it("holds seats in a manual session under the token it was given", () => {
    renderPanel(SEATING_MAP)

    const chart = screen.getByRole("button", { name: "Click seat A-14" }).parentElement
    expect(chart).toHaveAttribute("data-session", "manual")
    expect(chart).toHaveAttribute("data-hold-token", "hold-token")
  })

  /**
   * The chart is torn down every time the map is closed. Seats already picked have to be handed back to it on the
   * way in, or reopening shows the buyer an empty plan and invites them to pick the same seats twice.
   */
  it("hands seats already picked back to a freshly drawn chart", () => {
    renderPanel(SEATING_MAP, ["A-14", "A-15"])

    expect(screen.getByRole("button", { name: "Click seat A-14" }).parentElement).toHaveAttribute(
      "data-selected",
      "A-14,A-15",
    )
  })

  /**
   * The renderer draws a seat nobody can pick in a pale grey that reads as empty floor, so buyers keep clicking
   * rows that are long gone. A colour of its own is what tells them the room is filling up rather than broken.
   */
  it("draws a seat that cannot be picked in the taken colour", () => {
    renderPanel(SEATING_MAP)

    expect(screen.getByRole("button", { name: "Click seat A-14" }).parentElement).toHaveAttribute(
      "data-taken-seat-color",
      UNAVAILABLE_SEAT_COLOR,
    )
  })

  /**
   * A seat still on sale must keep its category colour, or the legend beside the chart prices a colour the buyer
   * can no longer find on it.
   */
  it("leaves a seat still on sale in its category colour", () => {
    renderPanel(SEATING_MAP)

    const chart = screen.getByRole("button", { name: "Click seat A-14" }).parentElement
    expect(chart).toHaveAttribute("data-free-seat-color", "#7551FF")
  })

  /**
   * The colour function runs inside the renderer's own frame, where nothing in this module is in scope. Reaching
   * for the constant directly threw there and took the whole chart down with it, so the colour has to travel in
   * as configuration and be read back off the argument the renderer hands in.
   */
  it("hands the taken colour to the chart as configuration", () => {
    renderPanel(SEATING_MAP)

    expect(screen.getByRole("button", { name: "Click seat A-14" }).parentElement).toHaveAttribute(
      "data-extra-config-color",
      UNAVAILABLE_SEAT_COLOR,
    )
  })

  /**
   * The renderer's verdict arrives as a method that the published types do not declare. A renderer that stops
   * handing it over must leave the chart drawn in its category colours rather than take the whole map down.
   */
  it("leaves an object the renderer gives no verdict on in its category colour", () => {
    renderPanel(SEATING_MAP)

    expect(screen.getByRole("button", { name: "Click seat A-14" }).parentElement).toHaveAttribute(
      "data-unverdicted-color",
      "#7551FF",
    )
  })

  /**
   * The chart prints prices beside its own seats. Left to its own default it shows a bare number next to a legend
   * that already priced the same category in the event's currency, and the buyer reads two prices for one seat.
   */
  it("prices the chart in the event's own currency", () => {
    renderPanel(SEATING_MAP)

    expect(screen.getByRole("button", { name: "Click seat A-14" }).parentElement).toHaveAttribute(
      "data-example-price",
      "$40.00",
    )
  })

  /**
   * Giving a seat up from the basket beside the map used to redraw the whole chart, which throws away the view the
   * buyer had zoomed and panned to. The chart is told about the one seat instead.
   */
  it("deselects a seat given up elsewhere instead of redrawing the chart", () => {
    deselectObjects.mockClear()

    const { rerender } = renderPanel(SEATING_MAP, ["A-14", "A-15"])

    rerender(
      <ChakraProvider value={system}>
        <SeatMapPanel
          seatingMap={SEATING_MAP}
          isBusy={false}
          selectedSeatLabels={["A-15"]}
          currencyCode="USD"
          onSelectSeat={vi.fn()}
          onDeselectSeat={vi.fn()}
          onHoldPendingChange={vi.fn()}
          onHoldTokenExpired={vi.fn()}
          onHoldFailed={vi.fn()}
          onSelectionInvalid={vi.fn()}
        />
      </ChakraProvider>,
    )

    expect(deselectObjects).toHaveBeenCalledWith(["A-14"])
    expect(screen.getByRole("button", { name: "Click seat A-14" }).parentElement).toHaveAttribute(
      "data-selected",
      "A-14,A-15",
    )
  })

  /**
   * The organizer caps how many seats of a category one order may take. A chart that lets the buyer pick past the
   * cap sends them on to a server refusal for a seat the map had already coloured in as theirs.
   */
  it("holds the chart to the organizer's per-order limit", () => {
    renderPanel(SEATING_MAP)

    expect(screen.getByRole("button", { name: "Click seat A-14" }).parentElement).toHaveAttribute(
      "data-max-selected",
      "stalls:1",
    )
  })

  /**
   * A map that is still being read is not a broken one, and saying so would send the buyer to the organizer over a
   * request that is about to succeed.
   */
  it("keeps its place while the map is still being read", () => {
    renderPanel(null)

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})
