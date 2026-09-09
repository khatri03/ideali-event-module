import { expect, test } from "@playwright/test"
import {
  HELD_SEAT_LABEL,
  HELD_SEAT_LABELS,
  HELD_TABLE_LABEL,
  hasHorizontalOverflow,
  openSeatPicker,
  sessionsStep,
} from "./seatPickerDialog"

/**
 * The seat map moved off the session card and behind a button that opens a full-screen dialog. A dialog pinned to
 * the viewport is the shape that pushes a phone sideways when its content does not fit, so these walk the
 * CLAUDE.md breakpoints with the picker both shut and open.
 */

/** How the basket names the held stalls seat, spelled out the way the buyer reads it rather than as its plan label. */
const HELD_SEAT_NAME = "Seat 14 at Row A"

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
  test(`the open seat picker lays out without horizontal scroll at ${viewport.width}px (${viewport.name})`, async ({
    page,
  }) => {
    await openSeatPicker(page, viewport.width, viewport.height)

    expect(await hasHorizontalOverflow(page), "the session card scrolls the page sideways").toBe(false)

    await page.getByRole("button", { name: /Pick seats|Change seats/ }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    expect(await hasHorizontalOverflow(page), "the open seat picker scrolls the page sideways").toBe(false)
  })

  /**
   * The badge naming a seated session sits on the card header beside the ticket count and the expand control. On a
   * narrow phone that row is what pushes a card sideways, so the badge has to be readable without the page moving.
   */
  test(`the seated-session badge stays on screen at ${viewport.width}px (${viewport.name})`, async ({ page }) => {
    await openSeatPicker(page, viewport.width, viewport.height)

    await expect(sessionsStep(page).getByRole("img", { name: "Seat selection" })).toBeVisible()

    expect(await hasHorizontalOverflow(page), "the session card scrolls the page sideways").toBe(false)
  })

  /**
   * A panel taller than the screen it is pinned to hangs off the bottom, and the seat map sits at the bottom of it.
   * The buyer then opens the picker and cannot see the thing they opened it for.
   */
  test(`the open seat picker fits inside the viewport at ${viewport.width}px (${viewport.name})`, async ({ page }) => {
    await openSeatPicker(page, viewport.width, viewport.height)

    await page.getByRole("button", { name: /Pick seats|Change seats/ }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    const box = await dialog.boundingBox()

    expect(box, "the seat picker panel is not on screen").not.toBeNull()
    expect(box!.y, "the seat picker panel starts above the viewport").toBeGreaterThanOrEqual(-1)
    expect(box!.y + box!.height, "the seat picker panel hangs off the bottom of the viewport").toBeLessThanOrEqual(
      viewport.height + 1,
    )
    expect(box!.x + box!.width, "the seat picker panel hangs off the side of the viewport").toBeLessThanOrEqual(
      viewport.width + 1,
    )
  })
}

/**
 * The button is the only way into the seat map, so a thumb that cannot land on it locks the buyer out of a seated
 * session entirely.
 */
test("keeps the seat picker button thumb-sized on a phone", async ({ page }) => {
  await openSeatPicker(page, 375, 812)

  const box = await page.getByRole("button", { name: /Pick seats|Change seats/ }).boundingBox()

  expect(box, "the seat picker button is not on screen").not.toBeNull()
  expect(box!.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX)
  expect(box!.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX)
})

/**
 * The button replaces a map the buyer could previously see without acting, so it has to say what it will show and
 * how many seats are already at stake before they press it.
 */
test("says how many seats are already held before the map is opened", async ({ page }) => {
  await openSeatPicker(page, 1440, 900)

  await expect(
    page.getByRole("button", { name: `Change seats · ${HELD_SEAT_LABELS.length} picked` }),
  ).toBeVisible()
})

/**
 * Closing the map must not hide what the buyer is paying for: a seat that only exists inside a dismissed dialog is
 * a charge on the total with nothing on the page accounting for it.
 */
test("keeps the held seats listed on the card once the map is closed", async ({ page }) => {
  await openSeatPicker(page, 1440, 900)

  await expect(sessionsStep(page).getByRole("button", { name: `Remove ${HELD_SEAT_NAME}` })).toBeVisible()

  await page.getByRole("button", { name: /Pick seats|Change seats/ }).click()
  await expect(page.getByRole("dialog")).toBeVisible()

  await page.getByRole("button", { name: "Close the seat map" }).click()
  await expect(page.getByRole("dialog")).toBeHidden()

  await expect(sessionsStep(page).getByText(`Row ${HELD_SEAT_LABEL.split("-")[0]}`)).toBeVisible()
  await expect(sessionsStep(page).getByRole("button", { name: `Remove ${HELD_SEAT_NAME}` })).toBeVisible()
})

/**
 * Seats picked at one table were picked as a party, and a basket that lists them flat leaves the buyer counting
 * labels to work out which of them sit together.
 */
test("gathers the held seats under the table they sit at", async ({ page }) => {
  await openSeatPicker(page, 375, 812)

  await expect(sessionsStep(page).getByText(`Table ${HELD_TABLE_LABEL}`)).toBeVisible()
  await expect(sessionsStep(page).getByRole("button", { name: `Remove Table ${HELD_TABLE_LABEL}` })).toBeVisible()

  expect(await hasHorizontalOverflow(page), "the grouped basket scrolls the page sideways").toBe(false)
})

/**
 * A seat handed back goes on sale again at once and may be gone for good, so a press that gives up a whole table
 * has to say what it is giving up and wait to be told to go ahead.
 */
test("asks before giving up a whole table, then gives it up", async ({ page }) => {
  await openSeatPicker(page, 1440, 900)

  await sessionsStep(page).getByRole("button", { name: `Remove Table ${HELD_TABLE_LABEL}` }).click()

  await expect(page.getByText(`Remove Table ${HELD_TABLE_LABEL}?`)).toBeVisible()

  await page.getByRole("button", { name: "Remove", exact: true }).click()

  await expect(sessionsStep(page).getByText(`Table ${HELD_TABLE_LABEL}`)).toBeHidden()
  await expect(sessionsStep(page).getByRole("button", { name: `Remove ${HELD_SEAT_NAME}` })).toBeVisible()
})

/** A buyer who opened the confirmation by mistake has to be able to back out with their seats untouched. */
test("keeps the table when the buyer backs out of the confirmation", async ({ page }) => {
  await openSeatPicker(page, 1440, 900)

  await sessionsStep(page).getByRole("button", { name: `Remove Table ${HELD_TABLE_LABEL}` }).click()
  await page.getByRole("button", { name: "Cancel" }).click()

  await expect(sessionsStep(page).getByRole("button", { name: "Remove Seat 1 at Table 19" })).toBeVisible()
})

/**
 * The legend prices the chart for a buyer who has not opened it. Hiding it behind the same button as the map would
 * put the price back behind a click, which is the regression the legend exists to prevent.
 */
test("prices the categories on the card without opening the map", async ({ page }) => {
  await openSeatPicker(page, 375, 812)

  const legend = page.getByRole("region", { name: "Seat categories" })

  await expect(legend).toBeVisible()
  await expect(legend.getByText("Stalls", { exact: true })).toBeVisible()
})

/**
 * A seated line's count is the seats picked on the plan, not a number the buyer typed. Removing it by zeroing that
 * number left the seats held, and the held seats put the line straight back — so the buyer confirmed a removal and
 * watched nothing happen.
 */
test("removes a seated line from the summary once the buyer confirms it", async ({ page }) => {
  await openSeatPicker(page, 1440, 900)

  await page.getByText("Summary", { exact: true }).click()

  const removeLine = page.getByRole("button", { name: "Remove Stalls" })
  await expect(removeLine).toBeVisible()

  await removeLine.click()
  await page.getByRole("button", { name: "Remove", exact: true }).click()

  await expect(removeLine).toBeHidden()
  await expect(sessionsStep(page).getByRole("button", { name: `Remove ${HELD_SEAT_NAME}` })).toBeHidden()
  await expect(sessionsStep(page).getByText(`Table ${HELD_TABLE_LABEL}`)).toBeHidden()
})
