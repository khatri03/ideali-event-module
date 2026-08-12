import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { EventInvoiceBuyerPanel } from "./EventInvoiceBuyerPanel"

const { updateBuyerMock, resendInvoiceMock } = vi.hoisted(() => ({
  updateBuyerMock: vi.fn(),
  resendInvoiceMock: vi.fn(),
}))

vi.mock("../hooks/useEventInvoices", () => ({
  useUpdateEventInvoiceBuyer: () => ({
    mutateAsync: updateBuyerMock,
    isPending: false,
    error: null,
  }),
  useResendEventInvoice: () => ({
    mutateAsync: resendInvoiceMock,
    isPending: false,
    error: null,
  }),
}))

function renderPanel(overrides: Partial<Parameters<typeof EventInvoiceBuyerPanel>[0]> = {}) {
  return render(
    <ChakraProvider value={system}>
      <EventInvoiceBuyerPanel
        invoiceUniqueId="invoice-1"
        invoiceNo="INV-2001"
        buyerName="Jane Doe"
        buyerEmail="jane@example.com"
        buyerPhone={null}
        canEditBuyer
        hasIssuedTickets
        canResendTickets
        {...overrides}
      />
    </ChakraProvider>,
  )
}

/**
 * Chakra's dialog treats any pointer press inside itself as a dismissal in this DOM implementation, so
 * only the button that opens it is clicked. Everything within is driven by the events the browser would
 * have raised anyway - which is also why the dialog's own submit is fired rather than its button pressed.
 */
async function openDialog() {
  await userEvent.setup().click(screen.getByRole("button", { name: /edit buyer details for invoice INV-2001/i }))
  const dialog = await screen.findByRole("dialog")
  return { dialog, fields: within(dialog) }
}

function typeInto(field: HTMLElement, value: string) {
  fireEvent.change(field, { target: { value } })
}

describe("EventInvoiceBuyerPanel", () => {
  beforeEach(() => {
    updateBuyerMock.mockReset()
    updateBuyerMock.mockResolvedValue(undefined)
    resendInvoiceMock.mockReset()
    resendInvoiceMock.mockResolvedValue(undefined)
  })

  it("ClosedOrder_OffersNoWayToRewriteTheSettledRecord", () => {
    renderPanel({ canEditBuyer: false })

    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.getByText("Jane Doe")).toBeInTheDocument()
  })

  it("EditButton_IsNamedWithItsInvoiceSoItIsNotJustAnotherEdit", () => {
    renderPanel()

    expect(screen.getByRole("button", { name: /edit buyer details for invoice INV-2001/i })).toBeInTheDocument()
  })

  it("SaveButton_SubmitsTheFormItSitsIn", async () => {
    renderPanel()
    const { fields } = await openDialog()

    expect(fields.getByRole("button", { name: /save buyer details/i })).toHaveAttribute("type", "submit")
  })

  it("PhoneCleared_IsSentAsNullRatherThanAnEmptyString", async () => {
    renderPanel({ buyerPhone: "+1 555 0100" })
    const { dialog, fields } = await openDialog()

    typeInto(fields.getByLabelText(/phone/i), "")
    fireEvent.submit(dialog)

    await waitFor(() =>
      expect(updateBuyerMock).toHaveBeenCalledWith({
        buyerName: "Jane Doe",
        buyerEmail: "jane@example.com",
        buyerPhone: null,
      }),
    )
  })

  it("SurroundingWhitespace_IsTrimmedBeforeItReachesTheApi", async () => {
    renderPanel()
    const { dialog, fields } = await openDialog()

    typeInto(fields.getByLabelText(/name/i), "  Jane Q Doe  ")
    fireEvent.submit(dialog)

    await waitFor(() =>
      expect(updateBuyerMock).toHaveBeenCalledWith({
        buyerName: "Jane Q Doe",
        buyerEmail: "jane@example.com",
        buyerPhone: null,
      }),
    )
  })

  it("EmailLeftAlone_SaysNothingAboutDeliveredTickets", async () => {
    renderPanel()
    const { fields } = await openDialog()

    expect(fields.queryByText(/already went to/i)).not.toBeInTheDocument()
  })

  it("EmailChangedWithTicketsOut_WarnsThatDeliveredTicketsDoNotFollow", async () => {
    renderPanel()
    const { fields } = await openDialog()

    typeInto(fields.getByLabelText(/email/i), "new@example.com")

    expect(await fields.findByText(/already went to jane@example\.com/i)).toBeInTheDocument()
    expect(fields.getByText(/does not move them/i)).toBeInTheDocument()
  })

  it("EmailChangedWithNoTicketsIssued_DoesNotWarnAboutDeliveryThatNeverHappened", async () => {
    renderPanel({ hasIssuedTickets: false })
    const { fields } = await openDialog()

    typeInto(fields.getByLabelText(/email/i), "new@example.com")

    await waitFor(() => expect(fields.getByLabelText(/email/i)).toHaveValue("new@example.com"))
    expect(fields.queryByText(/already went to/i)).not.toBeInTheDocument()
  })

  it("ResendOptedIn_SavesThenResendsToTheNewAddress", async () => {
    renderPanel()
    const { dialog, fields } = await openDialog()

    typeInto(fields.getByLabelText(/email/i), "new@example.com")
    fireEvent.click(await fields.findByRole("checkbox", { name: /resend every ticket/i }))
    fireEvent.submit(dialog)

    await waitFor(() =>
      expect(updateBuyerMock).toHaveBeenCalledWith({
        buyerName: "Jane Doe",
        buyerEmail: "new@example.com",
        buyerPhone: null,
      }),
    )
    await waitFor(() => expect(resendInvoiceMock).toHaveBeenCalledTimes(1))
  })

  it("ResendNotOptedIn_SavesWithoutSendingAnyMail", async () => {
    renderPanel()
    const { dialog, fields } = await openDialog()

    typeInto(fields.getByLabelText(/email/i), "new@example.com")
    fireEvent.submit(dialog)

    await waitFor(() => expect(updateBuyerMock).toHaveBeenCalledTimes(1))
    expect(resendInvoiceMock).not.toHaveBeenCalled()
  })

  it("OrderThatCannotResend_SaysSoRatherThanOfferingTheChoice", async () => {
    renderPanel({ canResendTickets: false })
    const { fields } = await openDialog()

    typeInto(fields.getByLabelText(/email/i), "new@example.com")

    expect(await fields.findByText(/cannot be sent again/i)).toBeInTheDocument()
    expect(fields.queryByRole("checkbox")).not.toBeInTheDocument()
  })

  // The messages these rejections carry are asserted against the schema itself; this DOM implementation
  // tears the dialog down when the form focuses its first invalid field, so only the refusal is visible here.
  it("NameCleared_NeverReachesTheApi", async () => {
    renderPanel()
    const { dialog, fields } = await openDialog()

    typeInto(fields.getByLabelText(/name/i), "")
    fireEvent.submit(dialog)

    await waitFor(() => expect(fields.getByLabelText(/name/i)).toHaveValue(""))
    expect(updateBuyerMock).not.toHaveBeenCalled()
  })

  it("UnroutableEmail_NeverReachesTheApi", async () => {
    renderPanel()
    const { dialog, fields } = await openDialog()

    typeInto(fields.getByLabelText(/email/i), "not-an-address")
    fireEvent.submit(dialog)

    await waitFor(() => expect(fields.getByLabelText(/email/i)).toHaveValue("not-an-address"))
    expect(updateBuyerMock).not.toHaveBeenCalled()
  })

  it("SaveFailed_KeepsTheDialogOpenWithTheTypedValuesStillThere", async () => {
    updateBuyerMock.mockRejectedValue(new Error("boom"))
    renderPanel()
    const { dialog, fields } = await openDialog()

    typeInto(fields.getByLabelText(/email/i), "new@example.com")
    fireEvent.submit(dialog)

    await waitFor(() => expect(updateBuyerMock).toHaveBeenCalled())
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(fields.getByLabelText(/email/i)).toHaveValue("new@example.com")
  })
})
