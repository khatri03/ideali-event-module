import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { system } from "@/theme"
import type { OrganizerEventListItem } from "@/api/events"
import { OrganizerEventCard } from "./OrganizerEventCard"

function buildEvent(overrides: Partial<OrganizerEventListItem> = {}): OrganizerEventListItem {
  return {
    uniqueId: "event-1",
    name: "Annual Summit",
    themeColor: null,
    setupState: "ReadyForSale",
    isCancelled: false,
    venueName: null,
    startDate: null,
    endDate: null,
    bookingStartDate: null,
    bookingEndDate: null,
    totalAvailableTickets: 10,
    ticketsSold: 0,
    ...overrides,
  }
}

async function openActionsMenu(event: OrganizerEventListItem) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <OrganizerEventCard event={event} />
        </MemoryRouter>
      </QueryClientProvider>
    </ChakraProvider>,
  )

  await userEvent.click(screen.getByRole("button", { name: "Event actions" }))
}

describe("OrganizerEventCard", () => {
  it("EventEnded_OffersInvoicesForThatEvent", async () => {
    await openActionsMenu(
      buildEvent({ startDate: "2020-01-01T00:00:00Z", endDate: "2020-01-02T00:00:00Z" }),
    )

    const invoiceItem = await screen.findByRole("menuitem", { name: /invoice/i })
    expect(invoiceItem).toHaveAttribute("href", "/organizer/events/invoices?eventUniqueId=event-1")
  })

  it("BookingWindowOpen_OffersInvoices", async () => {
    await openActionsMenu(
      buildEvent({ bookingStartDate: "2020-01-01T00:00:00Z", startDate: "2999-01-01T00:00:00Z" }),
    )

    expect(await screen.findByRole("menuitem", { name: /invoice/i })).toBeInTheDocument()
  })

  /** Nothing could have been bought yet, so there is no invoice list worth opening. */
  it("BookingNotOpenYet_HidesInvoices", async () => {
    await openActionsMenu(
      buildEvent({ bookingStartDate: "2999-01-01T00:00:00Z", startDate: "2999-02-01T00:00:00Z" }),
    )

    await screen.findByRole("menuitem", { name: /copy url/i })
    expect(screen.queryByRole("menuitem", { name: /invoice/i })).not.toBeInTheDocument()
  })
})
