import { expect, test, type Page } from "@playwright/test"

/**
 * Completes a real card payment against Stripe test mode: reviews the purchase, lets the server
 * mint a PaymentIntent, fills Stripe's hosted card fields and confirms. The webhook is authoritative
 * for settlement, so the client-side confirm is only expected to report the payment as received.
 */

const EVENT_UNIQUE_ID = "A974BD36-29A8-47E8-9C00-6754FB83031B"
const REGISTER_PATH = `/events/${EVENT_UNIQUE_ID}/register`

/** Stripe's standard test card. */
const TEST_CARD = { number: "4242424242424242", expiry: "1234", cvc: "123" }

async function fillStripeField(page: Page, namePattern: RegExp, value: string) {
  // Each Stripe Element lives in its own cross-origin iframe and exposes an aria-label, not a
  // placeholder, so match on the accessible name.
  for (const frame of page.frames()) {
    const field = frame.getByRole("textbox", { name: namePattern })
    if (await field.count().catch(() => 0)) {
      await field.first().fill(value)
      return true
    }
  }
  return false
}

test("a card payment is created, confirmed with Stripe, and reported back", async ({ page }) => {
  const intentCalls: number[] = []
  const confirmCalls: number[] = []
  page.on("response", (response) => {
    if (response.request().method() !== "POST") return
    const url = response.url()
    if (url.endsWith("/checkout/intent")) intentCalls.push(response.status())
    else if (url.endsWith("/checkout/confirm")) confirmCalls.push(response.status())
  })

  await page.goto(REGISTER_PATH)
  await expect(page.getByRole("heading", { name: /APPNA/i }).first()).toBeVisible({ timeout: 30_000 })

  // Description -> Sessions
  await page.getByRole("button", { name: /^Continue$/ }).click()
  await expect(page.getByText(/Friday Dinner/i).first()).toBeVisible({ timeout: 30_000 })

  await page.getByRole("combobox").first().selectOption("1")

  // Sessions -> Buyer/Attendee info
  await page.getByRole("button", { name: /^Continue$/ }).click()

  const firstNames = page.getByRole("textbox", { name: /^First name$/i })
  const lastNames = page.getByRole("textbox", { name: /^Last name$/i })
  const emails = page.getByRole("textbox", { name: /^Email$/i })

  await firstNames.first().fill("Playwright")
  await lastNames.first().fill("Payer")
  await emails.first().fill("playwright.payer@example.com")

  for (let index = 1; index < (await firstNames.count()); index += 1) {
    await firstNames.nth(index).fill(`Attendee${index}`)
    await lastNames.nth(index).fill("Guest")
    await emails.nth(index).fill(`attendee${index}@example.com`)
  }

  // Accept terms so the purchase review is not blocked.
  // Chakra renders a styled control over the real input, so click the label text.
  const termsLabel = page.getByText(/I accept the registration terms and conditions/i).first()
  if (await termsLabel.isVisible().catch(() => false)) {
    await termsLabel.click()
  }

  // Advance to the payment step.
  for (let step = 0; step < 5; step += 1) {
    if (await page.getByText(/Select payment method/i).isVisible().catch(() => false)) break
    const next = page.getByRole("button", { name: /^Continue$/ })
    if (!(await next.isVisible().catch(() => false))) break
    await next.click()
    await page.waitForTimeout(800)
  }

  await expect(page.getByText(/Select payment method/i)).toBeVisible({ timeout: 30_000 })

  // Open the purchase review and confirm, which is what asks the server for a PaymentIntent.
  await page.getByRole("button", { name: /Review Purchase/i }).click()
  const confirmButton = page.getByRole("button", { name: /Confirm Purchase/i })
  await expect(confirmButton).toBeVisible({ timeout: 30_000 })
  await confirmButton.click()

  await expect
    .poll(() => intentCalls.length, { timeout: 45_000, message: "no PaymentIntent was created" })
    .toBeGreaterThan(0)
  expect(intentCalls.every((status) => status === 200)).toBe(true)

  // Stripe's card fields mount from the intent's client secret.
  const cardMethod = page.getByRole("button", { name: /Debit\/Credit Card/i }).first()
  if (await cardMethod.isVisible().catch(() => false)) {
    await cardMethod.click()
  }

  await expect
    .poll(async () => await fillStripeField(page, /card number/i, TEST_CARD.number), {
      timeout: 45_000,
      message: "Stripe card number field never mounted",
    })
    .toBe(true)

  await fillStripeField(page, /expiration date/i, TEST_CARD.expiry)
  await fillStripeField(page, /CVC/i, TEST_CARD.cvc)

  await page.getByPlaceholder(/Enter cardholder name/i).fill("Playwright Payer")
  await page.getByRole("button", { name: /^Pay now$/i }).click()

  // Stripe confirms, then the client reports back. The webhook does the real settlement.
  await expect
    .poll(() => confirmCalls.length, { timeout: 90_000, message: "checkout/confirm was never called" })
    .toBeGreaterThan(0)
  expect(confirmCalls.every((status) => status === 200)).toBe(true)

  await expect(page.getByText(/Payment (complete|received)/i)).toBeVisible({ timeout: 30_000 })
})
