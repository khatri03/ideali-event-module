import { expect, test, type Page } from "@playwright/test"

// On-demand only: Playwright never gates a commit here (see CLAUDE.md Testing). This covers the one
// thing the Vitest print test cannot - that print media actually hides the interactive controls and
// leaves the invoice legible - at the narrowest and a wide viewport.

const INVOICE_ID = "11111111-1111-1111-1111-111111111111"

const sessionResponse = {
  success: true,
  message: null,
  timestamp: "2026-08-11T10:00:00Z",
  data: {
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
  },
}

const MODULE_SCREENSHOT_DIR = ".planning/phases/07-collect-and-deliver-for-any-module/screenshots"

const customInvoiceDetail = {
  success: true,
  message: null,
  timestamp: "2026-08-11T10:00:00Z",
  data: {
    invoiceUniqueId: INVOICE_ID,
    invoiceNo: "CINV-3001",
    invoiceStatus: "PendingPayment",
    invoiceStatusLabel: "Pending Payment",
    invoiceDateUtc: "2026-08-01T10:00:00Z",
    moduleType: "Event",
    entityUniqueId: "event-1",
    entityName: "Annual Convention",
    subTotal: 1800.75,
    totalAmount: 1800.75,
    balanceAmount: 1800.75,
    currencySymbol: "$",
    buyerName: "Ada Lovelace",
    buyerEmail: "ada@example.com",
    buyerPhone: null,
    lineItems: [
      { invoiceItemUniqueId: "cline-1", description: "Headline sponsorship", amount: 1500.5 },
      { invoiceItemUniqueId: "cline-2", description: "Booth space", amount: 300.25 },
    ],
    notes: [],
    payments: [],
    categoryName: "Gold Sponsor",
    dueDateUtc: "2026-11-15T00:00:00Z",
    isOverdue: false,
    specialNotes: "Bill to head office.",
    companyName: "Northwind Traders",
    buyerFirstName: "Ada",
    buyerMiddleName: "K",
    buyerLastName: "Lovelace",
    canMarkAsPaid: true,
    canCancel: true,
    canEdit: true,
    canPayOnline: true,
    canSend: true,
    linkedInvoice: null,
  },
}

const MODULE_DETAILS = [
  { moduleType: "Membership", entityUniqueId: "membership-type-1", entityName: "Gold Membership", label: "Membership: Gold Membership" },
  { moduleType: "Donation", entityUniqueId: "campaign-1", entityName: "Winter Appeal", label: "Campaign: Winter Appeal" },
] as const

/** The Event fixture rebound to another module's record, as the API returns a Membership or Donation invoice. */
function moduleInvoiceDetail({ moduleType, entityUniqueId, entityName }: (typeof MODULE_DETAILS)[number]) {
  return { ...customInvoiceDetail, data: { ...customInvoiceDetail.data, moduleType, entityUniqueId, entityName } }
}

async function mockCustomInvoice(page: Page, detail: unknown = customInvoiceDetail) {
  await page.route("**/api/identity/account/session", (route) => route.fulfill({ json: sessionResponse }))
  await page.route("**/api/alert-inbox/**", (route) =>
    route.fulfill({ json: { success: true, data: null, message: null, timestamp: "2026-08-11T10:00:00Z" } }),
  )
  await page.route(`**/api/organizer/custom-invoices/${INVOICE_ID}`, (route) =>
    route.request().method() === "GET" ? route.fulfill({ json: detail }) : route.fallback(),
  )
}

const WIDTHS = [
  { label: "375px", width: 375, height: 800 },
  { label: "1280px", width: 1280, height: 900 },
]

for (const { label, width, height } of WIDTHS) {
  /**
   * The printed custom invoice is the paper a sponsor's accounts team pays from: it must keep the billed lines,
   * total and pay URL, and drop the organizer's action buttons, which mean nothing on paper.
   */
  test(`custom invoice prints the invoice and hides the pay/email controls at ${label}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await mockCustomInvoice(page)

    await page.goto(`/organizer/custom-invoices/${INVOICE_ID}`)
    await expect(page.getByText("CINV-3001", { exact: true })).toBeVisible()

    await page.emulateMedia({ media: "print" })

    await expect(page.getByText("Gold Sponsor")).toBeVisible()
    await expect(page.getByText("Northwind Traders")).toBeVisible()
    await expect(page.getByText("Headline sponsorship")).toBeVisible()
    await expect(page.getByText("$1,800.75")).toBeVisible()
    await expect(page.getByText(/\/custom-invoices\/.+\/pay$/)).toBeVisible()

    await expect(page.getByRole("button", { name: /email invoice to buyer/i })).toBeHidden()
    await expect(page.getByRole("link", { name: /open payment page/i })).toBeHidden()
    await expect(page.getByRole("button", { name: /mark as paid/i })).toBeHidden()
  })
}

const MODULE_WIDTHS = [375, 1440] as const

for (const width of MODULE_WIDTHS) {
  for (const moduleDetail of MODULE_DETAILS) {
    /**
     * D-09: a printed Membership or Donation invoice must name the membership type or campaign it bills,
     * labelled by module where an Event invoice names its event, with the organizer's controls still dropped.
     */
    test(`a ${moduleDetail.moduleType} custom invoice prints its labelled entity at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await mockCustomInvoice(page, moduleInvoiceDetail(moduleDetail))

      await page.goto(`/organizer/custom-invoices/${INVOICE_ID}`)
      await expect(page.getByText(moduleDetail.label, { exact: true })).toBeVisible()
      await page.screenshot({
        path: `${MODULE_SCREENSHOT_DIR}/detail-${moduleDetail.moduleType.toLowerCase()}-${width}-after.png`,
        fullPage: true,
      })

      await page.emulateMedia({ media: "print" })

      await expect(page.getByText(moduleDetail.label, { exact: true })).toBeVisible()
      await expect(page.getByRole("button", { name: /email invoice to buyer/i })).toBeHidden()
      await expect(page.getByRole("link", { name: /open payment page/i })).toBeHidden()
      await expect(page.getByRole("button", { name: /mark as paid/i })).toBeHidden()
    })
  }
}
