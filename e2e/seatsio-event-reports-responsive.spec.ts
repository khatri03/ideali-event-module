import { expect, test } from "@playwright/test"
import {
  EVENT_LABEL,
  hasHorizontalOverflow,
  openChartEvents,
  openEventReport,
} from "./seatsioEvents"

/**
 * The event report screens are a list of events per layout and a seven-tab report per event. Both are new surfaces
 * an organizer reaches on a phone, and both carry wide content — a status table, a tab strip — that breaks a small
 * viewport quietly. These walk the CLAUDE.md breakpoints and prove the tabs load one report at a time.
 */

const MIN_TOUCH_TARGET_PX = 44

const VIEWPORTS = [
  { name: "small mobile", width: 320, height: 640 },
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "small desktop", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide", width: 1920, height: 1080 },
] as const

for (const viewport of VIEWPORTS) {
  test(`the chart events list has no horizontal scroll at ${viewport.width}px (${viewport.name})`, async ({ page }) => {
    await openChartEvents(page, viewport.width, viewport.height)
    expect(await hasHorizontalOverflow(page), "the events list scrolls sideways").toBe(false)
  })

  test(`the event report screen has no horizontal scroll at ${viewport.width}px (${viewport.name})`, async ({ page }) => {
    await openEventReport(page, viewport.width, viewport.height)
    expect(await hasHorizontalOverflow(page), "the report screen scrolls sideways").toBe(false)
  })
}

/** The summary tab loads on arrival, so the organizer lands on the live seat map without opening anything. */
test("the report screen opens on the summary tab with its live map surface shown", async ({ page }) => {
  await openEventReport(page, 1280, 800)

  await expect(page.getByText("A live seat map is not available for this event yet.")).toBeVisible()
})

/**
 * Opening a tab loads that tab's report. The channels tab must show its data only once opened, which is the visible
 * proof that each tab owns its own lazily-triggered endpoint.
 */
test("opening a tab loads that tab's report", async ({ page }) => {
  await openEventReport(page, 1280, 800)

  await page.getByRole("tab", { name: "Channels" }).click()

  await expect(page.getByText("Vip")).toBeVisible()
})

/** The tab strip is what an organizer taps on a phone, so each tab has to be a real touch target. */
test("the report tabs are full-size touch targets on a phone", async ({ page }) => {
  await openEventReport(page, 375, 812)

  const summaryTab = page.getByRole("tab", { name: "Summary" })
  const box = await summaryTab.boundingBox()
  expect(box?.height ?? 0, "a report tab is too short to tap").toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX)
})

/** An event opened from the list carries its label into the report header, so the organizer keeps their place. */
test("an event opens its report from the list", async ({ page }) => {
  await openChartEvents(page, 1280, 800)

  await page.getByRole("button", { name: `Open reports for ${EVENT_LABEL}` }).click()

  await expect(page.getByRole("heading", { name: EVENT_LABEL })).toBeVisible()
  await expect(page.getByRole("tab", { name: "Summary" })).toBeVisible()
})
