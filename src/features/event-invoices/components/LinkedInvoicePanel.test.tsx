import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { ChakraProvider } from "@chakra-ui/react"
import type { EventInvoiceLinkedReference } from "@/api/eventInvoices"
import { system } from "@/theme"
import { LinkedInvoicePanel } from "./LinkedInvoicePanel"

const { useUnlinkEventInvoiceMock, unlinkMock } = vi.hoisted(() => ({
  useUnlinkEventInvoiceMock: vi.fn(),
  unlinkMock: vi.fn(),
}))

vi.mock("../hooks/useEventInvoices", () => ({
  useUnlinkEventInvoice: useUnlinkEventInvoiceMock,
}))

const LINKED: EventInvoiceLinkedReference = {
  invoiceUniqueId: "invoice-2",
  invoiceNo: "INV-2002",
  invoiceStatusLabel: "Pending Payment",
}

function renderPanel(linkedInvoice: EventInvoiceLinkedReference | null = LINKED) {
  return render(
    <ChakraProvider value={system}>
      <MemoryRouter>
        <LinkedInvoicePanel invoiceUniqueId="invoice-1" invoiceNo="INV-2001" linkedInvoice={linkedInvoice} />
      </MemoryRouter>
    </ChakraProvider>,
  )
}

function mockUnlinkState(state: { isPending?: boolean; error?: unknown } = {}) {
  useUnlinkEventInvoiceMock.mockReturnValue({
    mutateAsync: unlinkMock,
    reset: vi.fn(),
    isPending: state.isPending ?? false,
    error: state.error ?? null,
  })
}

describe("LinkedInvoicePanel", () => {
  beforeEach(() => {
    unlinkMock.mockReset().mockResolvedValue(undefined)
    useUnlinkEventInvoiceMock.mockReset()
    mockUnlinkState()
  })

  /** The reference is only useful if the organizer can reach the other invoice from it in one click. */
  it("Linked_ShowsTheLinkedInvoiceNoAsALinkToItsDetailWithItsStatus", () => {
    renderPanel()

    expect(screen.getByRole("link", { name: "INV-2002" })).toHaveAttribute("href", "/organizer/events/invoices/invoice-2")
    expect(screen.getByText("Pending Payment")).toBeInTheDocument()
  })

  /** An unlinked invoice says so in words rather than leaving an empty panel for the organizer to puzzle over. */
  it("NotLinked_ShowsThePlainEmptySentenceAndNoRemoveAction", () => {
    renderPanel(null)

    expect(screen.getByText("Not linked to another invoice.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /remove link/i })).not.toBeInTheDocument()
  })

  /** Removing a link is destructive, so nothing is sent until the organizer confirms a dialog naming both invoices. */
  it("RemoveLink_AsksForConfirmationNamingBothInvoicesBeforeUnlinking", async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole("button", { name: /remove link/i }))

    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText(/both invoices stay separate/i)).toBeInTheDocument()
    expect(within(dialog).getByText("INV-2001")).toBeInTheDocument()
    expect(within(dialog).getByText("INV-2002")).toBeInTheDocument()
    expect(unlinkMock).not.toHaveBeenCalled()
  })

  /** Confirming is what removes the link, and it is wired to the invoice pair shown on screen. */
  it("RemoveLinkConfirmed_CallsUnlinkForThisInvoiceAndItsLinkedInvoice", async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole("button", { name: /remove link/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: "Remove link" }))

    await waitFor(() => expect(unlinkMock).toHaveBeenCalledTimes(1))
    expect(useUnlinkEventInvoiceMock).toHaveBeenCalledWith("invoice-1", "invoice-2")
  })

  /** A refused unlink keeps the dialog open with the reason, so the organizer never reads a failure as done. */
  it("RemoveLinkRefused_KeepsTheDialogOpenWithTheError", async () => {
    unlinkMock.mockRejectedValue(new Error("refused"))
    const user = userEvent.setup()
    const { rerender } = renderPanel()

    await user.click(screen.getByRole("button", { name: /remove link/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: "Remove link" }))
    await waitFor(() => expect(unlinkMock).toHaveBeenCalled())

    mockUnlinkState({ error: new Error("refused") })
    rerender(
      <ChakraProvider value={system}>
        <MemoryRouter>
          <LinkedInvoicePanel invoiceUniqueId="invoice-1" invoiceNo="INV-2001" linkedInvoice={LINKED} />
        </MemoryRouter>
      </ChakraProvider>,
    )

    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    expect(within(screen.getByRole("alertdialog")).getByText("An unexpected error occurred.")).toBeInTheDocument()
  })

  /** While the unlink is in flight the confirm button cannot be pressed twice. */
  it("RemoveLinkPending_DisablesTheConfirmButton", async () => {
    mockUnlinkState({ isPending: true })
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole("button", { name: /remove link/i }))
    const dialog = await screen.findByRole("alertdialog")

    expect(within(dialog).getByRole("button", { name: /removing/i })).toBeDisabled()
  })
})
