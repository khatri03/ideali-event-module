import { expect, test } from "@playwright/test"
import { hasHorizontalOverflow, openSeatingLayoutDesigner } from "./seatingLayoutDesigner"

/**
 * The seating layout designer is the one screen that only ever reaches its working state from a
 * route parameter, so these walk the CLAUDE.md breakpoints against a saved layout opened directly at
 * its URL — the case a reload, a bookmark or the list's Edit action produces, and the case that used
 * to drop the organizer back onto an empty create form.
 */

const MIN_TOUCH_TARGET_PX = 44

const VIEWPORTS = [
  { name: "small mobile", width: 320, height: 640 },
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
  { name: "large desktop", width: 1440, height: 900 },
] as const

for (const viewport of VIEWPORTS) {
  test(`a saved seating layout lays out without horizontal scroll at ${viewport.width}px (${viewport.name})`, async ({
    page,
  }) => {
    await openSeatingLayoutDesigner(page, viewport.width, viewport.height)

    expect(await hasHorizontalOverflow(page), "the seating layout page scrolls sideways").toBe(false)
  })
}

/**
 * Opening a saved layout has to land in edit mode. Presenting the create form for a layout that
 * already exists offers to make a second chart for the same room and hides the categories the
 * organizer came to change.
 */
test("opening a saved layout by its own URL lands in edit mode rather than the create form", async ({ page }) => {
  await openSeatingLayoutDesigner(page, 1280, 800)

  await expect(page.getByRole("button", { name: "Create chart layout" })).toHaveCount(0)
  await expect(page.getByText("Chart designer will open after the first save")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Delete category Stalls" })).toBeVisible()
})

/**
 * Category names run long enough to outgrow a phone. Whatever a name does — wrap, or push the table
 * wider than the screen — it has to stay inside the table's own box, because a table that grows the
 * document instead is what drags every other control on the page off to the side.
 */
test("a long category name stays inside the table's own scroll container", async ({ page }) => {
  await openSeatingLayoutDesigner(page, 375, 812)

  const scrollBox = page.locator("table").locator("xpath=ancestor::div[1]")

  expect(await scrollBox.evaluate((element) => getComputedStyle(element).overflowX)).toBe("auto")
  expect(await hasHorizontalOverflow(page), "the table drags the page sideways with it").toBe(false)
})

/**
 * Deleting a category removes it from Seats.io as well as from us, so the control has to be big
 * enough to hit deliberately rather than by accident on a phone.
 */
test("every category action is a full-size touch target on a phone", async ({ page }) => {
  await openSeatingLayoutDesigner(page, 375, 812)

  const targets = [
    page.getByRole("button", { name: "Edit category Stalls" }),
    page.getByRole("button", { name: "Delete category Stalls" }),
    page.getByRole("button", { name: "Add chart category" }),
    page.getByRole("button", { name: "Save details" }),
  ]

  for (const target of targets) {
    const box = await target.boundingBox()
    expect(box, "the control is not on the page at all").not.toBeNull()
    expect(box!.width, `${await target.getAttribute("aria-label")} is too narrow to tap`).toBeGreaterThanOrEqual(
      MIN_TOUCH_TARGET_PX,
    )
    expect(box!.height, `${await target.getAttribute("aria-label")} is too short to tap`).toBeGreaterThanOrEqual(
      MIN_TOUCH_TARGET_PX,
    )
  }
})
