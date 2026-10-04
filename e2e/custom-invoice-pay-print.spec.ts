import { expect, test, type Page } from "@playwright/test"
import { findHorizontalPageOverflow, findUndersizedTargets, MIN_TOUCH_TARGET_PX } from "./responsiveChecks"

/**
 * On-demand only: Playwright never gates a commit here (see CLAUDE.md Testing); the Vitest print test is the
 * gate. This covers the one thing Vitest cannot - that at every target width the public buyer pay page lays
 * out without sideways scroll with a full-size Print control, and that print media actually hides the card
 * form and the Print button while the invoice itself stays legible.
 */

const WIDTHS = [320, 375, 768, 1024, 1440, 1920] as const
const VIEWPORT_HEIGHT = 900

const INVOICE_ID = "c0000000-0000-4000-8000-000000000300"
const payPath = (invoiceUniqueId: string) => `/custom-invoices/${invoiceUniqueId}/pay`
const PAY_API = `**/api/custom-invoices/${INVOICE_ID}/pay`
const CREDENTIALS_API = "**/api/public/stripe/*/credentials"

type Json = Record<string, unknown>

/** Wraps a payload the way every API response arrives, so the Zod boundary parses it as it would in production. */
function envelope(data: unknown) {
  return { success: true, message: null, timestamp: "2026-10-02T10:00:00Z", data }
}

/** A payable sponsorship invoice whose first line is long enough to wrap at every phone width. */
function paySummary(overrides: Json = {}): Json {
  return {
    invoiceNo: "INV-C-300",
    entityName: "Annual Convention 2026",
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

/** Mocks every API call the public page makes and blocks Stripe.js so only the page's own layout is measured. */
async function mockPayPage(page: Page, summary: Json) {
  await page.route((url) => url.pathname.startsWith("/api/"), (route) => route.fulfill({ status: 404, json: { title: "Not mocked", status: 404 } }))
  await page.route(PAY_API, (route) => route.fulfill({ json: envelope(summary) }))
  await page.route(CREDENTIALS_API, (route) =>
    route.fulfill({ json: envelope({ publishableKey: "pk_test_layout_only", stripeAccount: "acct_layout" }) }),
  )
  await page.route("https://js.stripe.com/**", (route) => route.abort())
}

const cardHolderField = (page: Page) => page.getByRole("textbox", { name: "Name on card" })
const printButton = (page: Page) => page.getByRole("button", { name: /^Print$/ })

for (const width of WIDTHS) {
  /**
   * A buyer opens the link on whatever device the email reached. At every width the page must not slide
   * sideways, the Print control must be reachable and big enough for a fingertip, and when the browser
   * switches to print media the invoice region stays visible while the card form and Print button drop.
   */
  test(`the buyer pay page prints cleanly and hides the controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: VIEWPORT_HEIGHT })
    await mockPayPage(page, paySummary())
    await page.goto(payPath(INVOICE_ID))

    await expect(page.getByText("INV-C-300")).toBeVisible({ timeout: 30_000 })
    await expect(printButton(page)).toBeVisible()

    expect.soft(await findHorizontalPageOverflow(page), "the pay page scrolls sideways").toEqual([])
    const undersized = await findUndersizedTargets(page.locator("body"), false)
    expect.soft(undersized, `controls under ${MIN_TOUCH_TARGET_PX}px on the pay page at ${width}px`).toEqual([])

    await page.emulateMedia({ media: "print" })

    await expect(page.getByText("INV-C-300")).toBeVisible()
    await expect(page.getByText("Exhibitor table")).toBeVisible()
    await expect(page.getByText("USD$1,750.50", { exact: true })).toBeVisible()
    await expect(cardHolderField(page)).toBeHidden()
    await expect(printButton(page)).toBeHidden()
  })
}
