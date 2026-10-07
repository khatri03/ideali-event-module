import { expect, test, type Locator, type Page, type Request } from "@playwright/test"
import { findHorizontalPageOverflow, findUndersizedTargets, MIN_TOUCH_TARGET_PX } from "./responsiveChecks"

/**
 * Phase 03 and 04 UAT for custom invoices, driven against mocked API responses because the check is about
 * what the organizer sees and sends, not about the server. Every width in the project's responsive range is
 * walked, since the organizer works these screens from a phone as often as from a desk. Custom invoices are
 * listed on their own cross-module list; Event Invoices is still mocked for the ticket-order resend check.
 */

const WIDTHS = [320, 375, 768, 1024, 1440, 1920] as const
const SCREENSHOT_WIDTHS: readonly number[] = [375, 1440]
const VIEWPORT_HEIGHT = 900
const SCREENSHOT_DIR = "test-results/uat-03"

const CUSTOM_ID = "c0000000-0000-4000-8000-000000000100"
const CUSTOM_DUE_TODAY_ID = "c0000000-0000-4000-8000-000000000101"
const PAID_CUSTOM_ID = "c0000000-0000-4000-8000-000000000102"
const TICKET_ID = "70000000-0000-4000-8000-000000000200"

const LIST_URL = "/organizer/events/invoices"
const LIST_API = "**/api/organizer/events/invoices/list**"
const CUSTOM_LIST_URL = "/organizer/custom-invoices/list"
const CUSTOM_LIST_PATH = "/api/organizer/custom-invoices/list"
const detailPath = (invoiceUniqueId: string) => `/organizer/custom-invoices/${invoiceUniqueId}`
const detailApi = (invoiceUniqueId: string) => `**/api/organizer/custom-invoices/${invoiceUniqueId}`
const LINK_CANDIDATES_API = "**/api/organizer/custom-invoices/link-candidates?**"
const linkPath = (invoiceUniqueId: string) => `/api/organizer/custom-invoices/${invoiceUniqueId}/link`

type Json = Record<string, unknown>

/** Wraps a payload the way every API response arrives, so the Zod boundary parses it as it would in production. */
function envelope(data: unknown) {
  return { success: true, message: null, timestamp: "2026-09-29T10:00:00Z", data }
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

/**
 * One list row with server-decided flags. Defaults describe an unpaid custom invoice so each test states
 * only the fields its rule depends on.
 */
function listRow(overrides: Json): Json {
  return {
    invoiceUniqueId: CUSTOM_ID,
    invoiceNo: "INV-C-100",
    eventUniqueId: "event-1",
    eventName: "Annual Convention",
    buyerName: "Jane Doe",
    buyerEmail: "jane@northwind.example",
    invoiceStatus: "PendingPayment",
    invoiceStatusLabel: "Pending Payment",
    invoiceType: "Custom",
    invoiceTypeLabel: "Custom",
    dueDateUtc: "2026-09-10T12:00:00Z",
    companyName: "Northwind Traders",
    isOverdue: false,
    canMarkAsPaid: true,
    canCancel: true,
    canSend: true,
    canEdit: true,
    invoiceDateUtc: "2026-09-01T12:00:00Z",
    totalAmount: "1750.50",
    balanceAmount: "1750.50",
    paymentMethod: null,
    paymentSource: null,
    currencySymbol: "$",
    ticketCount: 0,
    ...overrides,
  }
}

const OVERDUE_CUSTOM_ROW = listRow({ isOverdue: true })
const DUE_TODAY_CUSTOM_ROW = listRow({
  invoiceUniqueId: CUSTOM_DUE_TODAY_ID,
  invoiceNo: "INV-C-101",
  companyName: "Contoso Ltd",
  buyerName: "Sam Lee",
  dueDateUtc: "2026-09-29T12:00:00Z",
  isOverdue: false,
})
const LINK_CANDIDATE: Json = {
  invoiceUniqueId: CUSTOM_DUE_TODAY_ID,
  invoiceNo: "INV-C-101",
  companyName: "Contoso Ltd",
  buyerFirstName: "Sam",
  buyerMiddleName: null,
  buyerLastName: "Lee",
  buyerName: "Sam Lee",
  buyerEmail: "sam@contoso.test",
  invoiceDateUtc: "2026-09-01T12:00:00Z",
  invoiceStatus: "PendingPayment",
  invoiceStatusLabel: "Pending Payment",
}
const TICKET_ROW = listRow({
  invoiceUniqueId: TICKET_ID,
  invoiceNo: "INV-T-200",
  invoiceType: "Regular",
  invoiceTypeLabel: "Regular",
  invoiceStatus: "Paid",
  invoiceStatusLabel: "Paid",
  buyerName: "Tom Buyer",
  buyerEmail: "tom@example.com",
  companyName: null,
  dueDateUtc: null,
  canMarkAsPaid: false,
  canCancel: false,
  canEdit: false,
  ticketCount: 2,
})

/** A row of the cross-module custom invoice list, built from the same invoice an Event Invoices row describes. */
function customListRow(row: Json): Json {
  return {
    invoiceUniqueId: row.invoiceUniqueId,
    invoiceNo: row.invoiceNo,
    moduleType: "Event",
    entityName: row.eventName,
    companyName: row.companyName,
    buyerName: row.buyerName,
    buyerEmail: row.buyerEmail,
    categoryName: "Gold Sponsorship",
    dueDateUtc: row.dueDateUtc,
    invoiceDateUtc: row.invoiceDateUtc,
    totalAmount: row.totalAmount,
    currencySymbol: row.currencySymbol,
    invoiceStatus: row.invoiceStatus,
    isOverdue: row.isOverdue,
    statusLabel: row.isOverdue ? "Overdue" : row.invoiceStatusLabel,
    canMarkAsPaid: row.canMarkAsPaid,
    canCancel: row.canCancel,
    canSend: row.canSend,
  }
}

/** A page of list rows in the server's paging envelope; the total comes from the server, never the client. */
function listPage(rows: Json[]) {
  return envelope({ pageData: rows, totalRecordsCount: rows.length, pageNo: 1, pageSize: 20, pageCount: 1 })
}

/**
 * A custom invoice detail in the custom-invoices endpoint's shape, carrying every section UAT 3 names. Defaults
 * are an unpaid, editable, unlinked invoice billed to an Event; a test overrides only the state its rule is about.
 */
function customDetail(overrides: Json = {}): Json {
  return {
    invoiceUniqueId: CUSTOM_ID,
    invoiceNo: "INV-C-100",
    invoiceStatus: "PendingPayment",
    invoiceStatusLabel: "Pending Payment",
    invoiceDateUtc: "2026-09-01T12:00:00Z",
    moduleType: "Event",
    entityUniqueId: "event-1",
    entityName: "Annual Convention",
    subTotal: "1750.50",
    totalAmount: "1750.50",
    balanceAmount: "1750.50",
    currencySymbol: "$",
    buyerName: "Jane Doe",
    buyerEmail: "jane@northwind.example",
    buyerPhone: "555-0100",
    lineItems: [
      { invoiceItemUniqueId: "line-1", description: "Booth rental", amount: "1500.00" },
      { invoiceItemUniqueId: "line-2", description: "Logo placement", amount: "250.50" },
    ],
    notes: [{ note: "Sent to accounts payable", createdBy: "organizer", createdOnUtc: "2026-09-02T12:00:00Z" }],
    payments: [
      {
        paymentMethod: "CreditCard",
        paymentStatus: "Failed",
        paymentStatusLabel: "Failed",
        amount: "1750.50",
        referenceNo: "pi_uat_0001",
        errorMessage: "Card declined",
        paymentDateUtc: "2026-09-03T12:00:00Z",
      },
    ],
    categoryName: "Gold Sponsorship",
    dueDateUtc: "2026-09-10T12:00:00Z",
    isOverdue: true,
    specialNotes: "Net 30, PO 4471 required on remittance",
    companyName: "Northwind Traders",
    buyerFirstName: "Jane",
    buyerMiddleName: "Q",
    buyerLastName: "Doe",
    canMarkAsPaid: true,
    canCancel: true,
    canPayOnline: false,
    canSend: true,
    canEdit: true,
    linkedInvoice: null,
    ...overrides,
  }
}

/** The second custom invoice a custom invoice gets linked to; links run between custom invoices only. */
function linkTargetDetail(overrides: Json = {}): Json {
  return customDetail({
    invoiceUniqueId: CUSTOM_DUE_TODAY_ID,
    invoiceNo: "INV-C-101",
    companyName: "Contoso Ltd",
    buyerName: "Sam Lee",
    dueDateUtc: "2026-09-29T12:00:00Z",
    isOverdue: false,
    ...overrides,
  })
}

/**
 * Mocks everything the authenticated shell asks for. An unmatched API call gets a 404 instead of reaching
 * a backend that is not running, so a missing mock fails loudly rather than hanging on a network timeout.
 */
async function mockShell(page: Page) {
  // Matched on the path prefix: a glob like **/api/** would also swallow Vite's /src/api/*.ts modules.
  await page.route((url) => url.pathname.startsWith("/api/"), (route) => route.fulfill({ status: 404, json: { title: "Not mocked", status: 404 } }))
  await page.route("**/api/identity/account/session", (route) => route.fulfill({ json: SESSION }))
  await page.route("**/api/alert-inbox/**", (route) => route.fulfill({ json: envelope(null) }))
  // Stripe.js is not under test here; when its CDN stalls, the page load event never fires and goto times out.
  await page.route("https://js.stripe.com/**", (route) => route.abort())
  await page.route("**/api/organizer/events/invoices/filter-options", (route) =>
    route.fulfill({ json: envelope({ events: [], sessions: [] }) }),
  )
}

/** Serves the invoice list, letting a test answer by the request's own query so filters are proven server-side. */
async function mockList(page: Page, rowsFor: (url: URL) => Json[]) {
  await page.route(LIST_API, (route) => route.fulfill({ json: listPage(rowsFor(new URL(route.request().url()))) }))
}

/** Serves the custom invoice list by the request's own query, so a filter is proven to reach the server. */
async function mockCustomList(page: Page, rowsFor: (url: URL) => Json[]) {
  await page.route("**/api/organizer/custom-invoices/enabled-modules", (route) => route.fulfill({ json: envelope(["Event"]) }))
  await page.route("**/api/organizer/custom-invoices/filter-options", (route) =>
    route.fulfill({ json: envelope({ moduleTypes: ["Event"], categories: [] }) }),
  )
  await page.route(`**${CUSTOM_LIST_PATH}?**`, (route) =>
    route.fulfill({ json: listPage(rowsFor(new URL(route.request().url())).map(customListRow)) }),
  )
}

/** Serves one invoice's detail; the resolver runs per request so a refetch can observe state a mutation changed. */
async function mockDetail(page: Page, invoiceUniqueId: string, resolve: () => Json) {
  await page.route(detailApi(invoiceUniqueId), (route) =>
    route.request().method() === "GET" ? route.fulfill({ json: envelope(resolve()) }) : route.fallback(),
  )
}

/**
 * Serves what the full-page editor loads for CUSTOM_ID beyond its detail: the editable values, the enabled
 * modules and the active sponsorship types. The values mirror `customDetail()` so the form opens on the same invoice.
 */
async function mockEditForm(page: Page) {
  await page.route(`${detailApi(CUSTOM_ID)}/edit`, (route) =>
    route.fulfill({
      json: envelope({
        invoiceUniqueId: CUSTOM_ID,
        moduleType: "Event",
        entityUniqueId: "event-1",
        entityName: "Annual Convention",
        categoryUniqueId: "category-1",
        dueDateUtc: "2026-09-10T12:00:00Z",
        companyName: "Northwind Traders",
        firstName: "Jane",
        middleName: "Q",
        lastName: "Doe",
        cellPhone: "555-0100",
        email: "jane@northwind.example",
        specialNotes: "Net 30, PO 4471 required on remittance",
        invoiceStatus: "PendingPayment",
        canEdit: true,
        lineItems: [
          { description: "Booth rental", amount: "1500.00" },
          { description: "Logo placement", amount: "250.50" },
        ],
      }),
    }),
  )
  await page.route("**/api/organizer/custom-invoices/enabled-modules", (route) => route.fulfill({ json: envelope(["Event"]) }))
  await page.route("**/api/organizer/custom-invoices/categories/list?**", (route) =>
    route.fulfill({ json: envelope({ pageData: [{ uniqueId: "category-1", name: "Gold Sponsorship", isActive: true }] }) }),
  )
}

/** Waits out a dialog's entrance animation so it is measured at the size it settles at, not mid-scale. */
async function settle(target: Locator) {
  await expect
    .poll(async () => await target.evaluate((element) => element.getAnimations({ subtree: true }).length), {
      message: "the dialog never finished animating in",
    })
    .toBe(0)
}

/** Opens Event Invoices at a width and waits for the ticket order, so assertions never race the first fetch. */
async function openList(page: Page, width: number) {
  await page.setViewportSize({ width, height: VIEWPORT_HEIGHT })
  await page.goto(LIST_URL)
  await expect(page.getByRole("link", { name: "INV-T-200" })).toBeVisible({ timeout: 30_000 })
}

/** Opens the custom invoice list at a width and waits for the rows, so assertions never race the first fetch. */
async function openCustomList(page: Page, width: number) {
  await page.setViewportSize({ width, height: VIEWPORT_HEIGHT })
  await page.goto(CUSTOM_LIST_URL)
  await expect(page.getByRole("link", { name: "INV-C-100" })).toBeVisible({ timeout: 30_000 })
}

/** Opens a detail at a width and waits for its header, so assertions never race the first fetch. */
async function openDetail(page: Page, invoiceUniqueId: string, invoiceNo: string, width = 1440) {
  await page.setViewportSize({ width, height: VIEWPORT_HEIGHT })
  await page.goto(detailPath(invoiceUniqueId))
  await expect(page.getByText(invoiceNo, { exact: true }).first()).toBeVisible({ timeout: 30_000 })
}

const rowFor = (page: Page, invoiceNo: string) => page.getByRole("row").filter({ hasText: invoiceNo })

/** The table row from tablet width up, the card below it; whichever form the organizer actually sees. */
const customEntryFor = (page: Page, invoiceNo: string, width: number) =>
  width >= 768 ? rowFor(page, invoiceNo) : page.getByRole("listitem").filter({ hasText: invoiceNo })

for (const width of WIDTHS) {
  /**
   * UAT 2. The custom invoice list is how an organizer spots which sponsor owes money; at any width the page
   * must not slide sideways, the wide table must scroll in its own box, and each invoice must show its
   * company and the server's verdict on whether it is overdue, so a due-today invoice is not flagged early.
   */
  test(`UAT 2: the custom invoice list marks overdue invoices without page overflow at ${width}px`, async ({ page }) => {
    await mockShell(page)
    await mockCustomList(page, () => [OVERDUE_CUSTOM_ROW, DUE_TODAY_CUSTOM_ROW])
    await openCustomList(page, width)

    expect.soft(await findHorizontalPageOverflow(page), "the custom invoice list scrolls the page sideways").toEqual([])

    if (width >= 768) {
      const tableBox = page.getByRole("table").locator("xpath=ancestor::div[1]")
      expect(await tableBox.evaluate((element) => getComputedStyle(element).overflowX)).toMatch(/auto|scroll/)
    }

    const newInvoice = page.getByRole("link", { name: "New Invoice" })
    await expect.soft(newInvoice, "the list offers no way to start a custom invoice").toBeVisible()
    expect.soft((await newInvoice.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX)

    const overdueEntry = customEntryFor(page, "INV-C-100", width)
    await expect(overdueEntry.getByText("Overdue", { exact: true })).toBeVisible()
    await expect(overdueEntry.getByText("Sep 10, 2026")).toBeVisible()
    await expect.soft(overdueEntry.getByText("Northwind Traders"), "an invoice does not name the billed company").toBeVisible()

    const dueTodayEntry = customEntryFor(page, "INV-C-101", width)
    await expect(dueTodayEntry.getByText("Pending Payment", { exact: true })).toBeVisible()
    await expect(dueTodayEntry.getByText("Overdue", { exact: true })).toHaveCount(0)

    await expect(page.getByRole("link", { name: "INV-C-100" })).toHaveAttribute("href", `${detailPath(CUSTOM_ID)}/edit`)

    if (SCREENSHOT_WIDTHS.includes(width)) {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/list-${width}.png`, fullPage: true })
    }

    const undersized = await findUndersizedTargets(page.getByRole("heading", { name: "Custom Invoices" }), true)
    expect.soft(undersized, `controls under ${MIN_TOUCH_TARGET_PX}px on the list at ${width}px`).toEqual([])
  })

  /**
   * UAT 3. The custom detail is the record a sponsor is billed from; every section must be readable at every
   * width, or the organizer quoting it on a phone reads a clipped total or a missing due date.
   */
  test(`UAT 3: the custom invoice detail shows every section without page overflow at ${width}px`, async ({ page }) => {
    await mockShell(page)
    await mockDetail(page, CUSTOM_ID, () => customDetail())
    await openDetail(page, CUSTOM_ID, "INV-C-100", width)

    expect(await findHorizontalPageOverflow(page), "the custom invoice detail scrolls the page sideways").toEqual([])

    const expectedText = [
      "Gold Sponsorship",
      "Northwind Traders",
      "Jane Q Doe",
      "Booth rental",
      "$1,500.00",
      "Logo placement",
      "$250.50",
      "Grand total",
      "Net 30, PO 4471 required on remittance",
      "Sent to accounts payable",
      "Payment attempts",
      "pi_uat_0001",
    ]
    for (const text of expectedText) {
      await expect(page.getByText(text, { exact: true }).first(), `"${text}" is not visible at ${width}px`).toBeVisible()
    }
    await expect(page.getByText("$1,750.50").first()).toBeVisible()
    await expect(page.getByText("Sep 10, 2026")).toBeVisible()
    await expect(page.getByText("· Overdue")).toBeVisible()
    await expect(page.getByText("Pending Payment").first()).toBeVisible()

    if (SCREENSHOT_WIDTHS.includes(width)) {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/detail-${width}.png`, fullPage: true })
    }

    const undersized = await findUndersizedTargets(page.locator("[data-print-region]"), true)
    expect.soft(undersized, `controls under ${MIN_TOUCH_TARGET_PX}px on the detail at ${width}px`).toEqual([])
  })
}

/**
 * UAT 4. Linking ties one sponsorship bill to another. The picker must ask the server for invoices of the same
 * module only, leaving the invoice itself out, the request must name the target the organizer picked, the pending state must stop a double submit, and after the refetch
 * both invoices must point at each other - otherwise the other side keeps showing a stale "not linked".
 */
test("UAT 4: linking a custom invoice sends the picked target and both details show the link", async ({ page }) => {
  let isLinked = false
  let releaseLink: () => void = () => undefined
  const linkReleased = new Promise<void>((resolve) => (releaseLink = resolve))
  const linkRequests: Request[] = []

  await mockShell(page)
  await page.route(LINK_CANDIDATES_API, (route) => {
    const search = new URL(route.request().url()).searchParams.get("searchTerm") ?? ""
    const rows = [LINK_CANDIDATE].filter((row) => String(row.invoiceNo).includes(search))
    return route.fulfill({ json: envelope({ pageNo: 1, pageSize: 10, pageCount: 1, totalRecordsCount: rows.length, pageData: rows }) })
  })
  await mockDetail(page, CUSTOM_ID, () =>
    customDetail({ linkedInvoice: isLinked ? { invoiceUniqueId: CUSTOM_DUE_TODAY_ID, invoiceNo: "INV-C-101", invoiceStatusLabel: "Pending Payment" } : null }),
  )
  await mockDetail(page, CUSTOM_DUE_TODAY_ID, () =>
    linkTargetDetail({ linkedInvoice: isLinked ? { invoiceUniqueId: CUSTOM_ID, invoiceNo: "INV-C-100", invoiceStatusLabel: "Pending Payment" } : null }),
  )
  await page.route(`**${linkPath(CUSTOM_ID)}`, async (route) => {
    linkRequests.push(route.request())
    await linkReleased
    isLinked = true
    await route.fulfill({ json: envelope(true) })
  })

  await openDetail(page, CUSTOM_ID, "INV-C-100", 375)
  await page.getByRole("button", { name: "Link invoice" }).click()

  const dialog = page.getByRole("dialog", { name: "Link to an existing invoice" })
  await expect(dialog).toBeVisible()
  await settle(dialog)
  const dialogBox = await dialog.boundingBox()
  expect(dialogBox, "the link dialog was not on screen to measure").not.toBeNull()
  expect(dialogBox!.width, "the link dialog is not full width on a phone").toBeGreaterThanOrEqual(375 - 1)
  expect(dialogBox!.height, "the link dialog is not full height on a phone").toBeGreaterThanOrEqual(VIEWPORT_HEIGHT - 1)
  expect(await findHorizontalPageOverflow(page), "the open link dialog makes the page scroll sideways").toEqual([])

  const searchRequest = page.waitForRequest((request) => new URL(request.url()).searchParams.get("searchTerm") === "INV-C-101")
  await dialog.getByLabel("Search invoices").fill("INV-C-101")
  const searchParams = new URL((await searchRequest).url()).searchParams
  expect(searchParams.get("moduleType"), "the link picker did not ask for the invoice's own module").toBe("Event")
  expect(searchParams.get("excludeInvoiceUniqueId"), "the link picker did not leave the invoice itself out").toBe(CUSTOM_ID)

  await dialog.getByRole("radio", { name: "Select invoice INV-C-101" }).check()

  const undersized = await findUndersizedTargets(dialog, false)
  expect.soft(undersized, `controls under ${MIN_TOUCH_TARGET_PX}px in the link dialog at 375px`).toEqual([])

  await dialog.getByRole("button", { name: "Link invoice", exact: true }).click()
  await expect(dialog.getByRole("button", { name: /Linking\.\.\./ })).toBeDisabled()
  releaseLink()

  await expect(page.getByText("Invoices linked.")).toBeVisible()
  await expect(dialog).toBeHidden()

  expect(linkRequests).toHaveLength(1)
  expect(linkRequests[0].method()).toBe("POST")
  expect(new URL(linkRequests[0].url()).pathname).toBe(linkPath(CUSTOM_ID))
  expect(linkRequests[0].postDataJSON()).toEqual({ targetInvoiceUniqueId: CUSTOM_DUE_TODAY_ID })

  const linkedToTarget = page.getByRole("link", { name: "INV-C-101" })
  await expect(linkedToTarget).toHaveAttribute("href", detailPath(CUSTOM_DUE_TODAY_ID))
  await linkedToTarget.click()

  await expect(page).toHaveURL(detailPath(CUSTOM_DUE_TODAY_ID))
  await expect(page.getByRole("link", { name: "INV-C-100" })).toHaveAttribute("href", detailPath(CUSTOM_ID))
})

/**
 * UAT 5. Removing a link is destructive to the reference both invoices hold, so the organizer must be told
 * what goes before it goes, the server must get the DELETE, and the page must offer linking again after.
 */
test("UAT 5: removing a link names the consequence, sends DELETE and brings back the Link invoice action", async ({ page }) => {
  let isLinked = true
  const unlinkRequests: Request[] = []

  await mockShell(page)
  await mockDetail(page, CUSTOM_ID, () =>
    customDetail({ linkedInvoice: isLinked ? { invoiceUniqueId: CUSTOM_DUE_TODAY_ID, invoiceNo: "INV-C-101", invoiceStatusLabel: "Pending Payment" } : null }),
  )
  await page.route(`**${linkPath(CUSTOM_ID)}`, async (route) => {
    unlinkRequests.push(route.request())
    isLinked = false
    await route.fulfill({ json: envelope(true) })
  })

  await openDetail(page, CUSTOM_ID, "INV-C-100")
  await page.getByRole("button", { name: "Remove link" }).click()

  const confirm = page.getByRole("alertdialog")
  await expect(confirm.getByText("Remove link?")).toBeVisible()
  await expect(confirm).toContainText("Unlink invoice INV-C-100 from INV-C-101?")
  await expect(confirm).toContainText("only the reference between them is removed")
  await settle(confirm)
  const undersized = await findUndersizedTargets(confirm, false)
  expect.soft(undersized, `controls under ${MIN_TOUCH_TARGET_PX}px in the remove-link confirmation`).toEqual([])

  await confirm.getByRole("button", { name: "Remove link" }).click()

  await expect(page.getByText("Link removed.")).toBeVisible()
  await expect(confirm).toBeHidden()
  expect(unlinkRequests).toHaveLength(1)
  expect(unlinkRequests[0].method()).toBe("DELETE")
  expect(new URL(unlinkRequests[0].url()).pathname).toBe(linkPath(CUSTOM_ID))

  await expect(page.getByRole("link", { name: "INV-C-101" })).toHaveCount(0)
  await expect(page.getByText("Not linked to another invoice.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Link invoice" })).toBeVisible()
})

/**
 * UAT 6. A custom invoice issues no tickets, so offering "Resend tickets" on it promises an email that has
 * nothing to send; a ticket order the server lets resend must still offer it, and the resend must queue.
 * Custom invoices now list on their own screen, so their row menu is checked there.
 */
test("UAT 6: resend tickets is offered only on an invoice that has tickets", async ({ page }) => {
  await mockShell(page)
  await mockCustomList(page, () => [OVERDUE_CUSTOM_ROW])
  await mockList(page, () => [TICKET_ROW])
  await page.route(`**/api/organizer/events/invoices/${TICKET_ID}/resend`, (route) => route.fulfill({ json: envelope(true) }))

  await openCustomList(page, 1440)
  await page.getByRole("button", { name: "Actions for invoice INV-C-100" }).click()
  await expect(page.getByRole("menuitem", { name: "View" })).toBeVisible()
  await expect(page.getByRole("menuitem", { name: /resend/i })).toHaveCount(0)

  await openList(page, 1440)
  await page.getByRole("button", { name: "Actions for invoice INV-T-200" }).click()
  await expect(page.getByRole("menuitem", { name: "Resend tickets" })).toBeVisible()

  const undersized = await findUndersizedTargets(page.getByRole("menu"), false)
  expect.soft(undersized, `row-menu items under ${MIN_TOUCH_TARGET_PX}px`).toEqual([])

  await page.getByRole("menuitem", { name: "Resend tickets" }).click()
  const confirm = page.getByRole("alertdialog")
  await expect(confirm).toContainText("Re-email every ticket on invoice INV-T-200")
  const resendRequest = page.waitForRequest(
    (request) => request.method() === "POST" && new URL(request.url()).pathname === `/api/organizer/events/invoices/${TICKET_ID}/resend`,
  )
  await confirm.getByRole("button", { name: "Resend tickets" }).click()
  await resendRequest
  await expect(page.getByText("Tickets queued for resend.")).toBeVisible()
})

/**
 * UAT 7, editable side. An unpaid custom invoice can still be corrected, so its header must lead straight
 * to the edit form rather than leaving the organizer to find it from the list.
 */
test("UAT 7: an editable custom invoice offers Edit, which opens its edit form", async ({ page }) => {
  await mockShell(page)
  await mockDetail(page, CUSTOM_ID, () => customDetail({ canEdit: true }))
  await mockEditForm(page)
  await openDetail(page, CUSTOM_ID, "INV-C-100")

  const edit = page.getByRole("link", { name: "Edit" })
  await expect(edit).toHaveAttribute("href", `${detailPath(CUSTOM_ID)}/edit`)
  await edit.click()
  await expect(page).toHaveURL(`${detailPath(CUSTOM_ID)}/edit`)

  await expect(page.getByText("Edit custom invoice", { exact: true })).toBeVisible()
  const moduleSelect = page.getByRole("combobox", { name: "Module" })
  await expect(moduleSelect).toBeDisabled()
  await expect(moduleSelect).toContainText("Event")
  const billedEvent = page.getByRole("textbox", { name: "Event", exact: true })
  await expect(billedEvent).toHaveValue("Annual Convention")
  await expect(billedEvent).not.toBeEditable()
  await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible()
})

/**
 * UAT 7, locked side. A paid invoice is a settled record; offering Edit on it invites a change the server
 * will refuse, so the header must not show one when the server says no.
 */
test("UAT 7: a paid custom invoice offers no Edit", async ({ page }) => {
  await mockShell(page)
  await mockDetail(page, PAID_CUSTOM_ID, () =>
    customDetail({
      invoiceUniqueId: PAID_CUSTOM_ID,
      invoiceNo: "INV-C-102",
      invoiceStatus: "Paid",
      invoiceStatusLabel: "Paid",
      balanceAmount: "0",
      isOverdue: false,
      canMarkAsPaid: false,
      canCancel: false,
      canEdit: false,
    }),
  )
  await openDetail(page, PAID_CUSTOM_ID, "INV-C-102")

  await expect(page.getByRole("button", { name: "Print" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0)
})

/**
 * UAT 8. The Overdue chip must put the filter on the server request, and the list must show what the server
 * returns for it, so the due-today boundary stays the server's call rather than the browser clock's.
 */
test("UAT 8: the Overdue chip sends statuses=Overdue and the list follows the server's rows", async ({ page }) => {
  await mockShell(page)
  await mockCustomList(page, (url) =>
    url.searchParams.getAll("statuses").includes("Overdue") ? [OVERDUE_CUSTOM_ROW] : [OVERDUE_CUSTOM_ROW, DUE_TODAY_CUSTOM_ROW],
  )
  await openCustomList(page, 1440)

  await expect(rowFor(page, "INV-C-100").getByText("Overdue", { exact: true })).toBeVisible()
  await expect(rowFor(page, "INV-C-101").getByText("Pending Payment", { exact: true })).toBeVisible()

  const overdueChip = page.getByRole("group", { name: "Status" }).getByRole("button", { name: "Overdue", exact: true })
  await expect(overdueChip).toHaveAttribute("aria-pressed", "false")
  const filteredRequest = page.waitForRequest((request) => {
    const url = new URL(request.url())
    return url.pathname === CUSTOM_LIST_PATH && url.searchParams.getAll("statuses").join() === "Overdue"
  })
  await overdueChip.click()
  await filteredRequest
  await expect(overdueChip).toHaveAttribute("aria-pressed", "true")

  await expect(rowFor(page, "INV-C-101")).toHaveCount(0)
  await expect(rowFor(page, "INV-C-100").getByText("Overdue", { exact: true })).toBeVisible()
})

const PHASE_04_SCREENSHOT_DIR = "test-results/uat-04"
const settlementApi = (invoiceUniqueId: string, action: "cancel" | "mark-paid") =>
  `**/api/organizer/custom-invoices/${invoiceUniqueId}/${action}`
const CANCELLATION_REASON = "Sponsor withdrew from the event."

for (const width of WIDTHS) {
  /**
   * Phase 04 UAT, cancel. Cancelling a custom invoice is irreversible, so the dialog must name what happens,
   * refuse to send without a reason, fit the screen at every width with fingertip-sized controls, and send
   * the reason the organizer typed - the server keeps it as the audit trail for the cancellation.
   */
  test(`Phase 04 UAT: cancelling a custom invoice requires a reason and sends it at ${width}px`, async ({ page }) => {
    let isCancelled = false
    const cancelRequests: Request[] = []

    await mockShell(page)
    await mockDetail(page, CUSTOM_ID, () =>
      isCancelled
        ? customDetail({ invoiceStatus: "Cancelled", invoiceStatusLabel: "Cancelled", canMarkAsPaid: false, canCancel: false, isOverdue: false })
        : customDetail(),
    )
    await page.route(settlementApi(CUSTOM_ID, "cancel"), async (route) => {
      cancelRequests.push(route.request())
      isCancelled = true
      await route.fulfill({ json: envelope(null) })
    })

    await openDetail(page, CUSTOM_ID, "INV-C-100", width)
    await page.getByRole("button", { name: "Mark as cancelled" }).click()

    const dialog = page.getByRole("alertdialog")
    await expect(dialog.getByText("Cancel this order")).toBeVisible()
    await expect(dialog).toContainText("will be closed unpaid")
    await expect(dialog).toContainText("This cannot be undone.")
    await settle(dialog)

    if (SCREENSHOT_WIDTHS.includes(width)) {
      await page.screenshot({ path: `${PHASE_04_SCREENSHOT_DIR}/cancel-dialog-${width}.png` })
    }

    expect(await findHorizontalPageOverflow(page), "the open cancel dialog makes the page scroll sideways").toEqual([])
    const undersized = await findUndersizedTargets(dialog, false)
    expect.soft(undersized, `controls under ${MIN_TOUCH_TARGET_PX}px in the cancel dialog at ${width}px`).toEqual([])

    await dialog.getByRole("button", { name: "Cancel order" }).click()
    await expect(dialog.getByText("Enter the reason for cancelling this order.")).toBeVisible()
    expect(cancelRequests, "a cancellation without a reason reached the server").toHaveLength(0)

    await dialog.getByLabel("Reason for cancelling").fill(`  ${CANCELLATION_REASON}  `)
    await dialog.getByRole("button", { name: "Cancel order" }).click()

    await expect(page.getByText("Invoice cancelled.")).toBeVisible()
    await expect(dialog).toBeHidden()
    expect(cancelRequests).toHaveLength(1)
    expect(cancelRequests[0].postDataJSON()).toEqual({ note: CANCELLATION_REASON })
    await expect(page.getByRole("button", { name: "Mark as cancelled" })).toHaveCount(0)
  })
}

const PAY_PAGE_URL = new RegExp(`^https?://[^\\s]+/custom-invoices/${CUSTOM_ID}/pay$`)

/** The "Payable link" panel, found by its title so the checks stay scoped to the section under test. */
const payableLinkPanel = (page: Page) => page.getByText("Payable link", { exact: true }).locator("xpath=ancestor::div[2]")

/** A paid custom invoice as the server reports it: nothing outstanding and closed to online payment. */
const PAID_PAYABLE_LINK_DETAIL = customDetail({
  invoiceStatus: "Paid",
  invoiceStatusLabel: "Paid",
  balanceAmount: null,
  isOverdue: false,
  canMarkAsPaid: false,
  canCancel: false,
  canEdit: false,
  canPayOnline: false,
})

for (const width of WIDTHS) {
  /**
   * Phase 04 UAT, payable link. The organizer gets paid online only by handing the buyer this URL, so at every
   * width it must read in full as this invoice's pay page, leave the page from sliding sideways, and keep its
   * actions big enough to tap.
   */
  test(`Phase 04 UAT: the payable link shows the buyer pay URL without page overflow at ${width}px`, async ({ page }) => {
    await mockShell(page)
    await mockDetail(page, CUSTOM_ID, () => customDetail({ canPayOnline: true }))
    await openDetail(page, CUSTOM_ID, "INV-C-100", width)

    const panel = payableLinkPanel(page)
    const url = panel.getByText(PAY_PAGE_URL)
    await expect(url).toBeVisible()
    await expect(panel.getByRole("link", { name: "Open payment page" })).toHaveAttribute("href", (await url.textContent()) ?? "")
    await expect(panel.getByRole("button", { name: "Copy link" })).toBeEnabled()

    expect(await findHorizontalPageOverflow(page), "the payable link makes the page scroll sideways").toEqual([])
    const undersized = await findUndersizedTargets(panel, false)
    expect.soft(undersized, `payable link controls under ${MIN_TOUCH_TARGET_PX}px at ${width}px`).toEqual([])

    if (SCREENSHOT_WIDTHS.includes(width)) {
      await panel.screenshot({ path: `${PHASE_04_SCREENSHOT_DIR}/payable-link-${width}.png` })
    }
  })
}

/** Phase 04 UAT, copy. The copied text is what the sponsor receives, so it must be the pay URL shown and the organizer must be told. */
test("Phase 04 UAT: copying the payable link puts the pay URL on the clipboard and confirms", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await mockShell(page)
  await mockDetail(page, CUSTOM_ID, () => customDetail({ canPayOnline: true }))
  await openDetail(page, CUSTOM_ID, "INV-C-100", 375)

  const panel = payableLinkPanel(page)
  const shownUrl = await panel.getByText(PAY_PAGE_URL).textContent()
  await panel.getByRole("button", { name: "Copy link" }).click()

  await expect(page.getByText("Payment link copied.")).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(shownUrl)
})

for (const width of SCREENSHOT_WIDTHS) {
  /**
   * Phase 04 UAT, not payable. A paid invoice has nothing left to collect, so both actions are visibly unavailable
   * with a not-allowed cursor and the panel says why, instead of offering a link the server would refuse.
   */
  test(`Phase 04 UAT: a paid custom invoice disables the payable link actions and says why at ${width}px`, async ({ page }) => {
    await mockShell(page)
    await mockDetail(page, PAID_CUSTOM_ID, () => ({ ...PAID_PAYABLE_LINK_DETAIL, invoiceUniqueId: PAID_CUSTOM_ID, invoiceNo: "INV-C-102" }))
    await openDetail(page, PAID_CUSTOM_ID, "INV-C-102", width)

    const panel = payableLinkPanel(page)
    await expect(panel.getByText("This invoice is Paid, so it can't be paid online.")).toBeVisible()
    await expect(panel.getByText(/\/custom-invoices\/.+\/pay/)).toHaveCount(0)
    for (const name of ["Open payment page", "Copy link"]) {
      const action = panel.getByRole("button", { name })
      await expect(action).toBeDisabled()
      await expect(action).toHaveCSS("cursor", "not-allowed")
    }
    expect(await findHorizontalPageOverflow(page), "the paid payable link makes the page scroll sideways").toEqual([])
  })
}

/**
 * Phase 04 UAT, mark paid. A sponsor who paid outside the gateway is settled by hand: the organizer confirms,
 * the server is asked once, and the refreshed detail reads Paid with no settlement actions left to take.
 */
test("Phase 04 UAT: marking a custom invoice paid confirms first and leaves it Paid", async ({ page }) => {
  let isPaid = false
  const markPaidRequests: Request[] = []

  await mockShell(page)
  await mockDetail(page, CUSTOM_ID, () =>
    isPaid
      ? customDetail({ invoiceStatus: "Paid", invoiceStatusLabel: "Paid", canMarkAsPaid: false, canCancel: false, isOverdue: false, balanceAmount: null })
      : customDetail(),
  )
  await page.route(settlementApi(CUSTOM_ID, "mark-paid"), async (route) => {
    markPaidRequests.push(route.request())
    isPaid = true
    await route.fulfill({ json: envelope(null) })
  })

  await openDetail(page, CUSTOM_ID, "INV-C-100", 375)
  await page.getByRole("button", { name: "Mark as paid" }).click()

  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toContainText("will be recorded as paid in full")
  await settle(dialog)
  expect(markPaidRequests, "marking paid reached the server before it was confirmed").toHaveLength(0)
  const undersized = await findUndersizedTargets(dialog, false)
  expect.soft(undersized, `controls under ${MIN_TOUCH_TARGET_PX}px in the mark-paid confirmation`).toEqual([])

  await dialog.getByRole("button", { name: "Mark as paid" }).click()

  await expect(page.getByText("Invoice marked as paid.")).toBeVisible()
  await expect(dialog).toBeHidden()
  expect(markPaidRequests).toHaveLength(1)
  await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible()
  await expect(page.getByRole("button", { name: "Mark as paid" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Mark as cancelled" })).toHaveCount(0)
})
