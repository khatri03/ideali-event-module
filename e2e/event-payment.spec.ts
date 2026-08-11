import { expect, test, type Page } from "@playwright/test"
import { confirmPurchase, enterCardDetails, reachPaymentStep } from "./registrationFlow"

/**
 * Completes a real card payment against Stripe test mode: fills Stripe's hosted card fields on the
 * payment step, then confirms, which mints the PaymentIntent and charges it. The webhook is
 * authoritative for settlement, so the client-side confirm only reports the payment as received.
 */

/** Stripe's standard test card. */
const TEST_CARD = { number: "4242424242424242", expiry: "1234", cvc: "123" }

async function expectCompletionDialogCentered(page: Page) {
  const viewport = page.viewportSize()
  expect(viewport).not.toBeNull()

  const dialog = page.getByTestId("order-next-step-dialog-content")
  await expect(dialog).toBeVisible({ timeout: 30_000 })

  const box = await dialog.boundingBox()
  expect(box).not.toBeNull()

  const horizontalDrift = Math.abs(box!.x + box!.width / 2 - viewport!.width / 2)
  const verticalDrift = Math.abs(box!.y + box!.height / 2 - viewport!.height / 2)

  expect(horizontalDrift).toBeLessThanOrEqual(8)
  expect(verticalDrift).toBeLessThanOrEqual(8)
}

test("a card payment is created, confirmed with Stripe, and reported back", async ({ page }) => {
  await page.setViewportSize({ width: 641, height: 1234 })

  const intentCalls: number[] = []
  const confirmCalls: number[] = []
  const intentPayloads: unknown[] = []

  page.on("request", (request) => {
    if (request.method() !== "POST" || !request.url().endsWith("/checkout/intent")) return
    intentPayloads.push(request.postDataJSON())
  })

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
  await confirmPurchase(page, "  Please seat our group together.  ")

  await expect
    .poll(() => intentCalls.length, { timeout: 45_000, message: "no PaymentIntent was created" })
    .toBeGreaterThan(0)
  expect(intentCalls.every((status) => status === 200)).toBe(true)
  expect(intentPayloads).toContainEqual(expect.objectContaining({ invoiceNote: "Please seat our group together." }))

  // Stripe confirms, then the client reports back. The webhook does the real settlement.
  await expect
    .poll(() => confirmCalls.length, { timeout: 90_000, message: "checkout/confirm was never called" })
    .toBeGreaterThan(0)
  expect(confirmCalls.every((status) => status === 200)).toBe(true)

  await expectCompletionDialogCentered(page)
})
