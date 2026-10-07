import { expect, test, type Locator, type Page, type Request } from "@playwright/test"
import { findHorizontalPageOverflow, MIN_TOUCH_TARGET_PX } from "./responsiveChecks"

/**
 * Phase 10 width coverage for the cross-module custom invoice list, the sidebar that leads to it and the
 * module-locked editor, driven against mocked API responses because the check is about layout and
 * reachability, not the server. An organizer chasing a sponsor from a phone must reach every filter, row
 * and page control without the page sliding sideways.
 */

const WIDTHS = [320, 375, 768, 1024, 1440, 1920] as const
const TABLE_MIN_WIDTH = 768
const SCREENSHOT_WIDTHS = [375, 1440] as const
const VIEWPORT_HEIGHT = 900
const SCREENSHOT_DIR = ".planning/phases/10-custom-invoices-navigation-and-list/screenshots"

const LIST_URL = "/organizer/custom-invoices/list"
const LIST_API_PATH = "/api/organizer/custom-invoices/list"
const TOTAL_INVOICES = 23

type Json = Record<string, unknown>

/** Wraps a payload the way every API response arrives, so the Zod boundary parses it as it would in production. */
function envelope(data: unknown) {
  return { success: true, message: null, timestamp: "2026-10-08T10:00:00Z", data }
}

const SESSION = envelope({
  userDetail: { userId: 1, roles: ["Organizer"], email: "organizer@example.com", name: "Organizer User", logoUrl: null },
  organizerDetail: {
    organizerId: 1,
    organizerUniqueId: "organizer-1",
    name: "Ideali Events",
    email: "organizer@example.com",
    emailBrandingEnabled: false,
    profiles: [],
    paymentAccounts: [],
  },
})

const FILTER_OPTIONS = envelope({
  moduleTypes: ["Event", "Membership", "Donation"],
  categories: [
    { uniqueId: "category-1", name: "Platinum Founding Sponsor of the Annual Regional Leadership Convention", isActive: true },
    { uniqueId: "category-2", name: "Retired Booth Package", isActive: false },
  ],
})

/** One list row; defaults are a pending Event invoice so each fixture states only what makes it distinct. */
function listRow(overrides: Json): Json {
  return {
    invoiceUniqueId: "c0000000-0000-4000-8000-000000000001",
    invoiceNo: "CI-0001",
    moduleType: "Event",
    entityName: "Annual Regional Leadership Convention and Partner Exhibition 2026",
    companyName: "Northwind Traders International Holdings Limited",
    buyerName: "Jane Doe",
    buyerEmail: "jane.doe.accounts-payable@northwind.example.com",
    categoryName: "Platinum Founding Sponsor of the Annual Regional Leadership Convention",
    dueDateUtc: "2026-11-10T12:00:00Z",
    invoiceDateUtc: "2026-10-01T12:00:00Z",
    totalAmount: "12750.50",
    currencySymbol: "$",
    invoiceStatus: "PendingPayment",
    isOverdue: false,
    statusLabel: "Pending Payment",
    canMarkAsPaid: true,
    canCancel: true,
    canSend: true,
    ...overrides,
  }
}

const ROWS: Json[] = [
  listRow({ isOverdue: true, statusLabel: "Overdue", dueDateUtc: "2026-09-10T12:00:00Z" }),
  listRow({
    invoiceUniqueId: "c0000000-0000-4000-8000-000000000002",
    invoiceNo: "CI-0002",
    moduleType: "Membership",
    entityName: "Corporate Gold Membership",
    companyName: "Contoso Ltd",
    buyerName: "Sam Lee",
    buyerEmail: "sam@contoso.example.com",
    invoiceStatus: "Paid",
    statusLabel: "Paid",
    canMarkAsPaid: false,
    canCancel: false,
  }),
  listRow({
    invoiceUniqueId: "c0000000-0000-4000-8000-000000000003",
    invoiceNo: "CI-0003",
    moduleType: "Donation",
    entityName: "Spring Appeal",
    companyName: "",
    buyerName: "Ola Smith",
    buyerEmail: "ola@example.com",
    categoryName: "Retired Booth Package",
    invoiceStatus: "Cancelled",
    statusLabel: "Cancelled",
    canMarkAsPaid: false,
    canCancel: false,
    canSend: false,
  }),
]

/** A page in the server's paging envelope; the total is the server's, never counted from the rows. */
function listPage(rows: Json[], url: URL) {
  const pageSize = Number(url.searchParams.get("pageSize") ?? 10)
  const total = rows.length === 0 ? 0 : TOTAL_INVOICES
  return envelope({
    pageData: rows,
    totalRecordsCount: total,
    pageNo: Number(url.searchParams.get("pageNo") ?? 1),
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  })
}

/**
 * Mocks everything the organizer shell, the list and the editor ask for. An unmatched API call gets a 404
 * instead of reaching a backend, so a missing mock fails loudly rather than hanging on a network timeout.
 */
async function mockShell(page: Page, rows: Json[] = ROWS) {
  // Matched on the path prefix: a glob like **/api/** would also swallow Vite's /src/api/*.ts modules.
  await page.route((url) => url.pathname.startsWith("/api/"), (route) => route.fulfill({ status: 404, json: { title: "Not mocked", status: 404 } }))
  await page.route("**/api/identity/account/session", (route) => route.fulfill({ json: SESSION }))
  await page.route("**/api/alert-inbox/**", (route) => route.fulfill({ json: envelope(null) }))
  // Stripe.js is not under test here; when its CDN stalls, the page load event never fires and goto times out.
  await page.route("https://js.stripe.com/**", (route) => route.abort())
  await page.route("**/api/organizer/custom-invoices/enabled-modules", (route) => route.fulfill({ json: envelope(["Event", "Membership"]) }))
  await page.route("**/api/organizer/custom-invoices/filter-options", (route) => route.fulfill({ json: FILTER_OPTIONS }))
  await page.route("**/api/organizer/custom-invoices/categories/list?**", (route) =>
    route.fulfill({ json: envelope({ pageData: [{ uniqueId: "category-1", name: "Gold Sponsorship", isActive: true }] }) }),
  )
  await page.route(`**${LIST_API_PATH}?**`, (route) => route.fulfill({ json: listPage(rows, new URL(route.request().url())) }))
}

const isListRequest = (request: Request) => new URL(request.url()).pathname === LIST_API_PATH

/** Opens a path at a width and waits for the list's first answer, so assertions never race the fetch. */
async function openList(page: Page, width: number, path = LIST_URL) {
  await page.setViewportSize({ width, height: VIEWPORT_HEIGHT })
  const firstRequest = page.waitForRequest(isListRequest)
  await page.goto(path)
  const request = await firstRequest
  await expect(page.getByRole("heading", { name: "Custom Invoices" })).toBeVisible({ timeout: 30_000 })
  return request
}

async function expectTouchSized(control: Locator, name: string) {
  await expect(control, `${name} is not on screen`).toBeVisible()
  const box = await control.boundingBox()
  expect.soft(box?.height ?? 0, `${name} is under ${MIN_TOUCH_TARGET_PX}px tall`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX)
}

const statusChip = (page: Page, label: string) => page.getByRole("group", { name: "Status" }).getByRole("button", { name: label, exact: true })

for (const width of WIDTHS) {
  /**
   * LIST-01 at every width: the page never slides sideways, the status chips, New Invoice, every row's
   * actions and the shared pagination stay on screen at fingertip size, and the wide table hands over to
   * cards below tablet width so no column is clipped.
   */
  test(`the custom invoice list keeps filters, rows and paging reachable without page overflow at ${width}px`, async ({ page }) => {
    await mockShell(page)
    await openList(page, width)
    await expect(page.getByRole("link", { name: "CI-0001" })).toBeVisible()

    expect(await findHorizontalPageOverflow(page), "the custom invoice list scrolls the page sideways").toEqual([])

    for (const label of ["Paid", "Pending Payment", "Overdue", "Cancelled"]) {
      await expectTouchSized(statusChip(page, label), `the ${label} chip`)
    }
    await expectTouchSized(page.getByRole("link", { name: "New Invoice" }), "New Invoice")
    await expectTouchSized(page.getByRole("button", { name: "Actions for invoice CI-0001" }), "the row actions")
    const next = page.getByRole("button", { name: "Next" })
    await next.scrollIntoViewIfNeeded()
    await expectTouchSized(next, "the Next page control")

    const cards = page.getByRole("list", { name: "Custom invoices matching the current filters" })
    if (width >= TABLE_MIN_WIDTH) {
      await expect(page.getByRole("table")).toBeVisible()
      await expect(cards).toBeHidden()
    } else {
      await expect(cards).toBeVisible()
      await expect(page.getByRole("table")).toBeHidden()
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/list-${width}.png`, fullPage: true })
  })
}

for (const width of SCREENSHOT_WIDTHS) {
  /**
   * SC4 / D-11: opened from a module's Custom Invoices child, the list shows that module only, says so, never
   * lets the module be changed, asks the server for that module alone, and starts New Invoice with it preset.
   */
  test(`the module-locked list asks only for Event invoices and presets New Invoice at ${width}px`, async ({ page }) => {
    await mockShell(page)
    const request = await openList(page, width, `${LIST_URL}?moduleType=Event`)

    expect(new URL(request.url()).searchParams.get("moduleType")).toBe("Event")
    const moduleControl = page.getByRole("combobox", { name: "Module" })
    await expect(moduleControl).toBeDisabled()
    await expect(moduleControl).toContainText("Event")
    await expect(page.getByRole("link", { name: "New Invoice" })).toHaveAttribute("href", "/organizer/custom-invoices/new?moduleType=Event")
    expect(await findHorizontalPageOverflow(page), "the locked list scrolls the page sideways").toEqual([])

    await page.screenshot({ path: `${SCREENSHOT_DIR}/list-locked-event-${width}.png`, fullPage: true })
  })
}

/** SC5: an organizer with no invoices is told what is missing and offered New Invoice, not a blank table. */
test("the empty list names New Invoice as the next action", async ({ page }) => {
  await mockShell(page, [])
  await openList(page, 1440)

  await expect(page.getByText("No custom invoices yet")).toBeVisible()
  await expect(page.getByText("Create one with New Invoice.")).toBeVisible()
  await expect(page.getByRole("link", { name: "New Invoice" })).toHaveCount(2)

  await page.screenshot({ path: `${SCREENSHOT_DIR}/list-empty-1440.png`, fullPage: true })
})

/** SC2 / D-14: two status chips together ask the server for both statuses in one request, as a union. */
test("selecting Overdue and Pending Payment sends both statuses in the next list request", async ({ page }) => {
  await mockShell(page)
  await openList(page, 1440)

  await statusChip(page, "Overdue").click()
  await expect(statusChip(page, "Overdue")).toHaveAttribute("aria-pressed", "true")
  const bothStatuses = page.waitForRequest(
    (request) => isListRequest(request) && new URL(request.url()).searchParams.getAll("statuses").length === 2,
  )
  await statusChip(page, "Pending Payment").click()

  const statuses = new URL((await bothStatuses).url()).searchParams.getAll("statuses")
  expect(statuses.sort()).toEqual(["Overdue", "PendingPayment"])
})

/** Opens the navigation drawer on a phone; the desktop sidebar is always open. */
async function revealNavigation(page: Page) {
  const openNavigation = page.getByRole("button", { name: "Open navigation" })
  if (await openNavigation.isVisible()) {
    await openNavigation.click()
  }
}

for (const width of SCREENSHOT_WIDTHS) {
  /**
   * SC1 / SC3: the standalone Custom Invoices parent holds Invoices and Categories, the Events group carries
   * its module-locked Custom Invoices child, an enabled Membership gets its own group and a disabled
   * Donation gets none; each of these controls takes a fingertip.
   */
  test(`the sidebar shows the Custom Invoices parent and the enabled module groups at ${width}px`, async ({ page }) => {
    await mockShell(page)
    await openList(page, width, `${LIST_URL}?moduleType=Event`)
    await revealNavigation(page)

    const eventsChild = page.getByRole("link", { name: "Custom Invoices", exact: true }).first()
    await expect(eventsChild).toHaveAttribute("href", "/organizer/custom-invoices/list?moduleType=Event")
    await expect(eventsChild).toHaveAttribute("aria-current", "page")

    const parent = page.getByRole("button", { name: /^Custom Invoices$/ })
    await parent.click()
    const invoices = page.getByRole("link", { name: "Invoices", exact: true })
    const categories = page.getByRole("link", { name: "Categories", exact: true })
    await expect(invoices).toHaveAttribute("href", LIST_URL)
    await expect(categories).toHaveAttribute("href", "/organizer/custom-invoices/categories")

    const membership = page.getByRole("button", { name: /^Membership$/ })
    await expect(membership).toBeVisible()
    await expect(page.getByRole("button", { name: /^Donation$/ })).toHaveCount(0)

    for (const [name, control] of [
      ["the Events Custom Invoices child", eventsChild],
      ["the Custom Invoices parent", parent],
      ["Invoices", invoices],
      ["Categories", categories],
      ["the Membership group", membership],
    ] as const) {
      await control.scrollIntoViewIfNeeded()
      await expectTouchSized(control, name)
    }

    await parent.scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/sidebar-${width}-after.png` })
  })

  /** SC4 / D-11: New Invoice from a module child opens the editor with that module preset and locked. */
  test(`the editor opened for Membership presets the module and locks it at ${width}px`, async ({ page }) => {
    await mockShell(page)
    await page.setViewportSize({ width, height: VIEWPORT_HEIGHT })
    await page.goto("/organizer/custom-invoices/new?moduleType=Membership")

    const moduleControl = page.getByRole("combobox", { name: "Module" })
    await expect(moduleControl).toContainText("Membership", { timeout: 30_000 })
    await expect(moduleControl).toBeDisabled()
    expect(await findHorizontalPageOverflow(page), "the locked editor scrolls the page sideways").toEqual([])

    await page.screenshot({ path: `${SCREENSHOT_DIR}/editor-locked-module-${width}.png`, fullPage: true })
  })
}
