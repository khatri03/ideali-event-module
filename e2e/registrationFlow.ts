import { expect, type Page } from "@playwright/test"

/** Shared drive-the-wizard steps, so each spec only expresses what it is actually asserting. */

export const EVENT_UNIQUE_ID = "A974BD36-29A8-47E8-9C00-6754FB83031B"
export const REGISTER_PATH = `/events/${EVENT_UNIQUE_ID}/register`

/** The wizard opens on Description; Sessions is the next step. */
export async function goToSessions(page: Page) {
  await page.goto(REGISTER_PATH)
  await expect(page.getByRole("heading", { name: /APPNA/i }).first()).toBeVisible({ timeout: 30_000 })

  await page.getByRole("button", { name: /^Continue$/ }).click()
  await expect(page.getByText(/Friday Dinner/i).first()).toBeVisible({ timeout: 30_000 })
}

export async function selectFirstTicket(page: Page) {
  const quantitySelect = page.getByRole("combobox").first()
  await quantitySelect.waitFor({ state: "visible", timeout: 30_000 })
  await quantitySelect.selectOption("1")
}

/** The server refuses to open a cart without a buyer, so filling these is what creates it. */
export async function enterBuyerDetails(page: Page, email = "playwright.buyer@example.com") {
  await page.getByRole("button", { name: /^Continue$/ }).click()

  const firstNames = page.getByRole("textbox", { name: /^First name$/i })
  const lastNames = page.getByRole("textbox", { name: /^Last name$/i })
  const emails = page.getByRole("textbox", { name: /^Email$/i })

  await firstNames.first().fill("Playwright")
  await lastNames.first().fill("Buyer")
  await emails.first().fill(email)

  for (let index = 1; index < (await firstNames.count()); index += 1) {
    await firstNames.nth(index).fill(`Attendee${index}`)
    await lastNames.nth(index).fill("Guest")
    await emails.nth(index).fill(`attendee${index}@example.com`)
  }
}

/** Chakra renders a styled control over the real input, so the label is what can be clicked. */
export async function acceptTerms(page: Page) {
  const termsLabel = page.getByText(/I accept the registration terms and conditions/i).first()
  if (await termsLabel.isVisible().catch(() => false)) {
    await termsLabel.click()
  }
}

export async function advanceToPaymentStep(page: Page) {
  for (let step = 0; step < 5; step += 1) {
    if (await page.getByText(/Select payment method/i).isVisible().catch(() => false)) break
    const next = page.getByRole("button", { name: /^Continue$/ })
    if (!(await next.isVisible().catch(() => false))) break
    await next.click()
    await page.waitForTimeout(800)
  }

  await expect(page.getByText(/Select payment method/i)).toBeVisible({ timeout: 30_000 })
}

/** Opens the review dialog and confirms, which is what asks the server for a PaymentIntent. */
export async function confirmPurchase(page: Page) {
  await page.getByRole("button", { name: /Review Purchase/i }).click()
  const confirmButton = page.getByRole("button", { name: /Confirm Purchase/i })
  await expect(confirmButton).toBeVisible({ timeout: 30_000 })
  await confirmButton.click()
}

/**
 * Each Stripe Element lives in its own cross-origin iframe and exposes an aria-label rather than a
 * placeholder, so fields are matched on their accessible name.
 */
export async function fillStripeField(page: Page, namePattern: RegExp, value: string) {
  for (const frame of page.frames()) {
    const field = frame.getByRole("textbox", { name: namePattern })
    if (await field.count().catch(() => 0)) {
      await field.first().fill(value)
      return true
    }
  }
  return false
}

export async function payWithCard(page: Page, card: { number: string; expiry: string; cvc: string }) {
  const cardMethod = page.getByRole("button", { name: /Debit\/Credit Card/i }).first()
  if (await cardMethod.isVisible().catch(() => false)) {
    await cardMethod.click()
  }

  await expect
    .poll(async () => await fillStripeField(page, /card number/i, card.number), {
      timeout: 45_000,
      message: "Stripe card number field never mounted",
    })
    .toBe(true)

  await fillStripeField(page, /expiration date/i, card.expiry)
  await fillStripeField(page, /CVC/i, card.cvc)

  await page.getByPlaceholder(/Enter cardholder name/i).fill("Playwright Payer")

  // The sticky summary bar overlays the bottom of the page and swallows the click even when the
  // button is scrolled into view, so the button is invoked directly.
  const payButton = page.getByRole("button", { name: /^Pay now$/i })
  await payButton.scrollIntoViewIfNeeded()
  await payButton.evaluate((node) => (node as HTMLButtonElement).click())
}

/** Runs the wizard from a cold page load up to a filled-in, ready-to-pay card form. */
export async function reachPaymentStep(page: Page, email?: string) {
  await goToSessions(page)
  await selectFirstTicket(page)
  await enterBuyerDetails(page, email)
  await acceptTerms(page)
  await advanceToPaymentStep(page)
}
