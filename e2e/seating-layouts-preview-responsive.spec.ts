import { expect, test } from "@playwright/test"
import {
  PREVIEW_URL,
  PUBLISHED_LAYOUT_NAME,
  THUMBNAIL_DATA_URL,
  UNPUBLISHED_LAYOUT_NAME,
  hasHorizontalOverflow,
  openSeatingLayoutsList,
} from "./seatingLayoutsList"

/**
 * The seating layouts list gained a picture per row that links out to Seats.io, which is the kind of change that
 * breaks a phone quietly: an image cell widens the table, and a link too small to hit leaves the layout
 * unreachable. These walk the CLAUDE.md breakpoints against a list holding both a published layout and one that has
 * never been published.
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
 * Seats.io only pictures a published chart. A layout without one has to say why rather than leave an empty cell,
 * which would read as a page that failed to load instead of a step still to take.
 */
test("a layout that has never been published says so instead of showing an empty cell", async ({ page }) => {
  await openSeatingLayoutsList(page, 1280, 800)

  await expect(page.getByText("Not published yet")).toBeVisible()
  await expect(
    page.getByRole("link", { name: `Open the ${UNPUBLISHED_LAYOUT_NAME} seating layout on Seats.io in a new tab` }),
  ).toHaveCount(0)
})

/**
 * The picture opens the layout on Seats.io in a new tab, and says so before it is clicked. A tab that appears with
 * no warning reads as the page having navigated away from the organizer's work.
 */
test("the preview links out to Seats.io and says so before the click", async ({ page }) => {
  await openSeatingLayoutsList(page, 1280, 800)

  const link = page.getByRole("link", {
    name: `Open the ${PUBLISHED_LAYOUT_NAME} seating layout on Seats.io in a new tab`,
  })

  await expect(link).toHaveAttribute("href", PREVIEW_URL)
  await expect(link).toHaveAttribute("target", "_blank")

  await link.hover()
  await expect(page.getByText("Opens the full layout on Seats.io in a new tab")).toBeVisible()
})

/** The preview is what an organizer taps on a phone, so it has to be big enough to hit deliberately. */
test("the preview is a full-size touch target on a phone", async ({ page }) => {
  await openSeatingLayoutsList(page, 375, 812)

  const link = page.getByRole("link", {
    name: `Open the ${PUBLISHED_LAYOUT_NAME} seating layout on Seats.io in a new tab`,
  })
  await link.scrollIntoViewIfNeeded()

  const box = await link.boundingBox()
  expect(box?.width ?? 0, "the preview is too narrow to tap").toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX)
  expect(box?.height ?? 0, "the preview is too short to tap").toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX)
})
