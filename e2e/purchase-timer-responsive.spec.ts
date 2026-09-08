import { expect, test } from "@playwright/test"
import { envelope, hasHorizontalOverflow, openSeatLegend } from "./eventSeatLegend"

/**
 * The purchase countdown now appears before a cart exists, driven by the hold token the chart takes when the buyer
 * opens the map. It is pinned to the viewport, which is the shape that pushes a phone sideways when it does not
 * fit, so these walk the CLAUDE.md breakpoints with the timer on screen.
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

/** Opens the map on a form with no cart, answering the token request so the countdown has a deadline to run to. */
async function openMapWithHoldToken(page: import("@playwright/test").Page, width: number, height: number) {
  await openSeatLegend(page, width, height)

  // Registered after the form is up, because the helper's own catch-all for the registration routes would
  // otherwise answer this one: Playwright gives the last matching route the request.
  await page.route("**/register/sessions/*/hold-token", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        envelope({ HoldToken: "browser-token", ExpiresAtUtc: new Date(Date.now() + 1_200_000).toISOString() }),
      ),
    }),
  )

  await page.getByRole("button", { name: /Pick seats|Change seats/ }).click()
}

for (const viewport of VIEWPORTS) {
  /**
   * A countdown that pushes the page sideways is a defect on every viewport, and the phone widths are where a chip
   * pinned to a corner runs out of room first.
   */
  test(`the purchase countdown lays out without horizontal scroll at ${viewport.width}px (${viewport.name})`, async ({
    page,
  }) => {
    await openMapWithHoldToken(page, viewport.width, viewport.height)

    await expect(page.getByRole("status")).toBeVisible()
    expect(await hasHorizontalOverflow(page), "the purchase countdown scrolls the page sideways").toBe(false)
  })

  /**
   * The countdown carries the warning that the buyer's seats are about to be released, so it has to stay big enough
   * to read and to press on a phone rather than shrinking away with the viewport.
   */
  test(`the purchase countdown stays large enough to read at ${viewport.width}px (${viewport.name})`, async ({
    page,
  }) => {
    await openMapWithHoldToken(page, viewport.width, viewport.height)

    const box = await page.getByRole("status").boundingBox()

    expect(box, "the purchase countdown is not on screen").not.toBeNull()
    expect(box!.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX)
  })
}

/**
 * Seats leave inventory the moment they are picked, a whole step before the cart that owns the purchase deadline
 * exists. Showing nothing until then let that first hold run out in silence, with the buyer still on the chart.
 */
test("counts down from the hold token before a cart exists", async ({ page }) => {
  await openSeatLegend(page, 1440, 900)

  await expect(page.getByRole("status")).toHaveCount(0)

  await page.route("**/register/sessions/*/hold-token", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        envelope({ HoldToken: "browser-token", ExpiresAtUtc: new Date(Date.now() + 1_200_000).toISOString() }),
      ),
    }),
  )

  await page.getByRole("button", { name: /Pick seats|Change seats/ }).click()

  await expect(page.getByRole("status")).toBeVisible()
})

/**
 * The seat picker opens over the whole viewport, and the countdown has to stay legible on top of it: the moment the
 * buyer is choosing seats is the moment losing them matters most. A chip left under the dialog layer is blurred by
 * its backdrop and answers no question the buyer has.
 */
test("stays on top of the open seat picker", async ({ page }) => {
  await openMapWithHoldToken(page, 1440, 900)

  await expect(page.getByRole("dialog")).toBeVisible()
  await expect(page.getByRole("status")).toBeVisible()

  const coveredBy = await page.evaluate(() => {
    const chip = document.querySelector('[role="status"]')
    if (!chip) return "the countdown is not on screen"

    const box = chip.getBoundingClientRect()
    const topElement = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)

    return topElement && chip.contains(topElement) ? null : (topElement?.className ?? "an unknown element")
  })

  expect(coveredBy, "something is covering the purchase countdown").toBeNull()
})
