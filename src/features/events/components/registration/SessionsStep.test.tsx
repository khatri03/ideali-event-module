import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { EventRegistrationSession, EventRegistrationTicket } from "@/api/events"
import { SessionsStep } from "./SessionsStep"

function buildTicket(overrides: Partial<EventRegistrationTicket> = {}): EventRegistrationTicket {
  return {
    uniqueId: "ticket-1",
    name: "Stalls seat",
    description: null,
    colorCode: null,
    fullPrice: 40,
    minPurchase: 1,
    maxPurchase: null,
    totalQuantity: null,
    availableForSale: null,
    ticketsSold: null,
    showRemainingTickets: false,
    seatCategoryName: "Stalls",
    seatCategoryColor: "#7551FF",
    nextSeatsAvailableAtUtc: null,
    isActive: true,
    salesStartDateUtc: null,
    salesEndDateUtc: null,
    pricePeriods: [],
    ...overrides,
  }
}

function buildSession(overrides: Partial<EventRegistrationSession> = {}): EventRegistrationSession {
  return {
    uniqueId: "session-1",
    name: "Opening Night",
    description: null,
    bannerUrl: null,
    requiresAttendeeInfo: false,
    offersSeatSelection: true,
    setupState: "Ready for sale",
    bookingStatus: "Open",
    startDate: null,
    endDate: null,
    bookingStartDate: null,
    bookingEndDate: null,
    ticketTypes: [buildTicket()],
    ...overrides,
  }
}

function renderStep(session: EventRegistrationSession) {
  return render(
    <ChakraProvider value={system}>
      <SessionsStep
        sessions={[session]}
        isLoading={false}
        selectedTicketQuantities={{}}
        selectedTicketCount={0}
        expandedSessionIds={[session.uniqueId]}
        ticketSearchBySession={{}}
        currencyCode="USD"
        areAllExpanded
        onToggleSession={vi.fn()}
        onExpandAll={vi.fn()}
        onCollapseAll={vi.fn()}
        onSearchChange={vi.fn()}
        onOpenDescription={vi.fn()}
        onChangeQuantity={vi.fn()}
        onRequestRemoveAll={vi.fn()}
        renderSeatSelection={() => <div>Seat map</div>}
      />
    </ChakraProvider>,
  )
}

describe("SessionsStep", () => {
  /**
   * The seat picker holds seats in the buyer's name and so cannot open until they identify themselves. What a seat
   * costs is not private, and a buyer deciding whether to register at all has to be able to read it first.
   */
  it("prices a seated session's categories before any cart exists", () => {
    renderStep(buildSession())

    expect(screen.getByRole("region", { name: "Seat categories" })).toBeInTheDocument()
    expect(screen.getByText("Stalls")).toBeInTheDocument()
    expect(screen.getByText("$40.00")).toBeInTheDocument()
  })

  /** A session sold by quantity has no chart to caption, and a seat legend on it would name nothing. */
  it("shows no seat legend on a session that sells by quantity", () => {
    renderStep(buildSession({ offersSeatSelection: false }))

    expect(screen.queryByRole("region", { name: "Seat categories" })).not.toBeInTheDocument()
  })

  /** The organizer's decision to withhold a count governs the legend as much as it governs the ticket cards. */
  it("counts the seats left only where the organizer opted in", () => {
    renderStep(
      buildSession({
        ticketTypes: [
          buildTicket({ showRemainingTickets: true, totalQuantity: 20, ticketsSold: 8 }),
          buildTicket({
            uniqueId: "ticket-2",
            name: "Balcony seat",
            seatCategoryName: "Balcony",
            seatCategoryColor: "#01B574",
            showRemainingTickets: false,
            totalQuantity: 50,
            ticketsSold: 4,
          }),
        ],
      }),
    )

    expect(screen.getByText("12 left")).toBeInTheDocument()
    expect(screen.queryByText("46 left")).not.toBeInTheDocument()
  })
})
