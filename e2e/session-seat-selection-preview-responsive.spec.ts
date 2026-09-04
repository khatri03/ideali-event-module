import { expect, test } from "@playwright/test"
import {
  CHART_NAME,
  UNPUBLISHED_CHART_NAME,
  hasHorizontalOverflow,
  openSeatSelectionStep,
  selectChart,
} from "./sessionSeatSelectionStep"

/**
 * The seat selection step gained a picture of the chosen layout beside its picker. An image dropped into a form
 * column is the kind of change that pushes a phone sideways, so these walk the CLAUDE.md breakpoints with a chart
 * selected and the preview on screen.
 */

const VIEWPORTS = [
  { name: "small mobile", width: 320, height: 640 },
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "small desktop", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide desktop", width: 1920, height: 1080 },
] as const

for (const viewport of VIEWPORTS) {
  test(`the chart preview lays out without horizontal scroll at ${viewport.width}px (${viewport.name})`, async ({
    page,
  }) => {
    await openSeatSelectionStep(page, viewport.width, viewport.height)
    await selectChart(page, CHART_NAME)

    await expect(page.getByAltText(`Seating layout preview for ${CHART_NAME}`)).toBeVisible()
    expect(await hasHorizontalOverflow(page), "the seat selection step scrolls sideways").toBe(false)
  })
}

/**
 * The picture is what tells the organizer the session points at the room they meant, so it has to be the picture of
 * the chart selected now rather than the one selected before.
 */
test("the preview follows the chart the organizer selects", async ({ page }) => {
  await openSeatSelectionStep(page, 1440, 900)

  await selectChart(page, CHART_NAME)
  await expect(page.getByAltText(`Seating layout preview for ${CHART_NAME}`)).toBeVisible()

  await page.getByRole("combobox").first().click()
  await page.getByRole("option", { name: new RegExp(UNPUBLISHED_CHART_NAME, "i") }).click()

  await expect(page.getByText("Not published yet")).toBeVisible()
  await expect(page.getByAltText(`Seating layout preview for ${CHART_NAME}`)).toBeHidden()
})

/**
 * Seats.io renders a picture only once a chart is published. An empty frame reads as a broken image, so the gap is
 * named and the organizer is told what produces one.
 */
test("an unpublished chart says so instead of showing an empty frame", async ({ page }) => {
  await openSeatSelectionStep(page, 375, 812)
  await selectChart(page, UNPUBLISHED_CHART_NAME)

  await expect(page.getByText("Not published yet")).toBeVisible()
  expect(await hasHorizontalOverflow(page), "the seat selection step scrolls sideways").toBe(false)
})

/**
 * The preview is there to be read. Drawn at the size of a list-row thumbnail it shows a room too small to recognise,
 * which is the same as not showing it at all, so the panel has to give it real height on every viewport.
 */
for (const viewport of VIEWPORTS) {
  test(`the chart preview is large enough to read at ${viewport.width}px (${viewport.name})`, async ({ page }) => {
    await openSeatSelectionStep(page, viewport.width, viewport.height)
    await selectChart(page, CHART_NAME)

    const preview = page.getByAltText(`Seating layout preview for ${CHART_NAME}`)
    await expect(preview).toBeVisible()

    const box = await preview.boundingBox()
    expect(box, "the preview has no box to measure").not.toBeNull()
    expect(box!.height, "the preview is drawn too small to recognise the room").toBeGreaterThanOrEqual(200)
  })
}
