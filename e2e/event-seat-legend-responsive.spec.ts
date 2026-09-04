import { expect, test } from "@playwright/test"
import { hasHorizontalOverflow, openSeatLegend } from "./eventSeatLegend"

/**
 * The seat map gained a legend naming, colouring and pricing every category the session sells. It is a grid of
 * rows dropped beside a chart that already fills its column, which is exactly the shape that pushes a phone
 * sideways, so these walk the CLAUDE.md breakpoints with the legend on screen.
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
  test(`the seat legend lays out without horizontal scroll at ${viewport.width}px (${viewport.name})`, async ({
    page,
  }) => {
    await openSeatLegend(page, viewport.width, viewport.height)

    await expect(page.getByText("Stalls", { exact: true })).toBeVisible()
    expect(await hasHorizontalOverflow(page), "the seat legend scrolls the page sideways").toBe(false)
  })
}

/**
 * The legend is the only thing on the page that says what a colour on the chart costs, so every category the
 * session sells has to be named and priced whatever the viewport.
 */
test("names and prices every category the session sells", async ({ page }) => {
  await openSeatLegend(page, 375, 812)

  await expect(page.getByText("Stalls", { exact: true })).toBeVisible()
  await expect(page.getByText("Balcony", { exact: true })).toBeVisible()
  await expect(page.getByText("Private boxes", { exact: true })).toBeVisible()
  await expect(page.getByText("$40.00", { exact: true })).toBeVisible()
  await expect(page.getByText("$15.00", { exact: true })).toBeVisible()
  await expect(page.getByText("$120.00", { exact: true })).toBeVisible()
})

/**
 * How many seats are left is the organizer's to disclose per category. A page that leaked the count of a category
 * they kept private would publish a number they deliberately withheld.
 */
test("counts only the categories whose organizer opted in", async ({ page }) => {
  await openSeatLegend(page, 1440, 900)

  await expect(page.getByText("12 left")).toBeVisible()
  await expect(page.getByText("Sold out")).toBeVisible()
  await expect(page.getByText(/left/).filter({ hasNotText: "12 left" })).toHaveCount(0)
})

/**
 * A buyer weighs up what a seat costs before handing over a name and email address. The legend has to be readable
 * on the sessions tab with no cart open, which is where it previously went missing entirely.
 */
test("prices the chart before the buyer has identified themselves", async ({ page }) => {
  await openSeatLegend(page, 1440, 900)

  await expect(page.getByText("Tell us who you are to start picking seats")).toBeVisible()
  await expect(page.getByRole("region", { name: "Seat categories" })).toBeVisible()
  await expect(page.getByText("$40.00", { exact: true })).toBeVisible()
})

/**
 * Whether a seat count is published is the organizer's choice per ticket type. If that choice changed the height of
 * the card, a legend of three categories would look like three unlike things when only the disclosure differs.
 */
test("lines the category cards up whether or not their counts are published", async ({ page }) => {
  await openSeatLegend(page, 1440, 900)

  const cards = page
    .getByRole("region", { name: "Seat categories" })
    .getByRole("listitem")
    .locator("> div:last-child")
  const boxes = await cards.evaluateAll((elements) =>
    elements.map((element) => {
      const { top, height } = element.getBoundingClientRect()
      return { top: Math.round(top), height: Math.round(height) }
    }),
  )

  expect(boxes.length, "the legend cards are not on screen").toBeGreaterThan(1)
  expect(new Set(boxes.map((box) => box.height)).size, "a published count changes its card's height").toBe(1)
  expect(new Set(boxes.map((box) => box.top)).size, "a published count pushes its card out of line").toBe(1)
})

/**
 * A legend row carries no control, but it sits in the buyer's thumb path on a phone. It has to stay large enough
 * to read at a glance rather than collapsing to a line of text under the chart.
 */
test("keeps each legend row readable on a phone", async ({ page }) => {
  await openSeatLegend(page, 320, 640)

  const row = page.getByRole("region", { name: "Seat categories" }).getByRole("listitem").first()
  const box = await row.boundingBox()

  expect(box, "the legend row is not on screen").not.toBeNull()
  expect(box!.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX)
})
