import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { system } from "@/theme"
import { EventInvoiceSettlementActions } from "./EventInvoiceSettlementActions"

const { markEventInvoiceAsPaidMock, cancelEventInvoiceMock, resendEventInvoiceMock, toasterCreateMock } = vi.hoisted(
  () => ({
    markEventInvoiceAsPaidMock: vi.fn(),
    cancelEventInvoiceMock: vi.fn(),
    resendEventInvoiceMock: vi.fn(),
    toasterCreateMock: vi.fn(),
  }),
)

vi.mock("@/api/eventInvoices", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/eventInvoices")>()
  return {
    ...actual,
    markEventInvoiceAsPaid: markEventInvoiceAsPaidMock,
    cancelEventInvoice: cancelEventInvoiceMock,
    resendEventInvoice: resendEventInvoiceMock,
  }
})

vi.mock("@/lib/toaster", () => ({ toaster: { create: toasterCreateMock } }))

function successTitles() {
  return toasterCreateMock.mock.calls
    .map(([options]) => options)
    .filter((options) => options?.type === "success")
    .map((options) => String(options.title))
}

const INVOICE_UNIQUE_ID = "invoice-1"

function renderActions({
  canMarkAsPaid = true,
  canCancel = true,
  canResendTickets = true,
  canEmailInvoice = false,
  buyerEmail = "sponsor@example.com" as string | null,
} = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <EventInvoiceSettlementActions
          invoiceUniqueId={INVOICE_UNIQUE_ID}
          invoiceNo="INV-2001"
          canMarkAsPaid={canMarkAsPaid}
          canCancel={canCancel}
          canResendTickets={canResendTickets}
          canEmailInvoice={canEmailInvoice}
          buyerEmail={buyerEmail}
        />
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

describe("EventInvoiceSettlementActions", () => {
  beforeEach(() => {
    markEventInvoiceAsPaidMock.mockReset().mockResolvedValue(undefined)
    cancelEventInvoiceMock.mockReset().mockResolvedValue(undefined)
    resendEventInvoiceMock.mockReset().mockResolvedValue(undefined)
    toasterCreateMock.mockReset()
  })

  /** An order the server allows no action on shows no empty button row. */
  it("renders nothing when the order admits no action", () => {
    const { container } = renderActions({ canMarkAsPaid: false, canCancel: false, canResendTickets: false })

    expect(container).toBeEmptyDOMElement()
  })

  /** The server decides which actions an order admits; the page never offers one the endpoint would refuse. */
  it("offers only the actions the server allows", () => {
    renderActions({ canMarkAsPaid: true, canCancel: false, canResendTickets: false })

    expect(screen.getByRole("button", { name: /mark as paid/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /mark as cancelled/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /resend all tickets/i })).not.toBeInTheDocument()
  })

  /** Resending all tickets hits the invoice-level resend, never a settlement endpoint. */
  it("resending all tickets calls the invoice-level resend endpoint", async () => {
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole("button", { name: /resend all tickets/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: /^resend all$/i }))

    await waitFor(() => expect(resendEventInvoiceMock).toHaveBeenCalledWith(INVOICE_UNIQUE_ID))
    expect(markEventInvoiceAsPaidMock).not.toHaveBeenCalled()
    expect(cancelEventInvoiceMock).not.toHaveBeenCalled()
  })

  /** Marking paid is irreversible, so it names the order and waits for confirmation before calling the API. */
  it("marking as paid asks for confirmation before calling the API", async () => {
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole("button", { name: /mark as paid/i }))

    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("INV-2001")).toBeInTheDocument()
    expect(markEventInvoiceAsPaidMock).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole("button", { name: /^mark as paid$/i }))

    await waitFor(() => expect(markEventInvoiceAsPaidMock).toHaveBeenCalledWith(INVOICE_UNIQUE_ID))
    expect(cancelEventInvoiceMock).not.toHaveBeenCalled()
  })

  /** The reason typed in the cancel dialog is what the cancel endpoint receives; the settle endpoint is never hit. */
  it("cancelling the order sends the entered notes to the cancel endpoint, not the settle one", async () => {
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole("button", { name: /mark as cancelled/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.type(within(dialog).getByLabelText(/reason for cancelling/i), "Sponsor withdrew.")
    await user.click(within(dialog).getByRole("button", { name: /^cancel order$/i }))

    await waitFor(() => expect(cancelEventInvoiceMock).toHaveBeenCalledWith(INVOICE_UNIQUE_ID, "Sponsor withdrew."))
    expect(markEventInvoiceAsPaidMock).not.toHaveBeenCalled()
  })

  /** Backing out of a confirmation calls nothing. */
  it("dismissing the confirmation calls nothing", async () => {
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole("button", { name: /mark as paid/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: /^cancel$/i }))

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(markEventInvoiceAsPaidMock).not.toHaveBeenCalled()
  })

  /** A failed cancellation stays on screen with its reason, so the organizer can see why and retry. */
  it("keeps the dialog open and shows the error when the action fails", async () => {
    cancelEventInvoiceMock.mockRejectedValue(new Error("network down"))
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole("button", { name: /mark as cancelled/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.type(within(dialog).getByLabelText(/reason for cancelling/i), "Sponsor withdrew.")
    await user.click(within(dialog).getByRole("button", { name: /^cancel order$/i }))

    expect(await screen.findByText(/an unexpected error occurred/i)).toBeInTheDocument()
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })

  /** Only the cancel action is offered when that is all the server allows. */
  it("offers only cancelling when that is the one action the server allows", () => {
    renderActions({ canMarkAsPaid: false, canCancel: true, canResendTickets: false })

    expect(screen.getByRole("button", { name: /mark as cancelled/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /mark as paid/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /resend all tickets/i })).not.toBeInTheDocument()
  })

  /** A cancellation without a reason never reaches the server. */
  it("cancelling without a reason never calls the cancel endpoint", async () => {
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole("button", { name: /mark as cancelled/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: /^cancel order$/i }))

    expect(await within(dialog).findByText("Enter the reason for cancelling this order.")).toBeInTheDocument()
    expect(cancelEventInvoiceMock).not.toHaveBeenCalled()
  })

  /** A successful cancellation closes the dialog. */
  it("closes the cancel dialog once the order is cancelled", async () => {
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole("button", { name: /mark as cancelled/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.type(within(dialog).getByLabelText(/reason for cancelling/i), "Sponsor withdrew.")
    await user.click(within(dialog).getByRole("button", { name: /^cancel order$/i }))

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
  })

  /** Reopening the cancel dialog after a failure starts clean, so an old error is not read as the new outcome. */
  it("clears an earlier cancel failure when the dialog is opened again", async () => {
    cancelEventInvoiceMock.mockRejectedValueOnce(new Error("network down"))
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole("button", { name: /mark as cancelled/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.type(within(dialog).getByLabelText(/reason for cancelling/i), "Sponsor withdrew.")
    await user.click(within(dialog).getByRole("button", { name: /^cancel order$/i }))
    expect(await screen.findByText(/an unexpected error occurred/i)).toBeInTheDocument()

    await user.click(within(dialog).getByRole("button", { name: /^cancel$/i }))
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
    await user.click(screen.getByRole("button", { name: /mark as cancelled/i }))

    await screen.findByRole("alertdialog")
    expect(screen.queryByText(/an unexpected error occurred/i)).not.toBeInTheDocument()
  })

  /** A custom invoice offers an email action, never the ticket-resend copy that has nothing to send. */
  it("offers 'Email invoice to buyer' for a custom invoice instead of resend-all-tickets", () => {
    renderActions({ canResendTickets: false, canEmailInvoice: true })

    expect(screen.getByRole("button", { name: /email invoice to buyer/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /resend all tickets/i })).not.toBeInTheDocument()
  })

  /** Naming the recipient before sending lets a wrong address be caught before the invoice leaves. */
  it("names the buyer's email in the confirm dialog and sends on confirm", async () => {
    const user = userEvent.setup()
    renderActions({ canResendTickets: false, canEmailInvoice: true, buyerEmail: "sponsor@example.com" })

    await user.click(screen.getByRole("button", { name: /email invoice to buyer/i }))
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("sponsor@example.com")).toBeInTheDocument()
    expect(within(dialog).getByText(/payable link/i)).toBeInTheDocument()
    expect(resendEventInvoiceMock).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole("button", { name: /^send invoice$/i }))

    await waitFor(() => expect(resendEventInvoiceMock).toHaveBeenCalledWith(INVOICE_UNIQUE_ID))
    expect(markEventInvoiceAsPaidMock).not.toHaveBeenCalled()
  })

  /** A custom-invoice send reports an invoice message, never the ticket-resend language that has nothing to send. */
  it("reports invoice-worded success when the email is sent, never ticket language", async () => {
    const user = userEvent.setup()
    renderActions({ canResendTickets: false, canEmailInvoice: true })

    await user.click(screen.getByRole("button", { name: /email invoice to buyer/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: /^send invoice$/i }))

    await waitFor(() => expect(successTitles()).toContainEqual(expect.stringMatching(/invoice/i)))
    expect(successTitles()).not.toContainEqual(expect.stringMatching(/tickets/i))
  })

  /** Splitting the email path off the resend hook must leave the ticket path reporting its own copy. */
  it("still reports ticket-worded success when all tickets are resent", async () => {
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole("button", { name: /resend all tickets/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: /^resend all$/i }))

    await waitFor(() => expect(successTitles()).toContainEqual(expect.stringMatching(/tickets/i)))
  })

  /** A failed send stays on screen with its reason so the organizer can see why and retry. */
  it("keeps the email dialog open and shows the error when the send fails", async () => {
    resendEventInvoiceMock.mockRejectedValue(new Error("network down"))
    const user = userEvent.setup()
    renderActions({ canResendTickets: false, canEmailInvoice: true })

    await user.click(screen.getByRole("button", { name: /email invoice to buyer/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: /^send invoice$/i }))

    expect(await screen.findByText(/an unexpected error occurred/i)).toBeInTheDocument()
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })

  /** A refused mark-paid stays open with the reason, and nothing is cancelled along the way. */
  it("keeps the mark-paid dialog open and shows the error when settling fails", async () => {
    markEventInvoiceAsPaidMock.mockRejectedValue(new Error("network down"))
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole("button", { name: /mark as paid/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: /^mark as paid$/i }))

    expect(await screen.findByText(/an unexpected error occurred/i)).toBeInTheDocument()
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    expect(cancelEventInvoiceMock).not.toHaveBeenCalled()
  })
})
