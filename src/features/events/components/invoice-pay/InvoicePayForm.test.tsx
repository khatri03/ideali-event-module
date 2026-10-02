import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { ServiceResponseError } from "@/api/serviceResponse"
import { InvoicePayForm } from "./InvoicePayForm"

const { stripeMock, elementsMock } = vi.hoisted(() => ({
  stripeMock: { confirmPayment: vi.fn() },
  elementsMock: { submit: vi.fn() },
}))

vi.mock("@stripe/react-stripe-js", () => ({
  useStripe: () => stripeMock,
  useElements: () => elementsMock,
  PaymentElement: () => null,
}))

const INVOICE_UNIQUE_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7"

function renderForm() {
  const onStartPayment = vi.fn<() => Promise<{ clientSecret: string }>>().mockResolvedValue({ clientSecret: "pi_1_secret_2" })
  const onPaid = vi.fn()

  render(
    <ChakraProvider value={system}>
      <InvoicePayForm
        amount={1250}
        currencyCode="USD"
        invoiceUniqueId={INVOICE_UNIQUE_ID}
        onStartPayment={onStartPayment}
        onPaid={onPaid}
      />
    </ChakraProvider>,
  )

  return { onStartPayment, onPaid }
}

async function payAs(name: string) {
  if (name) {
    await userEvent.type(screen.getByPlaceholderText("Enter cardholder name"), name)
  }
  await userEvent.click(screen.getByRole("button", { name: /^Pay / }))
}

describe("InvoicePayForm", () => {
  beforeEach(() => {
    stripeMock.confirmPayment.mockReset().mockResolvedValue({})
    elementsMock.submit.mockReset().mockResolvedValue({})
  })

  /**
   * Stripe's deferred-intent flow only works in this order: the card is validated and tokenised first,
   * the server mints the intent second, and the card is confirmed against that intent last. Confirming
   * without the submit, or before the intent exists, fails the payment outright.
   */
  it("Pay_WithACardholderName_SubmitsStartsAndConfirmsInThatOrder", async () => {
    const calls: string[] = []
    elementsMock.submit.mockImplementation(async () => { calls.push("submit"); return {} })
    stripeMock.confirmPayment.mockImplementation(async () => { calls.push("confirm"); return {} })
    const { onStartPayment, onPaid } = renderForm()
    onStartPayment.mockImplementation(async () => { calls.push("start"); return { clientSecret: "pi_1_secret_2" } })

    await payAs("  Aisha Khan  ")

    await waitFor(() => expect(onPaid).toHaveBeenCalledTimes(1))
    expect(calls).toEqual(["submit", "start", "confirm"])
    expect(stripeMock.confirmPayment).toHaveBeenCalledWith({
      elements: elementsMock,
      clientSecret: "pi_1_secret_2",
      confirmParams: {
        return_url: `${window.location.origin}/custom-invoices/${INVOICE_UNIQUE_ID}/pay`,
        payment_method_data: { billing_details: { name: "Aisha Khan" } },
      },
      redirect: "if_required",
    })
  })

  /** Stripe needs the cardholder name at confirm time; starting a payment without it only wastes an intent. */
  it("Pay_WithoutACardholderName_ShowsTheFieldErrorAndStartsNothing", async () => {
    const { onStartPayment } = renderForm()

    await payAs("")

    expect(await screen.findByText("Enter the name on the card.")).toBeInTheDocument()
    expect(elementsMock.submit).not.toHaveBeenCalled()
    expect(onStartPayment).not.toHaveBeenCalled()
  })

  /**
   * D-G2: a declined card leaves the invoice payable. The buyer must see Stripe's own reason and be able
   * to try another card on the same page, and the retry asks the server again rather than reusing a
   * secret kept from the first attempt.
   */
  it("Pay_WhenTheCardIsDeclined_ShowsStripesMessageAndAllowsAnotherTry", async () => {
    stripeMock.confirmPayment.mockResolvedValueOnce({ error: { message: "Your card was declined." } })
    const { onStartPayment, onPaid } = renderForm()

    await payAs("Aisha Khan")

    expect(await screen.findByRole("alert")).toHaveTextContent("Your card was declined.")
    const payButton = screen.getByRole("button", { name: /^Pay / })
    await waitFor(() => expect(payButton).toBeEnabled())

    await userEvent.click(payButton)

    await waitFor(() => expect(onPaid).toHaveBeenCalledTimes(1))
    expect(onStartPayment).toHaveBeenCalledTimes(2)
  })

  /** A refused start (invoice paid meanwhile, bot check failed) must say why and never reach Stripe. */
  it("Pay_WhenTheServerRefusesToStart_ShowsTheServerReason", async () => {
    const { onStartPayment, onPaid } = renderForm()
    onStartPayment.mockRejectedValue(new ServiceResponseError("This invoice has already been paid."))

    await payAs("Aisha Khan")

    expect(await screen.findByRole("alert")).toHaveTextContent("This invoice has already been paid.")
    expect(stripeMock.confirmPayment).not.toHaveBeenCalled()
    expect(onPaid).not.toHaveBeenCalled()
  })

  /** Two quick clicks must not start two payments against the same invoice. */
  it("Pay_DoubleClick_StartsOnlyOnePayment", async () => {
    const { onStartPayment } = renderForm()
    let releaseStart = () => {}
    onStartPayment.mockImplementation(
      () => new Promise((resolve) => { releaseStart = () => resolve({ clientSecret: "pi_1_secret_2" }) }),
    )

    await userEvent.type(screen.getByPlaceholderText("Enter cardholder name"), "Aisha Khan")
    const payButton = screen.getByRole("button", { name: /^Pay / })
    await userEvent.dblClick(payButton)
    await waitFor(() => expect(onStartPayment).toHaveBeenCalledTimes(1))
    await userEvent.click(payButton)

    releaseStart()

    await waitFor(() => expect(stripeMock.confirmPayment).toHaveBeenCalledTimes(1))
    expect(onStartPayment).toHaveBeenCalledTimes(1)
  })
})
