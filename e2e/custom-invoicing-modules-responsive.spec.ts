import { expect, test, type Locator, type Page } from "@playwright/test"
import { findHorizontalPageOverflow, findUndersizedTargets, MIN_TOUCH_TARGET_PX } from "./responsiveChecks"

/**
 * Phase 08 width coverage for the admin Custom Invoicing Modules screen, driven against mocked API responses
 * because the check is about layout and reachability, not the server. Every width in the project's responsive
 * range is walked: an admin flipping a module from a phone must reach every switch without the page sliding
 * sideways, and must never be offered a coming-soon module as if it were live.
 */

const WIDTHS = [320, 375, 768, 1024, 1440, 1920] as const
const SIDEBAR_WIDTHS = [375, 1440] as const
const VIEWPORT_HEIGHT = 900
const SCREENSHOT_DIR = ".planning/phases/08-admin-module-enablement/screenshots"
const SCREEN_URL = "/admin/custom-invoicing-modules"

const LIVE_MODULES = ["Event", "Membership", "Donation"] as const
const COMING_SOON_MODULES = ["Trips & Tours", "Exhibitions", "Auction"] as const

/** Wraps a payload the way every API response arrives, so the Zod boundary parses it as it would in production. */
function envelope(data: unknown) {
  return { success: true, message: null, timestamp: "2026-10-06T10:00:00Z", data }
}

const ADMIN_SESSION = envelope({
  userDetail: { userId: 1, roles: ["Admin"], email: "admin@example.com", name: "Admin User", logoUrl: null },
  organizerDetail: {
    organizerId: 1,
    organizerUniqueId: "organizer-1",
    name: "Ideali Events",
    email: "admin@example.com",
    emailBrandingEnabled: false,
    profiles: [],
    paymentAccounts: [],
  },
})

const MODULE_STATES = envelope([
  { moduleType: "Event", isEnabled: true, updatedAtUtc: "2026-10-01T12:00:00Z", updatedByName: "Ayesha Khan" },
  { moduleType: "Membership", isEnabled: false, updatedAtUtc: null, updatedByName: null },
  { moduleType: "Donation", isEnabled: false, updatedAtUtc: null, updatedByName: null },
])

/**
 * Mocks everything the authenticated admin shell asks for. An unmatched API call gets a 404 instead of reaching
 * a backend that is not running, so a missing mock fails loudly rather than hanging on a network timeout.
 */
async function mockAdminShell(page: Page) {
  // Matched on the path prefix: a glob like **/api/** would also swallow Vite's /src/api/*.ts modules.
  await page.route((url) => url.pathname.startsWith("/api/"), (route) => route.fulfill({ status: 404, json: { title: "Not mocked", status: 404 } }))
  await page.route("**/api/identity/account/session", (route) => route.fulfill({ json: ADMIN_SESSION }))
  await page.route("**/api/alert-inbox/**", (route) => route.fulfill({ json: envelope(null) }))
  await page.route("**/api/admin/custom-invoicing-modules", (route) => route.fulfill({ json: MODULE_STATES }))
}

/** Opens the screen at a width and waits for the module list, so assertions never race the first fetch. */
async function openScreen(page: Page, width: number) {
  await page.setViewportSize({ width, height: VIEWPORT_HEIGHT })
  await page.goto(SCREEN_URL)
  await expect(switchInput(page, "Event")).toBeChecked({ timeout: 30_000 })
}

const switchInput = (page: Page, moduleName: string) => page.getByLabel(`Custom invoicing for ${moduleName}`)

/** The visible switch the finger lands on; the labelled input itself is visually hidden. */
const switchRoot = (page: Page, moduleName: string) =>
  page.locator('[data-scope="switch"][data-part="root"]').filter({ has: switchInput(page, moduleName) })

/** Waits out an entrance animation so a box is measured at the size it settles at, not mid-scale. */
async function settle(target: Locator) {
  await expect
    .poll(async () => await target.evaluate((element) => element.getAnimations({ subtree: true }).length), {
      message: "the element never finished animating in",
    })
    .toBe(0)
}

for (const width of WIDTHS) {
  /**
   * The screen must not slide sideways at any width, every live switch must be on screen and usable, the
   * coming-soon switches must stay locked, and no control may be smaller than a fingertip.
   */
  test(`the custom invoicing modules screen keeps every switch reachable without page overflow at ${width}px`, async ({
    page,
  }) => {
    await mockAdminShell(page)
    await openScreen(page, width)

    expect(await findHorizontalPageOverflow(page), "the modules screen scrolls the page sideways").toEqual([])

    for (const name of [...LIVE_MODULES, ...COMING_SOON_MODULES]) {
      await expect(page.getByText(name, { exact: true })).toBeVisible()
    }
    for (const name of LIVE_MODULES) {
      const control = switchRoot(page, name)
      await control.scrollIntoViewIfNeeded()
      await expect(control, `${name} switch is off screen`).toBeInViewport()
      await expect(switchInput(page, name)).toBeEnabled()
    }
    for (const name of COMING_SOON_MODULES) {
      await expect(switchInput(page, name), `${name} is switchable before it ships`).toBeDisabled()
    }

    const undersized = await findUndersizedTargets(page.getByRole("heading", { name: "Custom Invoicing Modules" }), true)
    expect(undersized, `controls under ${MIN_TOUCH_TARGET_PX}px`).toEqual([])

    await page.screenshot({ path: `${SCREENSHOT_DIR}/custom-invoicing-modules-${width}.png`, fullPage: true })
  })
}

/**
 * Turning a module off is the one destructive action here, so its confirmation must be readable on a phone,
 * and backing out must leave the module exactly as it was.
 */
test("the turn-off confirmation fits a phone and Cancel leaves the module on", async ({ page }) => {
  await mockAdminShell(page)
  await openScreen(page, 375)

  await switchRoot(page, "Event").click()

  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toBeVisible()
  await settle(dialog)

  const box = await dialog.boundingBox()
  expect(box, "the dialog was not on screen to measure").not.toBeNull()
  expect(box!.width, "the dialog is wider than the phone it is shown on").toBeLessThanOrEqual(375)
  expect(await findHorizontalPageOverflow(page), "the open dialog makes the page scroll sideways").toEqual([])

  await dialog.getByRole("button", { name: "Cancel" }).click()

  await expect(dialog).toBeHidden()
  await expect(switchInput(page, "Event")).toBeChecked()
})

for (const width of SIDEBAR_WIDTHS) {
  /**
   * The admin finds the screen through the Admin group; on a phone that group lives in the navigation drawer,
   * so the drawer is opened before the group is checked.
   */
  test(`the Admin group lists Custom Invoicing Modules as the current page at ${width}px`, async ({ page }) => {
    await mockAdminShell(page)
    await openScreen(page, width)

    const openNavigation = page.getByRole("button", { name: "Open navigation" })
    if (await openNavigation.isVisible()) {
      await openNavigation.click()
    }

    const item = page.getByRole("link", { name: "Custom Invoicing Modules", exact: true })
    await expect(item).toBeVisible()
    await expect(item).toHaveAttribute("aria-current", "page")

    await page.screenshot({ path: `${SCREENSHOT_DIR}/admin-sidebar-${width}-after.png` })
  })
}
