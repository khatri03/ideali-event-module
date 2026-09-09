import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { EventRegistrationTicket } from "@/api/events"
import type { SelectedTicketSummaryItem } from "@/features/events/components/registration/types"
import { CartSummaryPanel } from "./CartSummaryPanel"

/** A general admission ticket type, which the buyer sets a quantity for. */
const GENERAL_TICKET = { uniqueId: "ticket-1", name: "General", seatCategoryName: null } as unknown as EventRegistrationTicket

/** A ticket type sold by seat, whose count is whatever the buyer picked on the plan. */
const SEATED_TICKET = {
  uniqueId: "ticket-2",
  name: "Standard Seat",
  seatCategoryName: "Stalls",
} as unknown as EventRegistrationTicket

/** Builds one summary line, overriding only what the rule under test turns on. */
function buildItem(overrides: Partial<SelectedTicketSummaryItem> = {}): SelectedTicketSummaryItem {
  return {
    sessionId: "session-1",
    sessionName: "CME",
    ticketId: "ticket-1",
    ticketName: "General",
    ticket: GENERAL_TICKET,
    quantity: 1,
    unitPrice: 150,
    lineTotal: 150,
    seatLabels: [],
    ...overrides,
  }
}

/** Renders the docked summary open, since everything it says is inside the panel it opens. */
function renderSummary(items: SelectedTicketSummaryItem[]) {
  render(
    <ChakraProvider value={system}>
      <CartSummaryPanel
        isOpen
        onToggle={vi.fn()}
        sessionGroups={[
          {
            sessionId: "session-1",
            sessionName: "CME",
            items,
            total: items.reduce((total, item) => total + item.lineTotal, 0),
          },
        ]}
        selectedTicketCount={items.reduce((count, item) => count + item.quantity, 0)}
        total={items.reduce((total, item) => total + item.lineTotal, 0)}
        currencyCode="CAD"
        formAccent="#E4572E"
        onChangeQuantity={vi.fn()}
        onRequestRemoveTicket={vi.fn()}
        onRequestRemoveSession={vi.fn()}
      />
    </ChakraProvider>,
  )
}

describe("CartSummaryPanel", () => {
  /**
   * A seated ticket type's count is the seats picked on the plan. A stepper here would let the buyer ask for one
   * more seat without naming a chair, and nothing on the map or at the vendor would be holding it.
   */
  it("offers no quantity control for a ticket type sold by seat", () => {
    renderSummary([
      buildItem({
        ticketId: "ticket-2",
        ticketName: "Standard Seat",
        ticket: SEATED_TICKET,
        quantity: 2,
        seatLabels: ["18-2", "18-9"],
      }),
    ])

    expect(screen.queryByText("Qty")).not.toBeInTheDocument()
  })

  /**
   * The buyer chose particular chairs and has to be able to check the summary against the map before paying.
   * Listing them under their table is how they were picked, so "Table 18" reads as one party rather than two seats.
   */
  it("names the seats a seated line is holding, under the table they sit at", () => {
    renderSummary([
      buildItem({
        ticketId: "ticket-2",
        ticketName: "Standard Seat",
        ticket: SEATED_TICKET,
        quantity: 2,
        seatLabels: ["18-2", "15-11"],
      }),
    ])

    expect(screen.getByText("Table 15")).toBeInTheDocument()
    expect(screen.getByText("Seat 11")).toBeInTheDocument()
    expect(screen.getByText("Table 18")).toBeInTheDocument()
    expect(screen.getByText("Seat 2")).toBeInTheDocument()
  })

  /**
   * General admission has no seats behind it, so the quantity is the only thing the buyer can say. Losing the
   * stepper there would leave them unable to change an order without starting it again.
   */
  it("keeps the quantity control for a ticket type sold without seats", () => {
    renderSummary([buildItem()])

    expect(screen.getByText("Qty")).toBeInTheDocument()
  })

  /**
   * A seated line reaches the cart before the seats it holds have been read back. An empty frame there reads as a
   * line with nothing in it, so the panel says where seats are chosen instead.
   */
  it("says where seats are chosen while a seated line has none listed yet", () => {
    renderSummary([
      buildItem({ ticketId: "ticket-2", ticketName: "Standard Seat", ticket: SEATED_TICKET, seatLabels: [] }),
    ])

    expect(screen.getByText("Pick seats on the seat map in Sessions and they appear here.")).toBeInTheDocument()
  })
})
