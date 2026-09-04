import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { SeatCategoryLegend } from "./SeatCategoryLegend"
import type { EventSeatingCategory } from "@/features/events/schemas/eventSeating.schemas"

/** Builds one legend entry, overriding only what the rule under test turns on. */
function buildCategory(overrides: Partial<EventSeatingCategory> = {}): EventSeatingCategory {
  return {
    categoryKey: "cat-stalls",
    categoryName: "Stalls",
    ticketTypeUniqueId: "ticket-1",
    ticketTypeName: "Stalls ticket",
    price: 40,
    color: "#7551FF",
    showRemainingTickets: false,
    remainingSeats: null,
    ...overrides,
  }
}

/** Renders the legend inside the theme the registration form draws it in. */
function renderLegend(categories: EventSeatingCategory[]) {
  return render(
    <ChakraProvider value={system}>
      <SeatCategoryLegend categories={categories} currencyCode="USD" />
    </ChakraProvider>,
  )
}

describe("SeatCategoryLegend", () => {
  /**
   * A chart is a field of colours until something says what they mean. Every category the session sells has to be
   * named and priced, or the buyer picks a seat without knowing what they are about to be charged for it.
   */
  it("names and prices every category the session sells", () => {
    renderLegend([
      buildCategory(),
      buildCategory({ categoryKey: "cat-balcony", categoryName: "Balcony", price: 15 }),
    ])

    expect(screen.getByText("Stalls")).toBeInTheDocument()
    expect(screen.getByText("Balcony")).toBeInTheDocument()
    expect(screen.getByText("$40.00")).toBeInTheDocument()
    expect(screen.getByText("$15.00")).toBeInTheDocument()
  })

  /**
   * The swatch is what ties a legend row to the colour on the chart. Drawing it in anything but the category's own
   * colour would point the buyer at the wrong seats.
   */
  it("draws each swatch in the colour the chart uses for that category", () => {
    const { container } = renderLegend([buildCategory({ color: "rgb(117, 81, 255)" })])

    const swatch = container.querySelector('[aria-hidden="true"]')
    expect(swatch).not.toBeNull()
    expect(swatch).toHaveStyle({ background: "rgb(117, 81, 255)" })
  })

  /**
   * How many seats are left is the organizer's to disclose. A category they kept private must show no count at all,
   * whatever the server happened to send.
   */
  it("says nothing about how many seats are left where the organizer kept the count private", () => {
    renderLegend([buildCategory({ showRemainingTickets: false, remainingSeats: 12 })])

    expect(screen.queryByText("12 left")).not.toBeInTheDocument()
  })

  /** Where the organizer opted in, the scarcity the buyer is deciding against has to be on the legend. */
  it("reports the seats left where the organizer opted in", () => {
    renderLegend([buildCategory({ showRemainingTickets: true, remainingSeats: 12 })])

    expect(screen.getByText("12 left")).toBeInTheDocument()
  })

  /** A category with nothing left has to say so, or the buyer keeps clicking seats the chart will refuse. */
  it("calls a category with nothing left sold out", () => {
    renderLegend([buildCategory({ showRemainingTickets: true, remainingSeats: 0 })])

    expect(screen.getByText("Sold out")).toBeInTheDocument()
  })

  /**
   * A category with no capacity recorded is selling freely. Reading its absent count as zero would print "Sold out"
   * on seats that are still on sale.
   */
  it("does not call a category with no recorded capacity sold out", () => {
    renderLegend([buildCategory({ showRemainingTickets: true, remainingSeats: null })])

    expect(screen.queryByText("Sold out")).not.toBeInTheDocument()
  })

  /**
   * Whether a count is published is the organizer's choice per ticket type, not a property of the category. Keeping
   * it inside the card would make the one category that discloses taller than the ones beside it, so the legend
   * would read as three unlike things when only the disclosure differs.
   */
  it("keeps the seat count outside the card it belongs to", () => {
    renderLegend([
      buildCategory({ showRemainingTickets: true, remainingSeats: 12 }),
      buildCategory({ categoryKey: "cat-balcony", categoryName: "Balcony", price: 15 }),
    ])

    const card = screen.getByText("Stalls").closest("div")
    expect(card).not.toBeNull()
    expect(card!.textContent).toContain("$40.00")
    expect(card!.textContent).not.toContain("12 left")
  })

  /**
   * A session whose categories are unpriced still draws a map. Rendering an empty legend beside it would leave the
   * buyer to guess why no price is shown anywhere.
   */
  it("explains itself when the session has no priced categories", () => {
    renderLegend([])

    expect(screen.getByText("No seat prices published yet")).toBeInTheDocument()
  })
})
