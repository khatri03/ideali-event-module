import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { CancelInvoiceDialog } from "./CancelInvoiceDialog"

interface RenderDialogOptions {
  isPending?: boolean
  errorMessage?: string | null
}

/** Renders the dialog open against a fixed invoice, returning the spies the organizer's actions reach. */
function renderDialog({ isPending = false, errorMessage = null }: RenderDialogOptions = {}) {
  const onConfirm = vi.fn()
  const onClose = vi.fn()
  render(
    <ChakraProvider value={system}>
      <CancelInvoiceDialog
        open
        invoiceNo="INV-2001"
        isPending={isPending}
        errorMessage={errorMessage}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    </ChakraProvider>,
  )
  return { onConfirm, onClose, dialog: screen.getByRole("alertdialog") }
}

describe("CancelInvoiceDialog", () => {
  /**
   * The organizer must know what cancelling does before committing to it: the order closes unpaid, its
   * seats go back on sale, the buyer is emailed, and none of it can be reversed.
   */
  it("Open_NamesTheOutcomeOfCancelling", () => {
    const { dialog } = renderDialog()

    expect(within(dialog).getByText("INV-2001")).toBeInTheDocument()
    expect(dialog).toHaveTextContent(/closed unpaid/i)
    expect(dialog).toHaveTextContent(/seats it holds released/i)
    expect(dialog).toHaveTextContent(/buyer emailed/i)
    expect(dialog).toHaveTextContent(/cannot be undone/i)
  })

  /** A cancellation with no reason leaves no audit trail, so an empty submit is stopped with a visible reason. */
  it("SubmitWithoutNotes_ShowsAnInlineErrorAndCancelsNothing", async () => {
    const user = userEvent.setup()
    const { onConfirm, dialog } = renderDialog()

    await user.click(within(dialog).getByRole("button", { name: /^cancel order$/i }))

    expect(await within(dialog).findByText("Enter the reason for cancelling this order.")).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  /** Spaces are not a reason: whitespace-only notes are refused exactly like empty ones. */
  it("SubmitWithWhitespaceOnlyNotes_IsRefused", async () => {
    const user = userEvent.setup()
    const { onConfirm, dialog } = renderDialog()

    await user.type(within(dialog).getByLabelText(/reason for cancelling/i), "    ")
    await user.click(within(dialog).getByRole("button", { name: /^cancel order$/i }))

    expect(await within(dialog).findByText("Enter the reason for cancelling this order.")).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  /** The reason the organizer typed is what reaches the server, without the padding around it. */
  it("SubmitWithNotes_HandsOnTheTrimmedReason", async () => {
    const user = userEvent.setup()
    const { onConfirm, dialog } = renderDialog()

    await user.type(within(dialog).getByLabelText(/reason for cancelling/i), "  Sponsor withdrew.  ")
    await user.click(within(dialog).getByRole("button", { name: /^cancel order$/i }))

    expect(onConfirm).toHaveBeenCalledExactlyOnceWith("Sponsor withdrew.")
  })

  /** While the cancellation is in flight the confirm button cannot be pressed again, so it is never sent twice. */
  it("Pending_DisablesTheConfirmButton", () => {
    const { dialog } = renderDialog({ isPending: true })

    expect(within(dialog).getByRole("button", { name: /cancelling/i })).toBeDisabled()
  })

  /** A refused cancellation is explained inside the dialog, next to the reason the organizer can still edit. */
  it("SubmitError_IsShownInsideTheDialog", () => {
    const { dialog } = renderDialog({ errorMessage: "Only an invoice that is still awaiting payment can be cancelled." })

    expect(within(dialog).getByText("Only an invoice that is still awaiting payment can be cancelled.")).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/reason for cancelling/i)).toBeInTheDocument()
  })

  /** Backing out of the dialog cancels nothing. */
  it("Dismiss_ClosesWithoutCancelling", async () => {
    const user = userEvent.setup()
    const { onConfirm, onClose, dialog } = renderDialog()

    await user.type(within(dialog).getByLabelText(/reason for cancelling/i), "Sponsor withdrew.")
    await user.click(within(dialog).getByRole("button", { name: /^cancel$/i }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  /** A reason typed for an abandoned attempt must not be sent with a later, different cancellation. */
  it("Reopen_StartsWithAnEmptyReason", async () => {
    const user = userEvent.setup()
    const props = { invoiceNo: "INV-2001", isPending: false, errorMessage: null, onConfirm: vi.fn(), onClose: vi.fn() }
    const { rerender } = render(
      <ChakraProvider value={system}>
        <CancelInvoiceDialog open {...props} />
      </ChakraProvider>,
    )
    await user.type(screen.getByLabelText(/reason for cancelling/i), "Sponsor withdrew.")

    rerender(
      <ChakraProvider value={system}>
        <CancelInvoiceDialog open={false} {...props} />
      </ChakraProvider>,
    )
    rerender(
      <ChakraProvider value={system}>
        <CancelInvoiceDialog open {...props} />
      </ChakraProvider>,
    )

    expect(await screen.findByLabelText(/reason for cancelling/i)).toHaveValue("")
  })
})
