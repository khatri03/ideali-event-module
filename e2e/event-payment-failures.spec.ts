import { expect, test } from "@playwright/test"
import {
  advanceToPaymentStep,
  confirmPurchase,
  enterBuyerDetails,
  goToSessions,
  payWithCard,
  reachPaymentStep,
  selectFirstTicket,
} from "./registrationFlow"


/**
 * The unhappy paths. A registration that takes money is only trustworthy if the ways it can fail are
 * as well understood as the way it succeeds, so these cover a hard decline, an authentication
 * challenge, and the client-side gate in front of the purchase.
 */

/** Stripe test cards for the outcomes we care about. */
const DECLINED_CARD = { number: "4000000000000002", expiry: "1234", cvc: "123" }
const AUTHENTICATION_CARD = { number: "4000002500003155", expiry: "1234", cvc: "123" }

test("a declined card is reported and does not settle the order", async ({ page }) => {
  const confirmCalls: number[] = []
  page.on("response", (response) => {
    if (response.request().method() === "POST" && response.url().endsWith("/checkout/confirm")) {
      confirmCalls.push(response.status())
    }
  })

  await reachPaymentStep(page, "playwright.declined@example.com")
  await confirmPurchase(page)
  await payWithCard(page, DECLINED_CARD)

  // Stripe rejects the charge and the wizard has to surface it rather than appear to succeed.
  await expect(page.getByText(/declined/i).first()).toBeVisible({ timeout: 45_000 })
  await expect(page.getByText(/Payment (complete|received)/i)).toHaveCount(0)

  // Nothing may be reported as settled to the backend on a decline.
  expect(confirmCalls).toEqual([])

  // The buyer must be able to try again rather than be stranded.
  await expect(page.getByRole("button", { name: /^Pay now$/i })).toBeEnabled({ timeout: 30_000 })
})

test("a card that requires authentication completes after the challenge", async ({ page }) => {
  const confirmCalls: number[] = []
  page.on("response", (response) => {
    if (response.request().method() === "POST" && response.url().endsWith("/checkout/confirm")) {
      confirmCalls.push(response.status())
    }
  })

  await reachPaymentStep(page, "playwright.threeds@example.com")
  await confirmPurchase(page)
  await payWithCard(page, AUTHENTICATION_CARD)

  // Stripe renders the 3DS challenge in its own nested frame, where the approve action is "COMPLETE".
  // The button is invoked directly - a synthetic click into the nested frame does not land.
  await expect
    .poll(
      async () => {
        for (const frame of page.frames()) {
          const button = frame.getByRole("button", { name: /^complete$/i })
          if (!(await button.count().catch(() => 0))) continue

          await button
            .first()
            .evaluate((node) => (node as HTMLElement).click())
            .catch(() => undefined)
          return true
        }
        return false
      },
      { timeout: 60_000, message: "the 3DS challenge never appeared" },
    )
    .toBe(true)

  await expect
    .poll(() => confirmCalls.length, { timeout: 90_000, message: "checkout/confirm was never called" })
    .toBeGreaterThan(0)
  expect(confirmCalls.every((status) => status === 200)).toBe(true)
  await expect(page.getByText(/Payment (complete|received)/i)).toBeVisible({ timeout: 30_000 })
})

test("the purchase cannot be confirmed until the terms are accepted", async ({ page }) => {
  const intentCalls: number[] = []
  page.on("response", (response) => {
    if (response.request().method() === "POST" && response.url().endsWith("/checkout/intent")) {
      intentCalls.push(response.status())
    }
  })

  // Deliberately skips acceptTerms.
  await goToSessions(page)
  await selectFirstTicket(page)
  await enterBuyerDetails(page, "playwright.noterms@example.com")
  await advanceToPaymentStep(page)

  await page.getByRole("button", { name: /Review Purchase/i }).click()

  // The review dialog must not open, so there is no way to reach Confirm Purchase.
  await expect(page.getByRole("button", { name: /Confirm Purchase/i })).toHaveCount(0)

  // No PaymentIntent may be minted while a required gate is unmet.
  await page.waitForTimeout(3_000)
  expect(intentCalls).toEqual([])
})
