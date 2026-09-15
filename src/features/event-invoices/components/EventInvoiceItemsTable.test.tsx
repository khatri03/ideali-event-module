import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { EventInvoiceLineItem, EventInvoiceTicket } from "@/api/eventInvoices"
import { EventInvoiceItemsTable } from "./EventInvoiceItemsTable"

function ticket(seatObjectLabel: string | null, code: string): EventInvoiceTicket {
  return {
    ticketUniqueId: `uuid-${code}`,
    ticketCode: code,
    seatObjectLabel,
    ticketStatus: "Active",
    ticketStatusLabel: "Active",
    deliveredAtUtc: null,
    checkedInAtUtc: null,
  }
}

function lineItem(tickets: EventInvoiceTicket[], overrides: Partial<EventInvoiceLineItem> = {}): EventInvoiceLineItem {
  return {
    invoiceItemUniqueId: "line-1",
    sessionUniqueId: "session-1",
    sessionName: "CME",
    ticketTypeName: "Standard Seat",
    quantity: tickets.length,
    unitPrice: "150",
    lineTotal: "900",
    attendees: [],
    tickets,
    ...overrides,
  }
}

function renderTable(
  lineItems: EventInvoiceLineItem[],
  callbacks: {
    onViewAttendees?: (item: EventInvoiceLineItem) => void
    onResendRow?: (item: EventInvoiceLineItem) => void
  } = {},
) {
  return render(
    <ChakraProvider value={system}>
      <EventInvoiceItemsTable lineItems={lineItems} currencySymbol="C$" {...callbacks} />
    </ChakraProvider>,
  )
}

describe("EventInvoiceItemsTable seat labels", () => {
  it("SeatsColumn_IsAlwaysHeadedSoEveryLineDeclaresWhetherItCarriesSeats", () => {
    renderTable([lineItem([ticket("A-1", "EVT_1")])])

    expect(screen.getByRole("columnheader", { name: "Seats" })).toBeInTheDocument()
  })

  it("MultipleSeatedTickets_ListsEverySeatInTheSeatsColumnSoTheChargeIsTraceable", () => {
    renderTable([lineItem([ticket("A-1", "EVT_1"), ticket("A-2", "EVT_2")])])

    expect(screen.getByRole("cell", { name: "A-1, A-2" })).toBeInTheDocument()
  })

  it("SingleSeatedTicket_ShowsItsOneSeatLabel", () => {
    renderTable([lineItem([ticket("A-1", "EVT_1")])])

    expect(screen.getByRole("cell", { name: "A-1" })).toBeInTheDocument()
  })

  it("GeneralAdmissionLine_ShowsADashBecauseNoSeatIsTiedToTheTickets", () => {
    renderTable([lineItem([ticket(null, "EVT_1"), ticket(null, "EVT_2")])])

    expect(screen.getByRole("cell", { name: "-" })).toBeInTheDocument()
  })

  it("SameSession_NamesItselfOnceAsAGroupHeaderInsteadOfRepeatingOnEveryRow", () => {
    renderTable([
      lineItem([ticket("A-1", "EVT_1")], { invoiceItemUniqueId: "line-1", ticketTypeName: "Gala Seat" }),
      lineItem([ticket("A-2", "EVT_2")], { invoiceItemUniqueId: "line-2", ticketTypeName: "VIP Seat" }),
    ])

    expect(screen.getAllByText("CME")).toHaveLength(1)
    expect(screen.getByRole("cell", { name: "Gala Seat" })).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "VIP Seat" })).toBeInTheDocument()
  })

  it("LongSeatList_CollapsesToAPreviewWithACountSoTheRowStaysCompact", () => {
    const seats = ["A-1", "A-2", "A-3", "A-4", "A-5", "A-6"]
    renderTable([lineItem(seats.map((label, index) => ticket(label, `EVT_${index}`)))])

    expect(screen.getByText("A-1, A-2, A-3 +3")).toBeInTheDocument()
    expect(screen.getByText("A-1, A-2, A-3 +3")).toHaveAttribute("title", seats.join(", "))
  })
})

describe("EventInvoiceItemsTable actions column", () => {
  it("ActionsColumn_AbsentByDefault_SoThePureFinancialTableHasNoExtraCells", () => {
    renderTable([lineItem([ticket("A-1", "EVT_1")])])

    expect(screen.queryByRole("button", { name: /view attendees/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /send all tickets/i })).not.toBeInTheDocument()
  })

  it("ViewAttendeesButton_RenderedAndCallsCallback_WhenOnViewAttendeesProvided", async () => {
    const user = userEvent.setup()
    const onViewAttendees = vi.fn()
    const item = lineItem([ticket("A-1", "EVT_1")])
    renderTable([item], { onViewAttendees })

    await user.click(screen.getByRole("button", { name: /view attendees for Standard Seat/i }))

    expect(onViewAttendees).toHaveBeenCalledWith(item)
  })

  it("SendAllButton_RenderedAndCallsCallback_WhenOnResendRowProvided", async () => {
    const user = userEvent.setup()
    const onResendRow = vi.fn()
    const item = lineItem([ticket("A-1", "EVT_1")])
    renderTable([item], { onResendRow })

    await user.click(screen.getByRole("button", { name: /send all tickets for Standard Seat/i }))

    expect(onResendRow).toHaveBeenCalledWith(item)
  })

  it("SendAllButton_Hidden_WhenLineItemHasNoIssuedTickets", () => {
    const onResendRow = vi.fn()
    renderTable([lineItem([])], { onResendRow })

    expect(screen.queryByRole("button", { name: /send all tickets/i })).not.toBeInTheDocument()
  })
})
