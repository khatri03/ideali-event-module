import { expect, test, type Locator, type Page } from "@playwright/test"
import { findHorizontalPageOverflow, findUndersizedTargets, MIN_TOUCH_TARGET_PX } from "./responsiveChecks"

/**
 * Phase 09 width coverage for the full-page custom invoice editor, driven against mocked API responses because
 * the check is about layout and reachability, not the server. An organizer bills a sponsor from a phone as often
 * as from a desk, so at every width the form must stay inside the page, every action must be reachable, and the
 * summary must sit where the organizer can see the total they are about to send.
 */

const WIDTHS = [320, 375, 768, 1024, 1440, 1920] as const
const AFTER_WIDTHS: readonly number[] = [375, 1440]
const EDIT_WIDTHS = [375, 1440] as const
const VIEWPORT_HEIGHT = 900
// Chakra's lg breakpoint: from here the summary moves beside the form instead of under it.
const TWO_PANE_FROM_PX = 992
const SCREENSHOT_DIR = ".planning/phases/09-full-page-invoice-editor/screenshots"

const NEW_URL = "/organizer/custom-invoices/new"
const EDITABLE_ID = "c0000000-0000-4000-8000-000000000300"
const PAID_ID = "c0000000-0000-4000-8000-000000000301"
const editUrl = (invoiceUniqueId: string) => `/organizer/custom-invoices/${invoiceUniqueId}/edit`

type Json = Record<string, unknown>

/** Wraps a payload the way every API response arrives, so the Zod boundary parses it as it would in production. */
function envelope(data: unknown) {
  return { success: true, message: null, timestamp: "2026-10-07T10:00:00Z", data }
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

// Long names on purpose: a record name that does not wrap is the usual way a dropdown pushes a phone sideways.
const ENTITY_OPTION_PAGES: Json[][] = [
  Array.from({ length: 6 }, (_, index) => ({
    uniqueId: `entity-${index + 1}`,
    name: `Northwind Annual Sponsorship and Partnership Programme ${2026 + index} Gold Tier Renewal`,
  })),
  [{ uniqueId: "entity-7", name: "Contoso Patron Circle" }],
]

const CATEGORIES = envelope({
  pageData: [
    { uniqueId: "category-1", name: "Gold Sponsorship", isActive: true },
    { uniqueId: "category-2", name: "Booth Rental", isActive: true },
  ],
})

/** A same-module invoice the link picker offers; defaults to an unpaid one so each row states only its status. */
function linkCandidate(overrides: Json): Json {
  return {
    invoiceUniqueId: "c0000000-0000-4000-8000-000000000400",
    invoiceNo: "INV-C-400",
    companyName: "Northwind Traders",
    buyerFirstName: "Jane",
    buyerMiddleName: null,
    buyerLastName: "Doe",
    buyerName: "Jane Doe",
    buyerEmail: "jane@northwind.example",
    invoiceDateUtc: "2026-09-01T12:00:00Z",
    invoiceStatus: "PendingPayment",
    invoiceStatusLabel: "Pending Payment",
    ...overrides,
  }
}

const LINK_CANDIDATES = [
  linkCandidate({ invoiceStatus: "Paid", invoiceStatusLabel: "Paid" }),
  linkCandidate({ invoiceUniqueId: "c0000000-0000-4000-8000-000000000401", invoiceNo: "INV-C-401", buyerName: "Sam Lee", buyerEmail: "sam@contoso.example" }),
  linkCandidate({
    invoiceUniqueId: "c0000000-0000-4000-8000-000000000402",
    invoiceNo: "INV-C-402",
    invoiceStatus: "Cancelled",
    invoiceStatusLabel: "Cancelled",
  }),
]

/** The editable values of a saved invoice billed to an Event; a test overrides only the state its rule is about. */
function forEdit(overrides: Json = {}): Json {
  return {
    invoiceUniqueId: EDITABLE_ID,
    moduleType: "Event",
    entityUniqueId: "event-1",
    entityName: "Annual Convention",
    categoryUniqueId: "category-1",
    dueDateUtc: "2026-10-30T12:00:00Z",
    companyName: "Northwind Traders",
    firstName: "Jane",
    middleName: "",
    lastName: "Doe",
    cellPhone: "555-0100",
    email: "jane@northwind.example",
    specialNotes: "Net 30",
    invoiceStatus: "PendingPayment",
    canEdit: true,
    lineItems: [
      { description: "Booth rental", amount: "1500.00" },
      { description: "Logo placement", amount: "250.50" },
    ],
    ...overrides,
  }
}

/** The same invoice as its detail reports it, which feeds the summary's status, payable link and delivery. */
function detail(overrides: Json = {}): Json {
  return {
    invoiceUniqueId: EDITABLE_ID,
    invoiceNo: "INV-C-300",
    invoiceStatus: "PendingPayment",
    invoiceStatusLabel: "Pending Payment",
    invoiceDateUtc: "2026-10-01T12:00:00Z",
    moduleType: "Event",
    entityUniqueId: "event-1",
    entityName: "Annual Convention",
    categoryName: "Gold Sponsorship",
    dueDateUtc: "2026-10-30T12:00:00Z",
    isOverdue: false,
    specialNotes: "Net 30",
    companyName: "Northwind Traders",
    buyerFirstName: "Jane",
    buyerMiddleName: null,
    buyerLastName: "Doe",
    buyerName: "Jane Doe",
    buyerEmail: "jane@northwind.example",
    buyerPhone: "555-0100",
    subTotal: "1750.50",
    totalAmount: "1750.50",
    balanceAmount: "1750.50",
    currencySymbol: "$",
    lineItems: [
      { invoiceItemUniqueId: "line-1", description: "Booth rental", amount: "1500.00" },
      { invoiceItemUniqueId: "line-2", description: "Logo placement", amount: "250.50" },
    ],
    linkedInvoice: null,
    lastSentAtUtc: null,
    notes: [],
    payments: [],
    canEdit: true,
    canMarkAsPaid: true,
    canCancel: true,
    canPayOnline: true,
    canSend: true,
    ...overrides,
  }
}

const PAID_OVERRIDES: Json = { invoiceUniqueId: PAID_ID, invoiceStatus: "Paid", canEdit: false }
const PAID_DETAIL_OVERRIDES: Json = {
  ...PAID_OVERRIDES,
  invoiceNo: "INV-C-301",
  invoiceStatusLabel: "Paid",
  balanceAmount: "0",
  lastSentAtUtc: "2026-10-02T12:00:00Z",
  canMarkAsPaid: false,
  canCancel: false,
  canPayOnline: false,
  canSend: false,
}

/**
 * Mocks the organizer shell and every route the editor calls. An unmatched API call gets a 404 instead of
 * reaching a backend that is not running, so a missing mock fails loudly rather than hanging on a network timeout.
 */
async function mockEditor(page: Page) {
  // Matched on the path prefix: a glob like **/api/** would also swallow Vite's /src/api/*.ts modules.
  await page.route((url) => url.pathname.startsWith("/api/"), (route) => route.fulfill({ status: 404, json: { title: "Not mocked", status: 404 } }))
  await page.route("**/api/identity/account/session", (route) => route.fulfill({ json: SESSION }))
  await page.route("**/api/alert-inbox/**", (route) => route.fulfill({ json: envelope(null) }))
  await page.route("**/api/organizer/custom-invoices/enabled-modules", (route) => route.fulfill({ json: envelope(["Event", "Membership"]) }))
  await page.route("**/api/organizer/custom-invoices/categories/list?**", (route) => route.fulfill({ json: CATEGORIES }))
  await page.route("**/api/organizer/custom-invoices/entity-options?**", (route) => {
    const pageNo = Number(new URL(route.request().url()).searchParams.get("pageNo") ?? "1")
    const pageData = ENTITY_OPTION_PAGES[pageNo - 1] ?? []
    return route.fulfill({ json: envelope({ pageNo, pageSize: 20, pageCount: ENTITY_OPTION_PAGES.length, totalRecordsCount: 7, pageData }) })
  })
  await page.route("**/api/organizer/custom-invoices/link-candidates?**", (route) =>
    route.fulfill({ json: envelope({ pageNo: 1, pageSize: 10, pageCount: 1, totalRecordsCount: LINK_CANDIDATES.length, pageData: LINK_CANDIDATES }) }),
  )
  await page.route(`**/api/organizer/custom-invoices/${EDITABLE_ID}/edit`, (route) => route.fulfill({ json: envelope(forEdit()) }))
  await page.route(`**/api/organizer/custom-invoices/${EDITABLE_ID}`, (route) => route.fulfill({ json: envelope(detail()) }))
  await page.route(`**/api/organizer/custom-invoices/${PAID_ID}/edit`, (route) => route.fulfill({ json: envelope(forEdit(PAID_OVERRIDES)) }))
  await page.route(`**/api/organizer/custom-invoices/${PAID_ID}`, (route) => route.fulfill({ json: envelope(detail(PAID_DETAIL_OVERRIDES)) }))
}

const pageTitle = (page: Page, title: string) => page.getByText(title, { exact: true })
const region = (page: Page, name: string) => page.getByRole("region", { name })
const summary = (page: Page) => page.getByRole("complementary", { name: "Invoice summary" })
const moduleSelect = (page: Page) => page.getByRole("combobox", { name: "Module" })

/** Opens a page of the editor at a width and waits for its title and categories, so assertions never race the first fetch. */
async function openEditor(page: Page, url: string, title: string, width: number) {
  await page.setViewportSize({ width, height: VIEWPORT_HEIGHT })
  await page.goto(url)
  await expect(pageTitle(page, title)).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole("combobox", { name: "Sponsorship type" })).not.toContainText("Loading types...")
}

async function chooseModule(page: Page, moduleName: string) {
  await moduleSelect(page).click()
  await page.getByRole("option", { name: moduleName, exact: true }).click()
  await expect(moduleSelect(page)).toContainText(moduleName)
}

async function boxOf(target: Locator) {
  const box = await target.boundingBox()
  expect(box, "the element was not on screen to measure").not.toBeNull()
  return box!
}

/** Scrolls the routed page content to its end, returning how far it moved so a page that cannot scroll is visible. */
async function scrollContentToEnd(anchor: Locator): Promise<number> {
  return await anchor.evaluate((start) => {
    let container: Element | null = start.parentElement
    while (container && !["auto", "scroll"].includes(getComputedStyle(container).overflowY)) {
      container = container.parentElement
    }
    const scroller = container ?? document.scrollingElement ?? document.documentElement
    scroller.scrollTo(0, scroller.scrollHeight)
    return scroller.scrollTop
  })
}

async function expectNoUndersizedControls(page: Page, title: string, width: number) {
  const undersized = await findUndersizedTargets(pageTitle(page, title), true)
  expect(undersized, `controls under ${MIN_TOUCH_TARGET_PX}px on the editor at ${width}px`).toEqual([])
}

for (const width of WIDTHS) {
  /**
   * EDIT-01. Authoring an invoice must work at every width: the page never slides sideways, every section and
   * the create action are on the page, no control is smaller than a fingertip, and the summary sits under the
   * form on narrow screens and beside it from lg, so the total is never squeezed into an unreadable column.
   */
  test(`the new invoice editor keeps every section and action reachable without page overflow at ${width}px`, async ({ page }) => {
    await mockEditor(page)
    await openEditor(page, NEW_URL, "New custom invoice", width)

    expect(await findHorizontalPageOverflow(page), "the editor scrolls the page sideways").toEqual([])

    for (const name of ["About", "Bill to", "Charges"]) {
      await expect(region(page, name), `the ${name} section is missing at ${width}px`).toBeVisible()
    }
    await expect(summary(page)).toBeVisible()
    const create = summary(page).getByRole("button", { name: "Create and email invoice" })
    await create.scrollIntoViewIfNeeded()
    await expect(create, "the create action is off screen").toBeInViewport()

    await expectNoUndersizedControls(page, "New custom invoice", width)

    const formBox = await boxOf(region(page, "About"))
    const chargesBox = await boxOf(region(page, "Charges"))
    const summaryBox = await boxOf(summary(page))
    if (width < TWO_PANE_FROM_PX) {
      expect(summaryBox.y, "the summary is not under the form on a narrow screen").toBeGreaterThanOrEqual(chargesBox.y + chargesBox.height)
    } else {
      expect(summaryBox.x, "the summary is not beside the form from lg").toBeGreaterThanOrEqual(formBox.x + formBox.width)
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/editor-new-${width}.png`, fullPage: true })
    if (AFTER_WIDTHS.includes(width)) {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/editor-new-${width}-after.png`, fullPage: true })
    }
  })
}

/**
 * EDIT-01. Beside a long form the summary must stay in view while the organizer scrolls to the last charge,
 * or the total and the create action vanish exactly when they are needed.
 */
test("the summary stays in view while the form scrolls at 1440px", async ({ page }) => {
  await mockEditor(page)
  await openEditor(page, NEW_URL, "New custom invoice", 1440)

  const scrolledBy = await scrollContentToEnd(region(page, "Charges"))
  expect(scrolledBy, "the editor did not scroll, so stickiness was not exercised").toBeGreaterThan(0)

  await expect(summary(page).getByText("Summary", { exact: true })).toBeInViewport()
  await expect(summary(page).getByRole("button", { name: "Create and email invoice" })).toBeInViewport()
})

/**
 * MOD-03. On a phone the record dropdown must open inside the screen, and Load more must be reachable so the
 * organizer can reach records past the first server page without the page sliding sideways.
 */
test("the entity dropdown opens within a phone screen with Load more reachable at 375px", async ({ page }) => {
  await mockEditor(page)
  await openEditor(page, NEW_URL, "New custom invoice", 375)
  await chooseModule(page, "Membership")

  await page.getByRole("combobox", { name: "Membership", exact: true }).click()
  const listbox = page.getByRole("listbox")
  await expect(listbox.getByRole("option").first()).toBeVisible()

  const listBox = await boxOf(listbox)
  expect(listBox.x, "the dropdown starts off the left edge").toBeGreaterThanOrEqual(0)
  expect(listBox.x + listBox.width, "the dropdown runs off the right edge").toBeLessThanOrEqual(375 + 1)

  const loadMore = listbox.getByRole("button", { name: "Load more" })
  await loadMore.scrollIntoViewIfNeeded()
  await expect(loadMore, "Load more is out of reach").toBeInViewport()
  expect(await findHorizontalPageOverflow(page), "the open dropdown makes the page scroll sideways").toEqual([])

  await page.screenshot({ path: `${SCREENSHOT_DIR}/editor-entity-dropdown-375.png` })
})

/**
 * LINK-03. Switching the link on shows a wide picker table on a phone; it must scroll inside its own box so the
 * page itself never slides sideways, and every status the server offers must be listed for the organizer to judge.
 */
test("the link picker scrolls inside its own box at 375px", async ({ page }) => {
  await mockEditor(page)
  await openEditor(page, NEW_URL, "New custom invoice", 375)
  await chooseModule(page, "Event")

  await page.getByText("Link to an existing invoice", { exact: true }).click()
  const table = page.getByRole("table", { name: "Invoices this invoice can be linked to" })
  for (const invoiceNo of ["INV-C-400", "INV-C-401", "INV-C-402"]) {
    await expect(table.getByText(invoiceNo, { exact: true })).toBeVisible()
  }

  const tableBox = table.locator("xpath=..")
  expect(await tableBox.evaluate((element) => getComputedStyle(element).overflowX)).toMatch(/auto|scroll/)
  expect(await tableBox.evaluate((element) => element.scrollWidth > element.clientWidth), "the picker table does not scroll in its own box").toBe(true)
  expect(await findHorizontalPageOverflow(page), "the link picker makes the page scroll sideways").toEqual([])

  await page.screenshot({ path: `${SCREENSHOT_DIR}/editor-link-on-375.png`, fullPage: true })
})

for (const width of EDIT_WIDTHS) {
  /**
   * EDIT-02. What an invoice bills is fixed once it exists, so on the edit page module and record must be
   * read-only, and the summary must say the buyer has not been emailed yet when the server has no send on record.
   */
  test(`the edit page shows a fixed module and record and the Not sent state at ${width}px`, async ({ page }) => {
    await mockEditor(page)
    await openEditor(page, editUrl(EDITABLE_ID), "Edit custom invoice", width)

    expect(await findHorizontalPageOverflow(page), "the edit page scrolls the page sideways").toEqual([])
    await expect(moduleSelect(page)).toBeDisabled()
    await expect(moduleSelect(page)).toContainText("Event")
    const entity = page.getByRole("textbox", { name: "Event", exact: true })
    await expect(entity).toHaveValue("Annual Convention")
    await expect(entity).not.toBeEditable()
    await expect(summary(page).getByText("Not sent", { exact: true })).toBeVisible()
    await expect(summary(page).getByRole("button", { name: "Save changes" })).toBeVisible()

    await expectNoUndersizedControls(page, "Edit custom invoice", width)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/editor-edit-${width}.png`, fullPage: true })
  })
}

/**
 * EDIT-04. A paid invoice is a settled record: its edit page must say it is locked and offer no Save or Email
 * link, so the organizer is never invited to make a change the server will refuse.
 */
test("a paid invoice's edit page shows the lock banner and no Save at 375px", async ({ page }) => {
  await mockEditor(page)
  await openEditor(page, editUrl(PAID_ID), "Edit custom invoice", 375)

  await expect(page.getByRole("alert").filter({ hasText: "This invoice can no longer be edited." })).toBeVisible()
  await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Email link" })).toHaveCount(0)
  expect(await findHorizontalPageOverflow(page), "the locked edit page scrolls the page sideways").toEqual([])

  await page.screenshot({ path: `${SCREENSHOT_DIR}/editor-paid-readonly-375.png`, fullPage: true })
})
