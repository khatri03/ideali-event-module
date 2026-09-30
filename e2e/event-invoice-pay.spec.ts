import { expect, test, type Page } from "@playwright/test"
import { fillStripeField, hideStripeDeveloperTools } from "./registrationFlow"
import { findHorizontalPageOverflow, findUndersizedTargets, MIN_TOUCH_TARGET_PX } from "./responsiveChecks"

/**
 * The buyer pay page for a custom invoice (PAY-01, PAY-02), opened anonymously from the link an organizer
 * shares. Layout and terminal states run against mocked API responses with Stripe.js blocked, because the
 * check is about what the buyer sees; the one live payment runs only when a real payable invoice is named.
 */

const WIDTHS = [320, 375, 768, 1024, 1440, 1920] as const
const TERMINAL_STATE_WIDTHS = [375, 1440] as const
const SCREENSHOT_WIDTHS: readonly number[] = [375, 1440]
const VIEWPORT_HEIGHT = 900
const SCREENSHOT_DIR = ".planning/phases/04-collect-payment-settle/screenshots"

const INVOICE_ID = "c0000000-0000-4000-8000-000000000300"
const payPath = (invoiceUniqueId: string) => `/events/invoices/${invoiceUniqueId}/pay`
const PAY_API = `**/api/events/invoices/${INVOICE_ID}/pay`
const CREDENTIALS_API = "**/api/public/stripe/*/credentials"

type Json = Record<string, unknown>

/** Wraps a payload the way every API response arrives, so the Zod boundary parses it as it would in production. */
function envelope(data: unknown) {
  return { success: true, message: null, timestamp: "2026-09-30T10:00:00Z", data }
}

/** A payable sponsorship invoice whose first line is long enough to wrap at every phone width. */
function paySummary(overrides: Json = {}): Json {
  return {
    invoiceNo: "INV-C-300",
    eventName: "Annual Convention 2026",
    payState: "Payable",
    currencyCode: "USD",
    outstandingAmount: 1750.5,
    paymentAccountUniqueId: "account-1",
    lineItems: [
      {
        description:
          "Gold sponsorship package including stage branding, twelve reserved seats, a full-page programme advert and logo placement on every attendee badge",
        amount: 1500,
      },
      { description: "Exhibitor table", amount: 250.5 },
    ],
    ...overrides,
  }
}

/**
 * Mocks every API call the public page makes. An unmatched call gets a 404 rather than reaching a backend,
 * and Stripe.js is blocked so only the page's own layout is measured.
 */
async function mockPayPage(page: Page, summary: Json | null) {
  // Matched on the path prefix: a glob like **/api/** would also swallow Vite's /src/api/*.ts modules.
  await page.route((url) => url.pathname.startsWith("/api/"), (route) => route.fulfill({ status: 404, json: { title: "Not mocked", status: 404 } }))
  await page.route(PAY_API, (route) =>
    summary
      ? route.fulfill({ json: envelope(summary) })
      : route.fulfill({ status: 404, json: { title: "Not found", status: 404 } }),
  )
  await page.route(CREDENTIALS_API, (route) =>
    route.fulfill({ json: envelope({ publishableKey: "pk_test_layout_only", stripeAccount: "acct_layout" }) }),
  )
  await page.route("https://js.stripe.com/**", (route) => route.abort())
}

async function openPayPage(page: Page, width: number, invoiceUniqueId = INVOICE_ID) {
  await page.setViewportSize({ width, height: VIEWPORT_HEIGHT })
  await page.goto(payPath(invoiceUniqueId))
}

const cardHolderField = (page: Page) => page.getByRole("textbox", { name: "Name on card" })
const payButton = (page: Page) => page.getByRole("button", { name: /^Pay / })

for (const width of WIDTHS) {
  /**
   * A buyer opens the link on whatever device the email reached. At every width the page must not slide
   * sideways, the long billed line must wrap, and the name field and Pay button must be reachable and big
   * enough for a fingertip.
   */
  test(`the payable invoice lays out without overflow and with full-size controls at ${width}px`, async ({ page }) => {
    await mockPayPage(page, paySummary())
    await openPayPage(page, width)

    await expect(page.getByText("INV-C-300")).toBeVisible({ timeout: 30_000 })
    await expect(cardHolderField(page)).toBeVisible()
    await expect(payButton(page)).toBeVisible()

    expect.soft(await findHorizontalPageOverflow(page), "the pay page scrolls sideways").toEqual([])
    const undersized = await findUndersizedTargets(page.locator("body"), false)
    expect.soft(undersized, `controls under ${MIN_TOUCH_TARGET_PX}px on the pay page at ${width}px`).toEqual([])

    if (SCREENSHOT_WIDTHS.includes(width)) {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/04-07-pay-page-payable-${width}.png`, fullPage: true })
    }
  })
}

const TERMINAL_STATES: { name: string; summary: Json | null; heading: string; screenshot?: string }[] = [
  { name: "paid", summary: paySummary({ payState: "Paid", paymentAccountUniqueId: null }), heading: "This invoice is paid", screenshot: "paid" },
  { name: "cancelled", summary: paySummary({ payState: "Cancelled", paymentAccountUniqueId: null }), heading: "This invoice was cancelled" },
  { name: "unavailable", summary: paySummary({ payState: "Unavailable", paymentAccountUniqueId: null }), heading: "Online payment isn't available" },
  { name: "unknown", summary: null, heading: "We couldn't find this invoice" },
]

for (const width of TERMINAL_STATE_WIDTHS) {
  /**
   * D-G1: an invoice that cannot be paid online must say why in plain words and never offer a card form,
   * or a buyer could be charged for a settled, void or unknown invoice.
   */
  test(`paid, cancelled, unavailable and unknown invoices show their state and no card form at ${width}px`, async ({ page }) => {
    for (const state of TERMINAL_STATES) {
      await page.unrouteAll({ behavior: "ignoreErrors" })
      await mockPayPage(page, state.summary)
      await openPayPage(page, width)

      await expect(page.getByRole("heading", { name: state.heading }), `${state.name} heading`).toBeVisible({ timeout: 30_000 })
      await expect(cardHolderField(page), `${state.name} shows no card form`).toHaveCount(0)
      expect.soft(await findHorizontalPageOverflow(page), `the ${state.name} state scrolls sideways`).toEqual([])

      if (state.screenshot) {
        await page.screenshot({ path: `${SCREENSHOT_DIR}/04-07-pay-page-${state.screenshot}-${width}.png`, fullPage: true })
      }
    }
  })
}

const LIVE_INVOICE_ID = process.env.E2E_PAYABLE_INVOICE_ID ?? ""

/** Enters a Stripe test card into the live Payment Element and submits the pay form. */
async function payWithCard(page: Page, cardNumber: string) {
  await expect
    .poll(async () => await fillStripeField(page, /card number/i, cardNumber), {
      timeout: 45_000,
      message: "the Stripe Payment Element never mounted",
    })
    .toBe(true)
  await fillStripeField(page, /expiration date|expiry/i, "12 / 34")
  await fillStripeField(page, /security code|CVC|CVV/i, "123")
  // The Payment Element only asks for a postal code when the account's country requires one.
  await fillStripeField(page, /postal code|ZIP/i, "M5H 2N2")
  await payButton(page).click()
}

/**
 * D-G2 end to end against the running API in Stripe test mode: a declined card shows Stripe's reason and
 * leaves the invoice payable on the same page, and a good card then pays it. Skipped unless
 * E2E_PAYABLE_INVOICE_ID names a Payable custom invoice, because a successful run spends that invoice.
 */
test("a declined card can be retried on the same page and a good card then pays the invoice", async ({ page }) => {
  test.skip(!LIVE_INVOICE_ID, "Set E2E_PAYABLE_INVOICE_ID to a Payable custom invoice to run the live payment.")

  await openPayPage(page, 1440, LIVE_INVOICE_ID)
  await hideStripeDeveloperTools(page)
  await cardHolderField(page).fill("Playwright Payer")

  await payWithCard(page, "4000 0000 0000 0002")
  await expect(page.getByRole("alert")).toContainText(/declined/i, { timeout: 60_000 })

  await payWithCard(page, "4242 4242 4242 4242")
  await expect(page.getByRole("heading", { name: "Payment received" })).toBeVisible({ timeout: 60_000 })
})
