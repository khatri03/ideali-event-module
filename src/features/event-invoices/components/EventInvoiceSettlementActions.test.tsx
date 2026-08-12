import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { system } from "@/theme"
import { EventInvoiceSettlementActions } from "./EventInvoiceSettlementActions"

const { markEventInvoiceAsPaidMock, cancelEventInvoiceMock } = vi.hoisted(() => ({
  markEventInvoiceAsPaidMock: vi.fn(),
  cancelEventInvoiceMock: vi.fn(),
}))

vi.mock("@/api/eventInvoices", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/eventInvoices")>()
  return {
    ...actual,
    markEventInvoiceAsPaid: markEventInvoiceAsPaidMock,
    cancelEventInvoice: cancelEventInvoiceMock,
  }
})

const INVOICE_UNIQUE_ID = "invoice-1"

function renderActions({ canMarkAsPaid = true, canCancel = true } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <EventInvoiceSettlementActions
          invoiceUniqueId={INVOICE_UNIQUE_ID}
          invoiceNo="INV-2001"
          canMarkAsPaid={canMarkAsPaid}
          canCancel={canCancel}
        />
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

describe("EventInvoiceSettlementActions", () => {
  beforeEach(() => {
    markEventInvoiceAsPaidMock.mockReset().mockResolvedValue(undefined)
    cancelEventInvoiceMock.mockReset().mockResolvedValue(undefined)
  })

  it("renders nothing when the order admits neither action", () => {
    const { container } = renderActions({ canMarkAsPaid: false, canCancel: false })

    expect(container).toBeEmptyDOMElement()
  })

  it("offers only the actions the server allows", () => {
    renderActions({ canMarkAsPaid: true, canCancel: false })

    expect(screen.getByRole("button", { name: /mark as paid/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /mark as cancelled/i })).not.toBeInTheDocument()
  })

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

  it("cancelling the order calls the cancel endpoint, not the settle one", async () => {
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole("button", { name: /mark as cancelled/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: /^cancel order$/i }))

    await waitFor(() => expect(cancelEventInvoiceMock).toHaveBeenCalledWith(INVOICE_UNIQUE_ID))
    expect(markEventInvoiceAsPaidMock).not.toHaveBeenCalled()
  })

  it("dismissing the confirmation calls nothing", async () => {
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole("button", { name: /mark as paid/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: /^cancel$/i }))

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(markEventInvoiceAsPaidMock).not.toHaveBeenCalled()
  })

  it("keeps the dialog open and shows the error when the action fails", async () => {
    cancelEventInvoiceMock.mockRejectedValue(new Error("network down"))
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole("button", { name: /mark as cancelled/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: /^cancel order$/i }))

    expect(await screen.findByText(/an unexpected error occurred/i)).toBeInTheDocument()
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })
})
