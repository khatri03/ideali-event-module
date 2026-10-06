import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { ChakraProvider } from "@chakra-ui/react"
import type { LinkedInvoiceReference } from "@/api/customInvoices"
import { system } from "@/theme"
import { LinkedInvoicePanel } from "./LinkedInvoicePanel"

const { useUnlinkCustomInvoiceMock, unlinkMock } = vi.hoisted(() => ({
  useUnlinkCustomInvoiceMock: vi.fn(),
  unlinkMock: vi.fn(),
}))

vi.mock("../hooks/useCustomInvoices", () => ({
  useUnlinkCustomInvoice: useUnlinkCustomInvoiceMock,
}))

const LINKED: LinkedInvoiceReference = {
  invoiceUniqueId: "invoice-2",
  invoiceNo: "INV-2002",
  invoiceStatusLabel: "Pending Payment",
}

function panel(linkedInvoice: LinkedInvoiceReference | null, canLink: boolean) {
  return (
    <ChakraProvider value={system}>
      <MemoryRouter>
        <LinkedInvoicePanel invoiceUniqueId="invoice-1" invoiceNo="INV-2001" moduleType="Membership" linkedInvoice={linkedInvoice} canLink={canLink} />
      </MemoryRouter>
    </ChakraProvider>
  )
}

function renderPanel(linkedInvoice: LinkedInvoiceReference | null = LINKED, canLink = true) {
  return render(panel(linkedInvoice, canLink))
}

function mockUnlinkState(state: { isPending?: boolean; error?: unknown } = {}) {
  useUnlinkCustomInvoiceMock.mockReturnValue({
    mutateAsync: unlinkMock,
    reset: vi.fn(),
    isPending: state.isPending ?? false,
    error: state.error ?? null,
  })
}

describe("LinkedInvoicePanel", () => {
  beforeEach(() => {
    unlinkMock.mockReset().mockResolvedValue(undefined)
    useUnlinkCustomInvoiceMock.mockReset()
    mockUnlinkState()
  })

  /** The linked invoice is always a custom invoice, so its number opens the custom invoice's own page with its status beside it. */
  it("LinkedPanel_LinkedInvoiceNumber_OpensTheCustomInvoiceDetailRoute", () => {
    renderPanel()

    expect(screen.getByRole("link", { name: "INV-2002" })).toHaveAttribute("href", "/organizer/custom-invoices/invoice-2")
    expect(screen.getByText("Pending Payment")).toBeInTheDocument()
  })

  /** An unlinked invoice says so in words rather than leaving an empty panel for the organizer to puzzle over. */
  it("NotLinked_ShowsThePlainEmptySentenceAndNoRemoveAction", () => {
    renderPanel(null)

    expect(screen.getByText("Not linked to another invoice.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /remove link/i })).not.toBeInTheDocument()
  })

  /** An unlinked invoice that may start a link offers the Link invoice action. */
  it("NotLinkedAndLinkable_OffersLinkInvoice", () => {
    renderPanel(null, true)

    expect(screen.getByRole("button", { name: /link invoice/i })).toBeInTheDocument()
  })

  /** A cancelled invoice is refused by the server, so the action is not offered at all rather than failing on click. */
  it("NotLinkedButNotLinkable_OffersNoLinkAction", () => {
    renderPanel(null, false)

    expect(screen.getByText("Not linked to another invoice.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /link invoice/i })).not.toBeInTheDocument()
  })

  /** A link is singular: an invoice already linked offers removal, never a second link. */
  it("AlreadyLinked_OffersNoLinkInvoiceAction", () => {
    renderPanel(LINKED, true)

    expect(screen.queryByRole("button", { name: /^link invoice$/i })).not.toBeInTheDocument()
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

  /** Confirming removes the link through the custom-invoice unlink mutation, wired to the pair shown on screen. */
  it("LinkedPanel_Unlink_RemovesThroughTheCustomInvoiceUnlinkMutation", async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole("button", { name: /remove link/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: "Remove link" }))

    await waitFor(() => expect(unlinkMock).toHaveBeenCalledTimes(1))
    expect(useUnlinkCustomInvoiceMock).toHaveBeenCalledWith("invoice-1", "invoice-2")
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
    rerender(panel(LINKED, true))

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
