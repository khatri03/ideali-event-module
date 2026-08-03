import { expect, test, type Page } from "@playwright/test"
import { confirmPurchase, enterBuyerDetails, goToSessions, enterCardDetails, reachPaymentStep, selectFirstTicket } from "./registrationFlow"

/**
 * Proves the cart survives a page refresh. Before this the cart id lived only in React state, so a
 * refresh orphaned a server cart that kept holding stock the buyer could no longer reach or release.
 */

const CART_COOKIE_NAME = "ideali_event_cart"
const CART_COOKIE_PATH = "/events"
const TEST_CARD = { number: "4242424242424242", expiry: "1234", cvc: "123" }
const TIMER_NAME = /tickets are held|running out|time limit reached/i

async function readCartCookie(page: Page) {
  const cookies = await page.context().cookies()
  return cookies.find((cookie) => cookie.name === CART_COOKIE_NAME) ?? null
}

function purchaseTimer(page: Page) {
  return page.getByRole("status", { name: TIMER_NAME })
}

/** Buyer details are what open the cart, so the cookie only exists once they are filled in. */
async function openCart(page: Page) {
  await goToSessions(page)
  await selectFirstTicket(page)
  await enterBuyerDetails(page)

  await expect
    .poll(async () => (await readCartCookie(page))?.value ?? null, { timeout: 30_000, message: "no cart cookie was written" })
    .not.toBeNull()
}

test.describe("registration cart persistence", () => {
  test("a refresh resumes the same cart instead of orphaning it", async ({ page }) => {
    await openCart(page)
    const before = await readCartCookie(page)

    await page.reload()

    // Same cart id, so no second cart was opened and no stock was held twice.
    await expect
      .poll(async () => (await readCartCookie(page))?.value ?? null, { timeout: 30_000 })
      .toBe(before?.value)

    // The hold is still counting down, and the selection came back with it.
    await expect(purchaseTimer(page)).toBeVisible({ timeout: 30_000 })

    // The wizard reopens on Description with the later steps still gated, so step forward the same
    // way a returning buyer would rather than clicking a locked tab.
    await page.getByRole("button", { name: /^Continue$/ }).click()
    await expect(page.getByRole("combobox").first()).toHaveValue("1", { timeout: 30_000 })
  })

  test("the cookie outlives the hold, so a late return can still be resumed", async ({ page }) => {
    await openCart(page)
    const cookie = await readCartCookie(page)

    // Mirrors PaymentGraceMinutes on the server: the cookie must not die before the hold does.
    expect(cookie?.expires).toBeGreaterThan(Date.now() / 1000)
  })

  test("a cart id the server does not recognise is dropped without an error", async ({ page }) => {
    // Set path explicitly: passing a url would scope the cookie to that url's directory, which is
    // deeper than the /events path the app writes and clears.
    await page.context().addCookies([
      {
        name: CART_COOKIE_NAME,
        value: "00000000-0000-0000-0000-000000000000",
        domain: "localhost",
        path: CART_COOKIE_PATH,
        secure: true,
        sameSite: "Lax",
      },
    ])

    await goToSessions(page)

    // A clean form: no timer because nothing was resumed, and no error banner either.
    await expect(purchaseTimer(page)).toHaveCount(0)
    await expect(page.getByText(/unexpected error|failed to/i)).toHaveCount(0)
    await expect.poll(async () => await readCartCookie(page), { timeout: 30_000 }).toBeNull()
  })

  test("a paid cart is not resumable after a refresh", async ({ page }) => {
    await reachPaymentStep(page, `playwright.persist.${Date.now()}@example.com`)
    await enterCardDetails(page, TEST_CARD)
    await confirmPurchase(page)

    await expect(page.getByText(/Payment (complete|received)/i)).toBeVisible({ timeout: 60_000 })
    await expect.poll(async () => await readCartCookie(page), { timeout: 30_000 }).toBeNull()

    await page.reload()

    await expect(purchaseTimer(page)).toHaveCount(0)
  })
})
