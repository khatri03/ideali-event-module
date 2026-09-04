import { expect, test } from "@playwright/test"
import {
  CATEGORY_OBJECT_COUNT,
  hasHorizontalOverflow,
  openTicketModalWithCategory,
  openTicketStep,
} from "./sessionTicketStep"

/**
 * The ticket modal gained a control beside Total Tickets that fills the field from the seating layout. A control
 * added to an already crowded two-column form is the kind of change that breaks a phone quietly, so these walk the
 * CLAUDE.md breakpoints with the modal open.
 */

const MIN_TOUCH_TARGET_PX = 44

const VIEWPORTS = [
  { name: "small mobile", width: 320, height: 640 },
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "small desktop", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide desktop", width: 1920, height: 1080 },
] as const

for (const viewport of VIEWPORTS) {
  test(`the ticket modal lays out without horizontal scroll at ${viewport.width}px (${viewport.name})`, async ({
    page,
  }) => {
    await openTicketStep(page, viewport.width, viewport.height)
    await openTicketModalWithCategory(page)

    await expect(page.getByRole("button", { name: "Use layout count" })).toBeVisible()
    expect(await hasHorizontalOverflow(page), "the ticket step scrolls sideways").toBe(false)
  })
}

/**
 * The count is what spares the organizer counting seats in the designer, so pressing the control has to leave the
 * number in the field rather than only reporting it somewhere.
 */
test("pulling the layout count fills the total tickets field", async ({ page }) => {
  await openTicketStep(page, 1440, 900)
  await openTicketModalWithCategory(page)

  await page.getByRole("button", { name: "Use layout count" }).click()

  await expect(page.getByPlaceholder("Total ticket count")).toHaveValue(String(CATEGORY_OBJECT_COUNT))
})

/** The control is tapped on a phone, so it has to be big enough to hit deliberately. */
test("the layout count control is a full-size touch target on a phone", async ({ page }) => {
  await openTicketStep(page, 375, 812)
  await openTicketModalWithCategory(page)

  const control = page.getByRole("button", { name: "Use layout count" })
  await control.scrollIntoViewIfNeeded()

  const box = await control.boundingBox()
  expect(box?.height ?? 0, "the layout count control is too short to tap").toBeGreaterThanOrEqual(
    MIN_TOUCH_TARGET_PX,
  )
  expect(box?.width ?? 0, "the layout count control is too narrow to tap").toBeGreaterThanOrEqual(
    MIN_TOUCH_TARGET_PX,
  )
})

/**
 * A new number replacing one the organizer typed is announced before it happens, naming both figures, because a
 * deliberate cap disappearing without a word is indistinguishable from the screen losing the entry.
 */
test("replacing a typed total is confirmed with both numbers named", async ({ page }) => {
  await openTicketStep(page, 1440, 900)
  await openTicketModalWithCategory(page)

  const totalTickets = page.getByPlaceholder("Total ticket count")
  await totalTickets.fill("120")
  await page.getByRole("button", { name: "Use layout count" }).click()

  await expect(page.getByText("Replace the total tickets?")).toBeVisible()
  await expect(page.getByText(/148/)).toBeVisible()
  await expect(totalTickets).toHaveValue("120")

  await page.getByRole("button", { name: "Keep mine" }).click()
  await expect(totalTickets).toHaveValue("120")
})
