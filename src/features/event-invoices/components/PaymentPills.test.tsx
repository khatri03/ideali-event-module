import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { PaymentPills } from "./PaymentPills"

function renderPills(paymentMethod: string | null, paymentSource: string | null) {
  return render(
    <ChakraProvider value={system}>
      <PaymentPills paymentMethod={paymentMethod} paymentSource={paymentSource} />
    </ChakraProvider>,
  )
}

describe("PaymentPills", () => {
  it("PaidByCard_ShowsTheMethodLabelAndTheInstrument", () => {
    renderPills("CreditCard", "Visa ending 4242")

    expect(screen.getByText("Credit Card")).toBeInTheDocument()
    expect(screen.getByText("Visa ending 4242")).toBeInTheDocument()
  })

  it("UnknownMethod_FallsBackToTheRawValueRatherThanHidingIt", () => {
    renderPills("TapToPay", null)

    expect(screen.getByText("TapToPay")).toBeInTheDocument()
  })

  /** An unpaid invoice has no instrument - an empty pill row would just be clutter under every row. */
  it("NothingPaidYet_RendersNoPills", () => {
    const { container } = renderPills(null, null)

    expect(container).toBeEmptyDOMElement()
  })

  it("MethodWithoutSource_ShowsOnlyTheMethod", () => {
    renderPills("Cheque", null)

    expect(screen.getByText("Cheque")).toBeInTheDocument()
  })
})
