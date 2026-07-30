import { expect, test, type Page } from "@playwright/test"
import { advanceToPaymentStep, enterBuyerDetails, goToSessions, selectFirstTicket } from "./registrationFlow"

/**
 * The registration wizard is the one screen a buyer cannot route around, so it has to hold up on a
 * phone as well as a desktop. These walk the same wizard at each breakpoint from CLAUDE.md and
 * assert the failure that actually costs a sale: the page scrolling sideways, which on a phone hides
 * whichever half of the form happens to be off to the right.
 */

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const

async function hasHorizontalOverflow(page: Page) {
  return await page.evaluate(() => {
    const { documentElement } = document
    // A single pixel of rounding slack, so sub-pixel layout maths does not read as a real break.
    return documentElement.scrollWidth - documentElement.clientWidth > 1
  })
}

for (const viewport of VIEWPORTS) {
  test(`the wizard lays out without horizontal scroll at ${viewport.width}px (${viewport.name})`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })

    await goToSessions(page)
    expect(await hasHorizontalOverflow(page), "sessions step scrolls sideways").toBe(false)

    await selectFirstTicket(page)
    await enterBuyerDetails(page, `playwright.responsive.${viewport.name}@example.com`)
    expect(await hasHorizontalOverflow(page), "attendee step scrolls sideways").toBe(false)

    await advanceToPaymentStep(page)
    expect(await hasHorizontalOverflow(page), "payment step scrolls sideways").toBe(false)
  })
}
