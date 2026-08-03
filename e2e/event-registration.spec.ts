import { expect, test, type Page } from "@playwright/test"

import { REGISTER_PATH } from "./registrationFlow"

/**
 * Drives the rewritten registration wizard against a running API. Verifies the parts only a real
 * browser can prove: the server opening and pricing the cart, the countdown running against the
 * cart's own deadline, and the payment step rendering charges the client never computed.
 */

/** The wizard opens on Description; Sessions is the next step. */
async function goToSessions(page: Page) {
  await page.goto(REGISTER_PATH)
  await expect(page.getByRole("heading", { name: /APPNA/i }).first()).toBeVisible({ timeout: 30_000 })

  const sessionsTab = page.getByRole("tab", { name: /Sessions/i })
  if (await sessionsTab.isEnabled().catch(() => false)) {
    await sessionsTab.click()
  } else {
    await page.getByRole("button", { name: /^Continue$/ }).click()
  }

  await expect(page.getByText(/Friday Dinner/i).first()).toBeVisible({ timeout: 30_000 })
}

async function selectFirstTicket(page: Page) {
  const quantitySelect = page.getByRole("combobox").first()
  await quantitySelect.waitFor({ state: "visible", timeout: 30_000 })
  await quantitySelect.selectOption("1")
}

/**
 * The server will not open a cart without a buyer, so the wizard hands over name and email as soon
 * as they are filled in. This is what actually triggers cart creation.
 */
async function enterBuyerDetails(page: Page) {
  // Steps unlock in order, so advance with Continue rather than clicking a gated tab.
  await page.getByRole("button", { name: /^Continue$/ }).click()
  await expect(page.getByRole("tab", { name: /Buyer\/Attendee info/i })).toHaveAttribute(
    "data-selected",
    "",
    { timeout: 30_000 },
  )

  await page.getByRole("textbox", { name: /^First name$/i }).first().fill("Playwright")
  await page.getByRole("textbox", { name: /^Last name$/i }).first().fill("Buyer")
  await page.getByRole("textbox", { name: /^Email$/i }).first().fill("playwright.buyer@example.com")

  // Sessions that require attendee details render their own contact fields; fill every one so the
  // step can advance.
  const firstNames = page.getByRole("textbox", { name: /^First name$/i })
  const lastNames = page.getByRole("textbox", { name: /^Last name$/i })
  const emails = page.getByRole("textbox", { name: /^Email$/i })

  for (let index = 1; index < (await firstNames.count()); index += 1) {
    await firstNames.nth(index).fill(`Attendee${index}`)
    await lastNames.nth(index).fill("Guest")
    await emails.nth(index).fill(`attendee${index}@example.com`)
  }
}

test("registration page renders the event and reaches the sessions step", async ({ page }) => {
  await goToSessions(page)
  await expect(page.getByRole("combobox").first()).toBeVisible()
})

test("entering buyer details opens the server cart, prices it, and starts the countdown", async ({ page }) => {
  const cartCalls: number[] = []
  const priceCalls: number[] = []
  page.on("response", (response) => {
    if (response.request().method() !== "POST") return
    const url = response.url()
    if (url.endsWith("/price")) priceCalls.push(response.status())
    else if (url.endsWith("/api/events/cart")) cartCalls.push(response.status())
  })

  await goToSessions(page)
  await selectFirstTicket(page)
  await enterBuyerDetails(page)

  await expect
    .poll(() => cartCalls.length, { timeout: 30_000, message: "no cart was created" })
    .toBeGreaterThan(0)
  await expect
    .poll(() => priceCalls.length, { timeout: 30_000, message: "cart was never priced" })
    .toBeGreaterThan(0)
  expect(cartCalls.every((status) => status === 200)).toBe(true)
  expect(priceCalls.every((status) => status === 200)).toBe(true)

  // The countdown appears only once the server has issued a hold deadline.
  const timer = page.getByRole("status")
  await expect(timer).toBeVisible({ timeout: 30_000 })

  const firstReading = (await timer.innerText()).trim()
  expect(firstReading).toMatch(/^\d{2}:\d{2}(:\d{2})?$/)

  // It must tick against the server deadline, not sit frozen.
  await expect
    .poll(async () => (await timer.innerText()).trim(), {
      timeout: 20_000,
      message: "countdown never advanced",
    })
    .not.toBe(firstReading)
})

test("payment step renders the server-priced breakdown", async ({ page }) => {
  await goToSessions(page)
  await selectFirstTicket(page)
  await enterBuyerDetails(page)

  // Pricing happens as soon as the cart opens; wait for the summary to leave zero.
  await expect
    .poll(async () => await page.getByText(/CAD\$0\.00/).count(), {
      timeout: 30_000,
      message: "cart was never priced",
    })
    .toBe(0)

  // Advance through any remaining steps until the payment step is on screen.
  for (let step = 0; step < 5; step += 1) {
    if (await page.getByText(/Select payment method/i).isVisible().catch(() => false)) break
    const continueButton = page.getByRole("button", { name: /^Continue$/ })
    if (!(await continueButton.isVisible().catch(() => false))) break
    await continueButton.click()
    await page.waitForTimeout(800)
  }

  await expect(page.getByText(/Select payment method/i)).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/Total payable/i)).toBeVisible({ timeout: 30_000 })

  // This charge line exists only because the server priced it - the client never computes charges.
  await expect(page.getByText(/Third Charge Rule/i).first()).toBeVisible({ timeout: 30_000 })
})
