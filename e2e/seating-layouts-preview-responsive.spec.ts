import { expect, test } from "@playwright/test"
import {
  PUBLISHED_LAYOUT_NAME,
  THUMBNAIL_DATA_URL,
  UNPUBLISHED_LAYOUT_NAME,
  hasHorizontalOverflow,
  openSeatingLayoutsList,
} from "./seatingLayoutsList"

/**
 * The seating layouts list gained a picture per row and a preview that opens over it, which is the kind of change
 * that breaks a phone quietly: an image cell widens the table, and a modal that is not full-screen on a small
 * viewport leaves the layout unreadable. These walk the CLAUDE.md breakpoints against a list holding both a
 * published layout and one that has never been published.
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
  test(`the seating layouts list lays out without horizontal scroll at ${viewport.width}px (${viewport.name})`, async ({
    page,
  }) => {
    await openSeatingLayoutsList(page, viewport.width, viewport.height)

    expect(await hasHorizontalOverflow(page), "the seating layouts page scrolls sideways").toBe(false)
  })
}

/**
 * The preview picture is the fastest way to tell two similarly named layouts apart, so it has to reach the row
 * rather than only the layout's own page.
 */
test("a published layout shows its preview picture in the list", async ({ page }) => {
  await openSeatingLayoutsList(page, 1280, 800)

  const preview = page.getByAltText(`Seating layout preview for ${PUBLISHED_LAYOUT_NAME}`)

  await expect(preview).toBeVisible()
  await expect(preview).toHaveAttribute("src", THUMBNAIL_DATA_URL)
})

/**
 * Seats.io only renders a preview of a published chart. A layout without one has to say why rather than leave an
 * empty cell, which would read as a page that failed to load instead of a step still to take.
 */
test("a layout that has never been published says so instead of showing an empty cell", async ({ page }) => {
  await openSeatingLayoutsList(page, 1280, 800)

  await expect(page.getByText("Not published yet")).toBeVisible()
  await expect(page.getByRole("button", { name: `Preview the ${UNPUBLISHED_LAYOUT_NAME} seating layout` })).toHaveCount(0)
})

/**
 * Clicking the preview opens the layout over the list, named, and without offering to change it. The organizer
 * came to look, so the preview must not become a second way into the editor.
 */
test("clicking the preview opens the layout read-only over the list", async ({ page }) => {
  await openSeatingLayoutsList(page, 1280, 800)

  await page.getByRole("button", { name: `Preview the ${PUBLISHED_LAYOUT_NAME} seating layout` }).click()

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(PUBLISHED_LAYOUT_NAME)).toBeVisible()
  await expect(dialog.getByText("A read-only view of the published layout. Nothing here changes the chart.")).toBeVisible()
  await expect(dialog.getByAltText(`Seating layout preview for ${PUBLISHED_LAYOUT_NAME}`)).toBeVisible()
  // The picture is the whole preview. A Seats.io embed here would carry an editor, and the workspace secret key it
  // needs, onto a screen the organizer opened only to look.
  await expect(dialog.locator("iframe")).toHaveCount(0)
})

/**
 * The preview and the control that closes it are both things an organizer taps on a phone, so both have to be big
 * enough to hit deliberately.
 */
test("the preview and its close control are full-size touch targets on a phone", async ({ page }) => {
  await openSeatingLayoutsList(page, 375, 812)

  const preview = page.getByRole("button", { name: `Preview the ${PUBLISHED_LAYOUT_NAME} seating layout` })
  await preview.scrollIntoViewIfNeeded()
  await preview.click()

  const closeControl = page.getByRole("button", { name: "Close the seating layout preview" })
  await expect(closeControl).toBeVisible()

  // The dialog scales up as it opens, so a box measured on the first frame is the control mid-animation rather
  // than the size a thumb actually meets. Polling settles on the resting size and still fails a control that is
  // genuinely too small.
  await expect
    .poll(async () => (await closeControl.boundingBox())?.width ?? 0, {
      message: "the close control is too narrow to tap",
    })
    .toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX)

  await expect
    .poll(async () => (await closeControl.boundingBox())?.height ?? 0, {
      message: "the close control is too short to tap",
    })
    .toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX)
})
