import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { EventInvoiceDetail } from "@/api/eventInvoices"
import { system } from "@/theme"
import { APP_ROUTES } from "@/utils/routes"
import EventInvoiceDetailPage from "./EventInvoiceDetailPage"

const { idleMutation } = vi.hoisted(() => ({
  idleMutation: () => ({ mutateAsync: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
}))

const TICKET_ORDER: EventInvoiceDetail = {
  invoiceUniqueId: "invoice-1",
  invoiceNo: "INV-2001",
  invoiceStatus: "PendingPayment",
  invoiceStatusLabel: "Pending Payment",
  invoiceDateUtc: "2026-08-01T10:00:00Z",
  subTotal: "420",
  discountAmount: null,
  discountCouponCode: null,
  taxAmount: null,
  platformCharges: null,
  serviceCharges: null,
  totalAmount: "420",
  balanceAmount: "420",
  currencySymbol: "$",
  eventUniqueId: "event-1",
  eventName: "Annual Convention",
  buyerName: "Jane Doe",
  buyerEmail: "jane@example.com",
  buyerPhone: null,
  charges: [],
  lineItems: [
    {
      invoiceItemUniqueId: "line-1",
      sessionUniqueId: "session-1",
      sessionName: "Friday Dinner",
      ticketTypeName: "Gala Seat",
      quantity: 2,
      unitPrice: "210",
      lineTotal: "420",
      attendees: [],
      tickets: [],
    },
  ],
  notes: [],
  payments: [],
  invoiceType: "Regular",
  invoiceTypeLabel: "Regular",
  canMarkAsPaid: true,
  canCancel: true,
  canResendTickets: true,
  canEditBuyer: true,
}

vi.mock("../hooks/useEventInvoices", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../hooks/useEventInvoices")>()
  return {
    ...actual,
    useEventInvoiceDetail: () => ({
      data: TICKET_ORDER,
      isLoading: false,
      isError: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    }),
    useResendEventInvoice: idleMutation,
    useResendEventInvoiceTicket: idleMutation,
    useResendEventInvoiceLineItem: idleMutation,
    useMarkEventInvoiceAsPaid: idleMutation,
    useCancelEventInvoice: idleMutation,
    useAddEventInvoiceNote: idleMutation,
    useUpdateEventInvoiceBuyer: idleMutation,
    useUpdateEventInvoiceAttendee: idleMutation,
  }
})

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[APP_ROUTES.eventInvoices.detail(TICKET_ORDER.invoiceUniqueId)]}>
          <Routes>
            <Route path={APP_ROUTES.eventInvoices.detailRoute} element={<EventInvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

describe("EventInvoiceDetailPage print contract", () => {
  /** A printed ticket order must carry what was bought and what is owed, inside the region the browser prints. */
  it("EventDetail_Print_TicketOrder_KeepsTheLinesAndTotalInsideThePrintRegion", () => {
    const { container } = renderPage()
    const region = container.querySelector<HTMLElement>("[data-print-region]")
    if (!region) throw new Error("The detail page is missing its print region.")

    expect(within(region).getAllByText("Gala Seat").length).toBeGreaterThan(0)
    expect(within(region).getAllByText("$420.00").length).toBeGreaterThan(0)
  })

  /** Settlement controls mean nothing on paper, so they are dropped from the printout. */
  it("EventDetail_Print_TicketOrder_MarksTheSettlementControlsPrintHidden", () => {
    renderPage()

    expect(screen.getByRole("button", { name: /mark as paid/i }).closest("[data-print-hide]")).not.toBeNull()
    expect(screen.getByRole("button", { name: /mark as cancelled/i }).closest("[data-print-hide]")).not.toBeNull()
  })
})
