import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import {
  RegistrationPaymentConfirmation,
  type PreparedPaymentIntent,
} from "./RegistrationPaymentConfirmation"

// The dialog only reaches Stripe on the card branch, and none of these cases take it.
vi.mock("@stripe/react-stripe-js", () => ({
  useStripe: () => null,
  useElements: () => null,
}))

function renderConfirmation(overrides: { isFreeOrder?: boolean; isChequePayment?: boolean } = {}) {
  const handlers = {
    onPrepare: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
    onCreateIntent: vi
      .fn<() => Promise<PreparedPaymentIntent>>()
      .mockResolvedValue({ clientSecret: "cs_test", returnUrl: "/orders/1" }),
    onRecordCheque: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    onConfirmFree: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    onFailed: vi.fn<(message: string) => void>(),
  }

  render(
    <ChakraProvider value={system}>
      <RegistrationPaymentConfirmation
        isOpen
        onOpenChange={vi.fn()}
        eventTitle="Golden Jubilee"
        currencyCode="USD"
        accentColor="#123456"
        selectedTicketCount={1}
        paymentMethodLabel="No payment required"
        isCardPayment={false}
        isChequePayment={overrides.isChequePayment ?? false}
        isFreeOrder={overrides.isFreeOrder ?? false}
        cardHolderName=""
        validationMessage={null}
        ticketRows={[{ sessionName: "Opening night", ticketName: "Guest", quantity: 1, lineTotal: 0 }]}
        grossSubtotal={0}
        discountAmount={0}
        netSubtotal={0}
        chargeRows={[]}
        grandTotal={0}
        invoiceNote=""
        isBusy={false}
        onInvoiceNoteChange={vi.fn()}
        onPrepare={handlers.onPrepare}
        onCreateIntent={handlers.onCreateIntent}
        onRecordCheque={handlers.onRecordCheque}
        onConfirmFree={handlers.onConfirmFree}
        onPaid={vi.fn()}
        onFailed={handlers.onFailed}
      />
    </ChakraProvider>,
  )

  return handlers
}

describe("RegistrationPaymentConfirmation", () => {
  it("Confirm_OrderCostsNothing_RegistersWithoutMintingAPaymentIntent", async () => {
    const handlers = renderConfirmation({ isFreeOrder: true })

    await userEvent.click(screen.getByRole("button", { name: "Complete registration" }))

    await waitFor(() => expect(handlers.onConfirmFree).toHaveBeenCalledTimes(1))
    expect(handlers.onCreateIntent).not.toHaveBeenCalled()
  })

  it("Confirm_FreeOrderStillCarriesAChequeSelection_TakesTheFreeRouteAnyway", async () => {
    // The server refuses a zero-amount cheque the same way it refuses a zero-amount intent.
    const handlers = renderConfirmation({ isFreeOrder: true, isChequePayment: true })

    await userEvent.click(screen.getByRole("button", { name: "Complete registration" }))

    await waitFor(() => expect(handlers.onConfirmFree).toHaveBeenCalledTimes(1))
    expect(handlers.onRecordCheque).not.toHaveBeenCalled()
  })

  it("Confirm_FreeRegistrationIsRefused_ReportsWhyAndDoesNotFallBackToStripe", async () => {
    const handlers = renderConfirmation({ isFreeOrder: true })
    handlers.onConfirmFree.mockRejectedValue(new Error("Not enough tickets are available."))

    await userEvent.click(screen.getByRole("button", { name: "Complete registration" }))

    await waitFor(() => expect(handlers.onFailed).toHaveBeenCalledTimes(1))
    expect(handlers.onCreateIntent).not.toHaveBeenCalled()
  })

  it("Confirm_ReviewIsIncomplete_DoesNotRegisterAtAll", async () => {
    const handlers = renderConfirmation({ isFreeOrder: true })
    handlers.onPrepare.mockResolvedValue(false)

    await userEvent.click(screen.getByRole("button", { name: "Complete registration" }))

    await waitFor(() => expect(handlers.onPrepare).toHaveBeenCalledTimes(1))
    expect(handlers.onConfirmFree).not.toHaveBeenCalled()
  })
})
