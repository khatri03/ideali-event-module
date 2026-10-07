import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query"
import { system } from "@/theme"
import { InvoiceSettlementActions } from "./InvoiceSettlementActions"

const { markPaidMock, cancelMock, resendMock, emailMock } = vi.hoisted(() => ({
  markPaidMock: vi.fn(),
  cancelMock: vi.fn(),
  resendMock: vi.fn(),
  emailMock: vi.fn(),
}))

interface ActionsState {
  canMarkAsPaid?: boolean
  canCancel?: boolean
  canResendTickets?: boolean
  canEmailInvoice?: boolean
  buyerEmail?: string | null
}

/**
 * Hands the presentational row real TanStack mutations over spied actions, the way each detail page hands
 * it its own module's hooks, so pending and error states behave exactly as they do on the page.
 */
function ActionsHarness(state: Required<ActionsState>) {
  const markPaid = useMutation({ mutationFn: () => markPaidMock() })
  const cancel = useMutation({ mutationFn: (notes: string) => cancelMock(notes) })
  const resendTickets = useMutation({ mutationFn: () => resendMock() })
  const emailInvoice = useMutation({ mutationFn: () => emailMock() })

  return (
    <InvoiceSettlementActions
      invoiceNo="INV-2001"
      {...state}
      markPaid={markPaid}
      cancel={cancel}
      resendTickets={resendTickets}
      emailInvoice={emailInvoice}
    />
  )
}

function renderActions({
  canMarkAsPaid = true,
  canCancel = true,
  canResendTickets = true,
  canEmailInvoice = false,
  buyerEmail = "sponsor@example.com",
}: ActionsState = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <ActionsHarness
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

describe("InvoiceSettlementActions", () => {
  beforeEach(() => {
    markPaidMock.mockReset().mockResolvedValue(undefined)
    cancelMock.mockReset().mockResolvedValue(undefined)
    resendMock.mockReset().mockResolvedValue(undefined)
    emailMock.mockReset().mockResolvedValue(undefined)
  })

  /** A custom invoice page hands over no resend action, so no resend button appears even if the flag were set. */
  it("offers no resend when the page supplies no resend action", () => {
    const markPaid = { mutateAsync: vi.fn(), reset: vi.fn(), isPending: false, error: null }
    render(
      <ChakraProvider value={system}>
        <InvoiceSettlementActions
          invoiceNo="CINV-1"
          canMarkAsPaid
          canCancel={false}
          canResendTickets
          markPaid={markPaid}
          cancel={markPaid}
        />
      </ChakraProvider>,
    )

    expect(screen.getByRole("button", { name: /mark as paid/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /resend all tickets/i })).not.toBeInTheDocument()
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

  /** Resending all tickets runs the resend action, never a settlement action. */
  it("resending all tickets runs the resend action", async () => {
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole("button", { name: /resend all tickets/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: /^resend all$/i }))

    await waitFor(() => expect(resendMock).toHaveBeenCalledTimes(1))
    expect(markPaidMock).not.toHaveBeenCalled()
    expect(cancelMock).not.toHaveBeenCalled()
  })

  /** Marking paid is irreversible, so it names the order and waits for confirmation before calling the API. */
  it("marking as paid asks for confirmation before calling the API", async () => {
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole("button", { name: /mark as paid/i }))

    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("INV-2001")).toBeInTheDocument()
    expect(markPaidMock).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole("button", { name: /^mark as paid$/i }))

    await waitFor(() => expect(markPaidMock).toHaveBeenCalledTimes(1))
    expect(cancelMock).not.toHaveBeenCalled()
  })

  /** The reason typed in the cancel dialog is what the cancel endpoint receives; the settle endpoint is never hit. */
  it("cancelling the order sends the entered notes to the cancel endpoint, not the settle one", async () => {
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole("button", { name: /mark as cancelled/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.type(within(dialog).getByLabelText(/reason for cancelling/i), "Sponsor withdrew.")
    await user.click(within(dialog).getByRole("button", { name: /^cancel order$/i }))

    await waitFor(() => expect(cancelMock).toHaveBeenCalledWith("Sponsor withdrew."))
    expect(markPaidMock).not.toHaveBeenCalled()
  })

  /** Backing out of a confirmation calls nothing. */
  it("dismissing the confirmation calls nothing", async () => {
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole("button", { name: /mark as paid/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: /^cancel$/i }))

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(markPaidMock).not.toHaveBeenCalled()
  })

  /** A failed cancellation stays on screen with its reason, so the organizer can see why and retry. */
  it("keeps the dialog open and shows the error when the action fails", async () => {
    cancelMock.mockRejectedValue(new Error("network down"))
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

    expect(await within(dialog).findByText("Enter the reason for cancelling.")).toBeInTheDocument()
    expect(cancelMock).not.toHaveBeenCalled()
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
    cancelMock.mockRejectedValueOnce(new Error("network down"))
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
    expect(emailMock).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole("button", { name: /^send invoice$/i }))

    await waitFor(() => expect(emailMock).toHaveBeenCalledTimes(1))
    expect(markPaidMock).not.toHaveBeenCalled()
  })

  /** A failed send stays on screen with its reason so the organizer can see why and retry. */
  it("keeps the email dialog open and shows the error when the send fails", async () => {
    emailMock.mockRejectedValue(new Error("network down"))
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
    markPaidMock.mockRejectedValue(new Error("network down"))
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole("button", { name: /mark as paid/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: /^mark as paid$/i }))

    expect(await screen.findByText(/an unexpected error occurred/i)).toBeInTheDocument()
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    expect(cancelMock).not.toHaveBeenCalled()
  })
})

/** A list row's menu over real mutations, the way CustomInvoiceRowActions hands them in. */
function MenuHarness({ state, onView }: { state: Required<Omit<ActionsState, "canResendTickets">>; onView: () => void }) {
  const markPaid = useMutation({ mutationFn: () => markPaidMock() })
  const cancel = useMutation({ mutationFn: (notes: string) => cancelMock(notes) })
  const emailInvoice = useMutation({ mutationFn: () => emailMock() })

  return (
    <InvoiceSettlementActions
      variant="menu"
      subject="invoice"
      invoiceNo="CI-0007"
      {...state}
      markPaid={markPaid}
      cancel={cancel}
      emailInvoice={emailInvoice}
      onView={onView}
    />
  )
}

function renderMenu({ canMarkAsPaid = true, canCancel = true, canEmailInvoice = true, buyerEmail = "sponsor@example.com" }: ActionsState = {}) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const onView = vi.fn()
  render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <MenuHarness state={{ canMarkAsPaid, canCancel, canEmailInvoice, buyerEmail }} onView={onView} />
      </QueryClientProvider>
    </ChakraProvider>,
  )
  return { onView }
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Actions for invoice CI-0007" }))
  return screen.findByRole("menu")
}

describe("InvoiceSettlementActions menu", () => {
  beforeEach(() => {
    markPaidMock.mockReset().mockResolvedValue(undefined)
    cancelMock.mockReset().mockResolvedValue(undefined)
    emailMock.mockReset().mockResolvedValue(undefined)
  })

  /** A paid invoice can still be opened and its link re-sent, but never settled or cancelled again. */
  it("SettlementMenu_PaidInvoice_OffersOnlyViewAndEmailLink", async () => {
    const user = userEvent.setup()
    renderMenu({ canMarkAsPaid: false, canCancel: false, canEmailInvoice: true })

    const menu = await openMenu(user)

    const labels = within(menu).getAllByRole("menuitem").map((item) => item.textContent)
    expect(labels).toEqual(["View", "Email link"])
  })

  /** Settling from a row goes through the same irreversible-action confirmation as the detail page. */
  it("SettlementMenu_MarkPaidItem_OpensTheSameConfirmDialog", async () => {
    const user = userEvent.setup()
    renderMenu()

    const menu = await openMenu(user)
    await user.click(within(menu).getByRole("menuitem", { name: "Mark as paid" }))

    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("CI-0007")).toBeInTheDocument()
    expect(markPaidMock).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole("button", { name: /^mark as paid$/i }))
    await waitFor(() => expect(markPaidMock).toHaveBeenCalledTimes(1))
  })

  /**
   * A custom invoice issues no tickets and holds no seats; a dialog that promises either tells the organizer
   * something false about an action they cannot undo.
   */
  it("SettlementMenu_InvoiceDialogs_NeverMentionOrdersTicketsOrSeats", async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(within(await openMenu(user)).getByRole("menuitem", { name: "Mark as paid" }))
    const markPaidDialog = await screen.findByRole("alertdialog")
    expect(within(markPaidDialog).getByText("Mark this invoice as paid")).toBeInTheDocument()
    expect(markPaidDialog).toHaveTextContent(/Invoice CI-0007 will be recorded as paid in full and the buyer emailed/)
    expect(markPaidDialog).not.toHaveTextContent(/order|ticket|seat/i)
    await user.click(within(markPaidDialog).getByRole("button", { name: /^cancel$/i }))
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())

    await user.click(within(await openMenu(user)).getByRole("menuitem", { name: "Cancel invoice" }))
    const cancelDialog = await screen.findByRole("alertdialog")
    expect(within(cancelDialog).getByText("Cancel this invoice")).toBeInTheDocument()
    expect(cancelDialog).not.toHaveTextContent(/order|ticket|seat/i)
  })

  /** A cancelled invoice still needs a way in from its row, so the trigger stays with View alone. */
  it("SettlementMenu_OnlyView_StillRendersTrigger", async () => {
    const user = userEvent.setup()
    const { onView } = renderMenu({ canMarkAsPaid: false, canCancel: false, canEmailInvoice: false })

    const menu = await openMenu(user)
    const items = within(menu).getAllByRole("menuitem")
    expect(items.map((item) => item.textContent)).toEqual(["View"])
    await user.click(items[0])
    expect(onView).toHaveBeenCalledTimes(1)
  })

  /** Cancelling from a row demands the same recorded reason as the detail page before anything is sent. */
  it("SettlementMenu_CancelItem_SendsTheEnteredReason", async () => {
    const user = userEvent.setup()
    renderMenu()

    const menu = await openMenu(user)
    await user.click(within(menu).getByRole("menuitem", { name: "Cancel invoice" }))
    const dialog = await screen.findByRole("alertdialog")
    await user.type(within(dialog).getByLabelText(/reason for cancelling/i), "Sponsor withdrew.")
    await user.click(within(dialog).getByRole("button", { name: /^cancel invoice$/i }))

    await waitFor(() => expect(cancelMock).toHaveBeenCalledWith("Sponsor withdrew."))
  })
})

describe("InvoiceSettlementActions buttons", () => {
  /** The detail page keeps showing no empty button row for an invoice that admits no action. */
  it("SettlementButtons_NothingAllowed_RendersNothing", () => {
    const markPaid = { mutateAsync: vi.fn(), reset: vi.fn(), isPending: false, error: null }
    const { container } = render(
      <ChakraProvider value={system}>
        <InvoiceSettlementActions invoiceNo="CI-1" canMarkAsPaid={false} canCancel={false} markPaid={markPaid} cancel={markPaid} onView={vi.fn()} />
      </ChakraProvider>,
    )

    expect(container).toBeEmptyDOMElement()
  })
})

