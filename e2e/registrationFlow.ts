import { expect, type Page } from "@playwright/test"

/** Shared drive-the-wizard steps, so each spec only expresses what it is actually asserting. */

export const EVENT_UNIQUE_ID = "d1e9ef9e-3ff0-4542-9869-629fda7afb8a"
export const REGISTER_PATH = `/events/${EVENT_UNIQUE_ID}/register`

/**
 * Stripe.js floats a developer tools frame over the page when it runs against test keys. Buyers
 * never see it, but it covers the wizard footer and swallows clicks meant for the primary action.
 */
async function hideStripeDeveloperTools(page: Page) {
  await page.addStyleTag({
    content:
      'iframe[title="Stripe developer tools frame"] { pointer-events: none !important; visibility: hidden !important; width: 0 !important; height: 0 !important; }',
  })
}

/** The wizard opens on Description; Sessions is the next step. */
export async function goToSessions(page: Page) {
  await page.goto(REGISTER_PATH)
  await expect(page.getByRole("heading", { name: /APPNA/i }).first()).toBeVisible({ timeout: 30_000 })
  await hideStripeDeveloperTools(page)

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

/**
 * The Payment Element lives in a cross-origin iframe and exposes aria-labels rather than
 * placeholders, so fields are matched on their accessible name across every frame on the page.
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

/**
 * Card details are collected on the payment step itself, before any PaymentIntent exists - picking
 * the card method is all it takes to mount the Payment Element.
 */
export async function enterCardDetails(page: Page, card: { number: string; expiry: string; cvc: string }) {
  await page.getByRole("button", { name: /Debit\/Credit Card/i }).first().click()

  await expect
    .poll(async () => await fillStripeField(page, /card number/i, card.number), {
      timeout: 45_000,
      message: "the Stripe Payment Element never mounted",
    })
    .toBe(true)

  await fillStripeField(page, /expiration date|expiry/i, card.expiry)
  await fillStripeField(page, /security code|CVC|CVV/i, card.cvc)

  // The Payment Element only asks for a postal code when the account's country requires one.
  await fillStripeField(page, /postal code|ZIP/i, "M5H 2N2")

  // The name is collected outside the Element, so it is an ordinary input on the page.
  await page.getByPlaceholder(/Enter cardholder name/i).fill("Playwright Payer")
}

/** Opens the review dialog and confirms, which mints the PaymentIntent and charges it in one go. */
export async function confirmPurchase(page: Page) {
  await page.getByRole("button", { name: /Review Purchase/i }).click()
  const confirmButton = page.getByRole("button", { name: /Confirm (Purchase|& Pay)/i })
  await expect(confirmButton).toBeVisible({ timeout: 30_000 })
  await confirmButton.click()
}

/** Runs the wizard from a cold page load up to a filled-in, ready-to-pay card form. */
export async function reachPaymentStep(page: Page, email?: string) {
  await goToSessions(page)
  await selectFirstTicket(page)
  await enterBuyerDetails(page, email)
  await acceptTerms(page)
  await advanceToPaymentStep(page)
}
