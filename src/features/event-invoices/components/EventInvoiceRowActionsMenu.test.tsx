import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { EventInvoiceListItem } from "@/api/eventInvoices"
import { EventInvoiceRowActionsMenu } from "./EventInvoiceRowActionsMenu"

const INVOICE: EventInvoiceListItem = {
  invoiceUniqueId: "invoice-1",
  invoiceNo: "INV-1001",
  eventUniqueId: "event-1",
  eventName: "Spring Gala",
  buyerName: "Ada Lovelace",
  buyerEmail: "ada@example.com",
  invoiceStatus: "Paid",
  invoiceStatusLabel: "Paid",
  invoiceDateUtc: "2026-03-01T00:00:00Z",
  totalAmount: 240,
  balanceAmount: 0,
  paymentMethod: "CreditCard",
  paymentSource: "Visa ····4242",
  currencySymbol: "$",
  ticketCount: 2,
}

async function openMenu(overrides: Partial<EventInvoiceListItem> = {}) {
  const onOpenDetail = vi.fn()
  const onResendTickets = vi.fn()

  render(
    <ChakraProvider value={system}>
      <EventInvoiceRowActionsMenu
        invoice={{ ...INVOICE, ...overrides }}
        onOpenDetail={onOpenDetail}
        onResendTickets={onResendTickets}
      />
    </ChakraProvider>,
  )

  await userEvent.click(screen.getByRole("button", { name: /Actions for invoice INV-1001/ }))

  return { onOpenDetail, onResendTickets }
}

describe("EventInvoiceRowActionsMenu", () => {
  it("View_Clicked_OpensTheInvoiceDetail", async () => {
    const { onOpenDetail } = await openMenu()

    await userEvent.click(await screen.findByText("View"))

    expect(onOpenDetail).toHaveBeenCalledWith(expect.objectContaining({ invoiceUniqueId: "invoice-1" }))
  })

  it("PaidInvoiceWithTickets_OffersResend", async () => {
    const { onResendTickets } = await openMenu()

    await userEvent.click(await screen.findByText("Resend Tickets"))

    expect(onResendTickets).toHaveBeenCalledWith(expect.objectContaining({ invoiceNo: "INV-1001" }))
  })

  /** Hidden on the row for the same reason the detail page refuses it — the pass would not admit anyone. */
  it.each(["Cancelled", "Refund", "AdjustedInSystem", "Failed"])("%sInvoice_HidesResend", async (invoiceStatus) => {
    await openMenu({ invoiceStatus })

    expect(await screen.findByText("View")).toBeTruthy()
    expect(screen.queryByText("Resend Tickets")).toBeNull()
  })
})
