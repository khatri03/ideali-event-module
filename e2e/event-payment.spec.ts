import { expect, test } from "@playwright/test"
import { confirmPurchase, enterCardDetails, reachPaymentStep } from "./registrationFlow"

/**
 * Completes a real card payment against Stripe test mode: fills Stripe's hosted card fields on the
 * payment step, then confirms, which mints the PaymentIntent and charges it. The webhook is
 * authoritative for settlement, so the client-side confirm only reports the payment as received.
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
  await enterCardDetails(page, TEST_CARD)

  // No PaymentIntent may exist until the buyer commits.
  expect(intentCalls).toEqual([])

  // Confirming the review mints the PaymentIntent and charges it.
  await confirmPurchase(page)

  await expect
    .poll(() => intentCalls.length, { timeout: 45_000, message: "no PaymentIntent was created" })
    .toBeGreaterThan(0)
  expect(intentCalls.every((status) => status === 200)).toBe(true)

  // Stripe confirms, then the client reports back. The webhook does the real settlement.
  await expect
    .poll(() => confirmCalls.length, { timeout: 90_000, message: "checkout/confirm was never called" })
    .toBeGreaterThan(0)
  expect(confirmCalls.every((status) => status === 200)).toBe(true)

  await expect(page.getByText(/Payment (complete|received)/i)).toBeVisible({ timeout: 30_000 })
})
