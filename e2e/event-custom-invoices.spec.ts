import { expect, test, type Locator, type Page, type Request } from "@playwright/test"

/**
 * Phase 03 UAT for custom event invoices, driven against mocked API responses because the check is about
 * what the organizer sees and sends, not about the server. Every width in the project's responsive range is
 * walked, since the organizer works these screens from a phone as often as from a desk.
 */

const WIDTHS = [320, 375, 768, 1024, 1440, 1920] as const
const SCREENSHOT_WIDTHS: readonly number[] = [375, 1440]
const VIEWPORT_HEIGHT = 900
const MIN_TOUCH_TARGET_PX = 44
const SCREENSHOT_DIR = "test-results/uat-03"

const CUSTOM_ID = "c0000000-0000-4000-8000-000000000100"
const CUSTOM_DUE_TODAY_ID = "c0000000-0000-4000-8000-000000000101"
const PAID_CUSTOM_ID = "c0000000-0000-4000-8000-000000000102"
const TICKET_ID = "70000000-0000-4000-8000-000000000200"

const LIST_URL = "/organizer/events/invoices"
const LIST_API = "**/api/organizer/events/invoices/list**"
const detailApi = (invoiceUniqueId: string) => `**/api/organizer/events/invoices/${invoiceUniqueId}`
const linkApi = (invoiceUniqueId: string) => `**/api/organizer/events/invoices/custom/${invoiceUniqueId}/link`

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

/** A page of list rows in the server's paging envelope; the total comes from the server, never the client. */
function listPage(rows: Json[]) {
  return envelope({ pageData: rows, totalRecordsCount: rows.length, pageNo: 1, pageSize: 20, pageCount: 1 })
}

/**
 * A custom invoice detail carrying every section UAT 3 names. Defaults are an unpaid, editable, unlinked
 * invoice; a test overrides only the state its rule is about.
 */
function customDetail(overrides: Json = {}): Json {
  return {
    invoiceUniqueId: CUSTOM_ID,
    invoiceNo: "INV-C-100",
    invoiceStatus: "PendingPayment",
    invoiceStatusLabel: "Pending Payment",
    invoiceDateUtc: "2026-09-01T12:00:00Z",
    subTotal: "1750.50",
    discountAmount: null,
    discountCouponCode: null,
    taxAmount: null,
    platformCharges: null,
    serviceCharges: null,
    totalAmount: "1750.50",
    balanceAmount: "1750.50",
    currencySymbol: "$",
    eventUniqueId: "event-1",
    eventName: "Annual Convention",
    buyerName: "Jane Doe",
    buyerEmail: "jane@northwind.example",
    buyerPhone: "555-0100",
    charges: [],
    lineItems: [],
    customLineItems: [
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
    invoiceType: "Custom",
    invoiceTypeLabel: "Custom",
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
    canResendTickets: false,
    canEditBuyer: false,
    canEdit: true,
    linkedInvoice: null,
    ...overrides,
  }
}

/** The ticket invoice a custom invoice gets linked to; only ever the target of a link. */
function ticketDetail(overrides: Json = {}): Json {
  return customDetail({
    invoiceUniqueId: TICKET_ID,
    invoiceNo: "INV-T-200",
    invoiceStatus: "Paid",
    invoiceStatusLabel: "Paid",
    invoiceType: "Regular",
    invoiceTypeLabel: "Regular",
    customLineItems: [],
    categoryName: null,
    dueDateUtc: null,
    isOverdue: false,
    specialNotes: null,
    companyName: null,
    canMarkAsPaid: false,
    canCancel: false,
    canEdit: false,
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
  await page.route("**/api/organizer/events/invoices/filter-options", (route) =>
    route.fulfill({ json: envelope({ events: [], sessions: [] }) }),
  )
}

/** Serves the invoice list, letting a test answer by the request's own query so filters are proven server-side. */
async function mockList(page: Page, rowsFor: (url: URL) => Json[]) {
  await page.route(LIST_API, (route) => route.fulfill({ json: listPage(rowsFor(new URL(route.request().url()))) }))
}

/** Serves one invoice's detail; the resolver runs per request so a refetch can observe state a mutation changed. */
async function mockDetail(page: Page, invoiceUniqueId: string, resolve: () => Json) {
  await page.route(detailApi(invoiceUniqueId), (route) =>
    route.request().method() === "GET" ? route.fulfill({ json: envelope(resolve()) }) : route.fallback(),
  )
}

/**
 * The elements that push the page wider than the viewport - empty when the page does not scroll sideways.
 * A table scrolling inside its own box is not a defect, so anything that box contains is ignored; what is
 * named is the outermost element that escapes every clip, so a failure points straight at its cause.
 */
async function findHorizontalPageOverflow(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const { documentElement } = document
    // A single pixel of rounding slack, so sub-pixel layout maths does not read as a real break.
    if (documentElement.scrollWidth - documentElement.clientWidth <= 1) return []

    const viewportWidth = documentElement.clientWidth
    // An ancestor that clips or scrolls sideways contains its children - except an absolutely positioned one
    // whose containing block sits outside it, which escapes the clip and widens the page regardless.
    const escapesEveryClip = (element: Element) => {
      const isOutOfFlow = ["absolute", "fixed"].includes(getComputedStyle(element).position)
      const containingBlock = element instanceof HTMLElement ? element.offsetParent : null
      for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        if (getComputedStyle(parent).overflowX === "visible") continue
        const isClippedHere = !isOutOfFlow || (containingBlock !== null && (parent === containingBlock || parent.contains(containingBlock)))
        if (isClippedHere) return false
      }
      return true
    }
    const offenders = [...document.body.querySelectorAll("*")].filter(
      (element) => element.getBoundingClientRect().right > viewportWidth + 1 && escapesEveryClip(element),
    )
    const outermost = offenders.filter((element) => !offenders.some((other) => other !== element && other.contains(element)))
    return [
      `page scrollWidth ${documentElement.scrollWidth} > clientWidth ${viewportWidth}`,
      ...outermost.slice(0, 5).map((element) => {
        const rect = element.getBoundingClientRect()
        const label = (element.getAttribute("aria-label") ?? element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 50)
        return `${element.tagName.toLowerCase()}.${element.className} "${label}" right=${Math.round(rect.right)} width=${Math.round(rect.width)}`
      }),
    ]
  })
}

interface UndersizedTarget {
  control: string
  width: number
  height: number
}

/**
 * Every visible interactive control under the anchor's scope that is smaller than a fingertip in either
 * direction. A radio, checkbox or switch is measured by the label that carries its hit area, because that
 * is what the finger actually lands on. With `climbToScrollContainer` the scope is the routed page content
 * (the nearest scrolling ancestor), which keeps the shared sidebar and top bar out of a screen's verdict.
 */
async function findUndersizedTargets(anchor: Locator, climbToScrollContainer: boolean): Promise<UndersizedTarget[]> {
  return await anchor.evaluate(
    (start, { climb, minimum }) => {
      let root: Element = start
      if (climb) {
        let current: Element | null = start.parentElement
        while (current && !["auto", "scroll"].includes(getComputedStyle(current).overflowY)) {
          current = current.parentElement
        }
        root = current ?? document.body
      }

      const interactive =
        'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="switch"], [role="menuitem"], [role="combobox"]'
      const seen = new Set<Element>()
      const offenders: { control: string; width: number; height: number }[] = []

      for (const element of root.querySelectorAll(interactive)) {
        const input = element instanceof HTMLInputElement ? element : null
        const isToggle = input && ["radio", "checkbox"].includes(input.type)
        // A react-select search input grows with what is typed; the box around it is what takes the tap.
        const isSelectSearch = element.getAttribute("role") === "combobox" && element.closest('[class*="-control"]')
        const target =
          element.closest('[data-scope="switch"][data-part="root"]') ??
          (isToggle ? element.closest("label") : null) ??
          (isSelectSearch ? element.closest('[class*="-control"]') : null) ??
          element
        if (seen.has(target)) continue
        seen.add(target)

        const rect = target.getBoundingClientRect()
        const isRendered = rect.width > 1 && rect.height > 1 && target.checkVisibility({ opacityProperty: true, visibilityProperty: true })
        if (!isRendered) continue
        if (rect.width >= minimum && rect.height >= minimum) continue

        const name =
          element.getAttribute("aria-label") ||
          (target.textContent ?? "").trim() ||
          element.getAttribute("placeholder") ||
          element.getAttribute("name") ||
          ""
        offenders.push({
          control: `${target.tagName.toLowerCase()} "${name.replace(/\s+/g, " ").slice(0, 60)}"`,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        })
      }
      return offenders
    },
    { climb: climbToScrollContainer, minimum: MIN_TOUCH_TARGET_PX },
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

/** Opens the list at a width and waits for the rows, so assertions never race the first fetch. */
async function openList(page: Page, width: number) {
  await page.setViewportSize({ width, height: VIEWPORT_HEIGHT })
  await page.goto(LIST_URL)
  await expect(page.getByRole("link", { name: "INV-C-100" })).toBeVisible({ timeout: 30_000 })
}

/** Opens a detail at a width and waits for its header, so assertions never race the first fetch. */
async function openDetail(page: Page, invoiceUniqueId: string, invoiceNo: string, width = 1440) {
  await page.setViewportSize({ width, height: VIEWPORT_HEIGHT })
  await page.goto(`/organizer/events/invoices/${invoiceUniqueId}`)
  await expect(page.getByText(invoiceNo, { exact: true }).first()).toBeVisible({ timeout: 30_000 })
}

const rowFor = (page: Page, invoiceNo: string) => page.getByRole("row").filter({ hasText: invoiceNo })

for (const width of WIDTHS) {
  /**
   * UAT 2. The list is how an organizer spots which sponsor owes money; at any width the page must not
   * slide sideways, the wide table must scroll in its own box, and a custom row must read as custom with
   * its company and due date, flagged when the server says it is overdue.
   */
  test(`UAT 2: the invoice list marks custom and overdue rows without page overflow at ${width}px`, async ({ page }) => {
    await mockShell(page)
    await mockList(page, () => [OVERDUE_CUSTOM_ROW, DUE_TODAY_CUSTOM_ROW, TICKET_ROW])
    await openList(page, width)

    expect.soft(await findHorizontalPageOverflow(page), "the invoice list scrolls the page sideways").toEqual([])

    const tableBox = page.getByRole("table").locator("xpath=ancestor::div[1]")
    expect(await tableBox.evaluate((element) => getComputedStyle(element).overflowX)).toMatch(/auto|scroll/)

    const overdueRow = rowFor(page, "INV-C-100")
    await expect(overdueRow.getByText("Custom", { exact: true })).toBeVisible()
    await expect(overdueRow.getByText("Sep 10, 2026")).toBeVisible()
    await expect(overdueRow.getByText("Overdue, due")).toBeAttached()
    await expect.soft(overdueRow.getByText("Northwind Traders"), "a custom row does not name the billed company").toBeVisible()

    await expect(rowFor(page, "INV-C-101").getByText("Overdue, due")).toHaveCount(0)
    await expect(rowFor(page, "INV-T-200").getByText("Custom", { exact: true })).toHaveCount(0)

    if (SCREENSHOT_WIDTHS.includes(width)) {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/list-${width}.png`, fullPage: true })
    }

    const undersized = await findUndersizedTargets(page.getByRole("heading", { name: "Event Invoices" }), true)
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
 * UAT 4. Linking ties a sponsorship bill to the ticket order it pays for. The request must name the target
 * the organizer picked, the pending state must stop a double submit, and after the refetch both invoices
 * must point at each other - otherwise the other side keeps showing a stale "not linked".
 */
test("UAT 4: linking a custom invoice sends the picked target and both details show the link", async ({ page }) => {
  let isLinked = false
  let releaseLink: () => void = () => undefined
  const linkReleased = new Promise<void>((resolve) => (releaseLink = resolve))
  const linkRequests: Request[] = []

  await mockShell(page)
  await mockList(page, (url) => {
    const search = url.searchParams.get("searchTerm")
    return search ? [TICKET_ROW].filter((row) => String(row.invoiceNo).includes(search)) : [OVERDUE_CUSTOM_ROW, DUE_TODAY_CUSTOM_ROW, TICKET_ROW]
  })
  await mockDetail(page, CUSTOM_ID, () =>
    customDetail({ linkedInvoice: isLinked ? { invoiceUniqueId: TICKET_ID, invoiceNo: "INV-T-200", invoiceStatusLabel: "Paid" } : null }),
  )
  await mockDetail(page, TICKET_ID, () =>
    ticketDetail({ linkedInvoice: isLinked ? { invoiceUniqueId: CUSTOM_ID, invoiceNo: "INV-C-100", invoiceStatusLabel: "Pending Payment" } : null }),
  )
  await page.route(linkApi(CUSTOM_ID), async (route) => {
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

  const searchRequest = page.waitForRequest((request) => new URL(request.url()).searchParams.get("searchTerm") === "INV-T")
  await dialog.getByLabel("Search invoices").fill("INV-T")
  await searchRequest
  await expect(dialog.getByText("INV-C-101")).toHaveCount(0)

  await dialog.getByRole("radio", { name: "Select invoice INV-T-200" }).check()

  const undersized = await findUndersizedTargets(dialog, false)
  expect.soft(undersized, `controls under ${MIN_TOUCH_TARGET_PX}px in the link dialog at 375px`).toEqual([])

  await dialog.getByRole("button", { name: "Link invoice", exact: true }).click()
  await expect(dialog.getByRole("button", { name: /Linking\.\.\./ })).toBeDisabled()
  releaseLink()

  await expect(page.getByText("Invoices linked.")).toBeVisible()
  await expect(dialog).toBeHidden()

  expect(linkRequests).toHaveLength(1)
  expect(linkRequests[0].method()).toBe("POST")
  expect(new URL(linkRequests[0].url()).pathname).toBe(`/api/organizer/events/invoices/custom/${CUSTOM_ID}/link`)
  expect(linkRequests[0].postDataJSON()).toEqual({ targetInvoiceUniqueId: TICKET_ID })

  const linkedToTicket = page.getByRole("link", { name: "INV-T-200" })
  await expect(linkedToTicket).toHaveAttribute("href", `/organizer/events/invoices/${TICKET_ID}`)
  await linkedToTicket.click()

  await expect(page).toHaveURL(`/organizer/events/invoices/${TICKET_ID}`)
  await expect(page.getByRole("link", { name: "INV-C-100" })).toHaveAttribute("href", `/organizer/events/invoices/${CUSTOM_ID}`)
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
    customDetail({ linkedInvoice: isLinked ? { invoiceUniqueId: TICKET_ID, invoiceNo: "INV-T-200", invoiceStatusLabel: "Paid" } : null }),
  )
  await page.route(linkApi(CUSTOM_ID), async (route) => {
    unlinkRequests.push(route.request())
    isLinked = false
    await route.fulfill({ json: envelope(true) })
  })

  await openDetail(page, CUSTOM_ID, "INV-C-100")
  await page.getByRole("button", { name: "Remove link" }).click()

  const confirm = page.getByRole("alertdialog")
  await expect(confirm.getByText("Remove link?")).toBeVisible()
  await expect(confirm).toContainText("Unlink invoice INV-C-100 from INV-T-200?")
  await expect(confirm).toContainText("only the reference between them is removed")
  await settle(confirm)
  const undersized = await findUndersizedTargets(confirm, false)
  expect.soft(undersized, `controls under ${MIN_TOUCH_TARGET_PX}px in the remove-link confirmation`).toEqual([])

  await confirm.getByRole("button", { name: "Remove link" }).click()

  await expect(page.getByText("Link removed.")).toBeVisible()
  await expect(confirm).toBeHidden()
  expect(unlinkRequests).toHaveLength(1)
  expect(unlinkRequests[0].method()).toBe("DELETE")
  expect(new URL(unlinkRequests[0].url()).pathname).toBe(`/api/organizer/events/invoices/custom/${CUSTOM_ID}/link`)

  await expect(page.getByRole("link", { name: "INV-T-200" })).toHaveCount(0)
  await expect(page.getByText("Not linked to another invoice.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Link invoice" })).toBeVisible()
})

/**
 * UAT 6. A custom invoice issues no tickets, so offering "Resend tickets" on it promises an email that has
 * nothing to send; a ticket order the server lets resend must still offer it, and the resend must queue.
 */
test("UAT 6: resend tickets is offered only on an invoice that has tickets", async ({ page }) => {
  await mockShell(page)
  await mockList(page, () => [OVERDUE_CUSTOM_ROW, TICKET_ROW])
  await page.route(`**/api/organizer/events/invoices/${TICKET_ID}/resend`, (route) => route.fulfill({ json: envelope(true) }))
  await openList(page, 1440)

  await page.getByRole("button", { name: "Actions for invoice INV-C-100" }).click()
  await expect(page.getByRole("menuitem", { name: "View" })).toBeVisible()
  await expect(page.getByRole("menuitem", { name: "Resend tickets" })).toHaveCount(0)
  await page.keyboard.press("Escape")
  await expect(page.getByRole("menuitem", { name: "View" })).toBeHidden()

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
  await openDetail(page, CUSTOM_ID, "INV-C-100")

  const edit = page.getByRole("link", { name: "Edit" })
  await expect(edit).toHaveAttribute("href", `/organizer/events/invoices/custom/${CUSTOM_ID}/edit`)
  await edit.click()
  await expect(page).toHaveURL(`/organizer/events/invoices/custom/${CUSTOM_ID}/edit`)
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
 * UAT 8. The whole "Overdue only" line is the control an organizer taps, not just the knob; applying it must
 * put the filter on the server request, and the pill must follow the server's overdue verdict so the
 * due-today boundary stays the server's call rather than the browser clock's.
 */
test("UAT 8: tapping the Overdue only text toggles the filter and the list follows the server's overdue flag", async ({ page }) => {
  await mockShell(page)
  await mockList(page, (url) =>
    url.searchParams.get("overdueOnly") === "true" ? [OVERDUE_CUSTOM_ROW] : [OVERDUE_CUSTOM_ROW, DUE_TODAY_CUSTOM_ROW, TICKET_ROW],
  )
  await openList(page, 1440)

  await expect(rowFor(page, "INV-C-100").getByText("Overdue, due")).toBeAttached()
  await expect(rowFor(page, "INV-C-101").getByText("Overdue, due")).toHaveCount(0)

  const overdueSwitch = page.locator('[data-scope="switch"][data-part="root"]').filter({ hasText: "Overdue only" })
  await expect(overdueSwitch).not.toHaveAttribute("data-state", "checked")
  await page.getByText("Overdue only", { exact: true }).click()
  await expect(overdueSwitch).toHaveAttribute("data-state", "checked")

  const filteredRequest = page.waitForRequest(
    (request) => request.url().includes("/invoices/list") && new URL(request.url()).searchParams.get("overdueOnly") === "true",
  )
  await page.getByRole("button", { name: "Apply" }).click()
  await filteredRequest

  await expect(rowFor(page, "INV-C-101")).toHaveCount(0)
  await expect(rowFor(page, "INV-C-100").getByText("Overdue, due")).toBeAttached()
})
