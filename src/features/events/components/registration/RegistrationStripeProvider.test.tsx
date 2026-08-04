import { useEffect } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { RegistrationStripeProvider } from "./RegistrationStripeProvider"

const elementsOptions = vi.hoisted(() => ({ latest: null as Record<string, unknown> | null }))

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ options, children }: { options?: Record<string, unknown>; children: React.ReactNode }) => {
    elementsOptions.latest = options ?? null
    return <>{children}</>
  },
}))

vi.mock("@stripe/stripe-js", () => ({ loadStripe: vi.fn(() => Promise.resolve(null)) }))

vi.mock("@/features/events/hooks/useStripeCredentials", () => ({
  useStripeCredentials: () => ({ data: { publishableKey: "pk_test_123", stripeAccount: "acct_1" } }),
}))

let mountCount = 0

/** Counts its own mounts, so a remount of the provider's children is visible to an assertion. */
function MountCounter() {
  useEffect(() => {
    mountCount += 1
  }, [])

  return <span data-testid="mount-counter" />
}

function renderProvider(amount: number) {
  return render(
    <RegistrationStripeProvider paymentAccountUniqueId="account-1" amount={amount} currencyCode="USD">
      <MountCounter />
      <input aria-label="Buyer email" defaultValue="" />
    </RegistrationStripeProvider>,
  )
}

describe("RegistrationStripeProvider", () => {
  beforeEach(() => {
    mountCount = 0
    elementsOptions.latest = null
  })

  /**
   * The buyer types their details before the cart is priced. Rebuilding the Elements group at that
   * moment would unmount the form under the caret.
   */
  it("Price_ArrivesWhileTheBuyerIsTyping_KeepsTheFormMountedAndFocused", () => {
    const { rerender } = renderProvider(0)

    const email = screen.getByLabelText<HTMLInputElement>("Buyer email")
    email.focus()

    rerender(
      <RegistrationStripeProvider paymentAccountUniqueId="account-1" amount={242.38} currencyCode="USD">
        <MountCounter />
        <input aria-label="Buyer email" defaultValue="" />
      </RegistrationStripeProvider>,
    )

    expect(document.activeElement).toBe(screen.getByLabelText("Buyer email"))
    expect(mountCount).toBe(1)
  })

  it("Price_Arrives_UpdatesTheElementsAmountInPlace", () => {
    const { rerender } = renderProvider(0)

    expect(elementsOptions.latest).toMatchObject({ mode: "payment", currency: "usd", amount: 100 })

    rerender(
      <RegistrationStripeProvider paymentAccountUniqueId="account-1" amount={242.38} currencyCode="USD">
        <MountCounter />
      </RegistrationStripeProvider>,
    )

    expect(elementsOptions.latest).toMatchObject({ amount: 24238 })
  })

  it("EventWithNoPaymentAccountCurrency_RendersNoElementsOptions", () => {
    render(
      <RegistrationStripeProvider paymentAccountUniqueId={null} amount={0} currencyCode={null}>
        <MountCounter />
      </RegistrationStripeProvider>,
    )

    expect(elementsOptions.latest).toBeNull()
  })
})
