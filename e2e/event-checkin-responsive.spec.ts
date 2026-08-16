import { expect, test, type Locator } from "@playwright/test"
import { hasHorizontalOverflow, openCheckInDesk } from "./checkInDesk"

/**
 * The door screen is worked from a phone held in one hand while a queue waits, so every breakpoint
 * from CLAUDE.md is walked here rather than the desktop one alone. What is asserted is the failure
 * that actually costs the operator a scan: the page sliding sideways so half the roster or the
 * check-in button sits off-screen, and tap targets too small to hit without looking.
 */

const MIN_TOUCH_TARGET_PX = 44

const VIEWPORTS = [
  { name: "small mobile", width: 320, height: 640 },
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
  { name: "large desktop", width: 1440, height: 900 },
] as const

/** Waits out an entrance animation, so a box is measured at the size it actually settles at. */
async function settle(target: Locator) {
  await expect
    .poll(async () => await target.evaluate((element) => getComputedStyle(element).transform), {
      timeout: 5_000,
      message: "the element never finished animating in",
    })
    .toBe("none")
}

for (const viewport of VIEWPORTS) {
  test(`the check-in desk lays out without horizontal scroll at ${viewport.width}px (${viewport.name})`, async ({
    page,
  }) => {
    await openCheckInDesk(page, viewport.width, viewport.height)

    expect(await hasHorizontalOverflow(page), "the check-in desk scrolls sideways").toBe(false)

    await page.getByRole("button", { name: "Arrived" }).click()
    expect(await hasHorizontalOverflow(page), "filtering the roster makes the page scroll sideways").toBe(false)
  })
}

/**
 * The roster carries six columns, which cannot fit a phone. Keeping it readable there means the table
 * scrolls inside its own box - the one place a sideways scroll is correct rather than a defect.
 */
test("the roster table scrolls inside its own container instead of the page", async ({ page }) => {
  await openCheckInDesk(page, 375, 812)

  const scrollBox = page.locator("table").locator("xpath=ancestor::div[1]")
  const overflow = await scrollBox.evaluate((element) => ({
    scrollX: getComputedStyle(element).overflowX,
    isScrollable: element.scrollWidth - element.clientWidth > 1,
  }))

  expect(overflow.scrollX).toBe("auto")
  expect(overflow.isScrollable, "the table is not actually wider than its box, so nothing is proven").toBe(true)
  expect(await hasHorizontalOverflow(page), "the table drags the page sideways with it").toBe(false)
})

/** A mis-tap on this screen admits the wrong guest, so the targets have to be hittable at a glance. */
test("every action on the desk is a full-size touch target on a phone", async ({ page }) => {
  await openCheckInDesk(page, 375, 812)

  const targets = [
    page.getByRole("button", { name: "Check in TKT-4F92A1" }),
    page.getByRole("button", { name: "Undo check-in for TKT-8C31B7" }),
    page.getByRole("button", { name: "Send ticket TKT-4F92A1 again" }),
    page.getByRole("button", { name: "Arrived" }),
    page.getByRole("textbox", { name: "Search attendees" }),
    page.getByRole("textbox", { name: "Ticket code" }),
    page.getByRole("button", { name: "Check in", exact: true }),
  ]

  for (const target of targets) {
    const box = await target.boundingBox()
    expect(box, "the control was not on screen to measure").not.toBeNull()
    expect(box!.height, `${await target.getAttribute("aria-label")} is under ${MIN_TOUCH_TARGET_PX}px tall`)
      .toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX)
  }
})

/** The confirmation is the last thing between a tap and an admission, so it has to be readable on a phone. */
test("the confirmation dialog fits a phone without pushing the page sideways", async ({ page }) => {
  await openCheckInDesk(page, 375, 812)

  await page.getByRole("button", { name: "Check in TKT-4F92A1" }).click()

  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toBeVisible()
  // The dialog scales in, so anything measured before it settles reads smaller than it ever renders.
  await settle(dialog)

  const box = await dialog.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width, "the dialog is wider than the phone it is shown on").toBeLessThanOrEqual(375)
  expect(await hasHorizontalOverflow(page), "the open dialog makes the page scroll sideways").toBe(false)

  const confirm = dialog.getByRole("button", { name: /check in/i })
  await expect
    .poll(async () => (await confirm.boundingBox())?.height ?? 0, {
      message: "the confirm button never reaches the minimum touch target",
    })
    .toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX)
})
