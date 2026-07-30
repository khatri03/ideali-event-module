import { expect, test } from "@playwright/test"
import { confirmPurchase, payWithCard, reachPaymentStep } from "./registrationFlow"

/**
 * Completes a real card payment against Stripe test mode: reviews the purchase, lets the server
 * mint a PaymentIntent, fills Stripe's hosted card fields and confirms. The webhook is authoritative
 * for settlement, so the client-side confirm is only expected to report the payment as received.
 */

/** Stripe's standard test card. */
const TEST_CARD = { number: "4242424242424242", expiry: "1234", cvc: "123" }

test("a card payment is created, confirmed with Stripe, and reported back", async ({ page }) => {
  const intentCalls: number[] = []
  const confirmCalls: number[] = []
  page.on("response", (response) => {
    if (response.request().method() !== "POST") return
    const url = response.url()
    if (url.endsWith("/checkout/intent")) intentCalls.push(response.status())
    else if (url.endsWith("/checkout/confirm")) confirmCalls.push(response.status())
  })

  await reachPaymentStep(page, "playwright.payer@example.com")

  // Confirming the review is what asks the server for a PaymentIntent.
  await confirmPurchase(page)

  await expect
    .poll(() => intentCalls.length, { timeout: 45_000, message: "no PaymentIntent was created" })
    .toBeGreaterThan(0)
  expect(intentCalls.every((status) => status === 200)).toBe(true)

  await payWithCard(page, TEST_CARD)

  // Stripe confirms, then the client reports back. The webhook does the real settlement.
  await expect
    .poll(() => confirmCalls.length, { timeout: 90_000, message: "checkout/confirm was never called" })
    .toBeGreaterThan(0)
  expect(confirmCalls.every((status) => status === 200)).toBe(true)

  await expect(page.getByText(/Payment (complete|received)/i)).toBeVisible({ timeout: 30_000 })
})
