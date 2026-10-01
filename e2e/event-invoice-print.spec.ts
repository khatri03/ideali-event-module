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
    subTotal: 1800.75,
    discountAmount: null,
    discountCouponCode: null,
    taxAmount: null,
    platformCharges: null,
    serviceCharges: null,
    totalAmount: 1800.75,
    balanceAmount: 1800.75,
    currencySymbol: "$",
    eventUniqueId: "event-1",
    eventName: "Annual Convention",
    buyerName: "Ada Lovelace",
    buyerEmail: "ada@example.com",
    buyerPhone: null,
    charges: [],
    lineItems: [],
    customLineItems: [
      { invoiceItemUniqueId: "cline-1", description: "Headline sponsorship", amount: 1500.5 },
      { invoiceItemUniqueId: "cline-2", description: "Booth space", amount: 300.25 },
    ],
    notes: [],
    payments: [],
    invoiceType: "Custom",
    invoiceTypeLabel: "Custom",
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
    canResendTickets: false,
    canEditBuyer: false,
    canEdit: true,
    canPayOnline: true,
    linkedInvoice: null,
  },
}

async function mockCustomInvoice(page: Page) {
  await page.route("**/api/identity/account/session", (route) => route.fulfill({ json: sessionResponse }))
  await page.route("**/api/alert-inbox/**", (route) =>
    route.fulfill({ json: { success: true, data: null, message: null, timestamp: "2026-08-11T10:00:00Z" } }),
  )
  await page.route(`**/api/organizer/events/invoices/${INVOICE_ID}`, (route) =>
    route.request().method() === "GET" ? route.fulfill({ json: customInvoiceDetail }) : route.fallback(),
  )
}

const WIDTHS = [
  { label: "375px", width: 375, height: 800 },
  { label: "1280px", width: 1280, height: 900 },
]

for (const { label, width, height } of WIDTHS) {
  test(`custom invoice prints the invoice and hides the pay/email controls at ${label}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await mockCustomInvoice(page)

    await page.goto(`/organizer/events/invoices/${INVOICE_ID}`)
    await expect(page.getByText("CINV-3001", { exact: true })).toBeVisible()

    await page.emulateMedia({ media: "print" })

    await expect(page.getByText("Gold Sponsor")).toBeVisible()
    await expect(page.getByText("Northwind Traders")).toBeVisible()
    await expect(page.getByText("Headline sponsorship")).toBeVisible()
    await expect(page.getByText("$1,800.75")).toBeVisible()
    await expect(page.getByText(/\/events\/invoices\/.+\/pay$/)).toBeVisible()

    await expect(page.getByRole("button", { name: /email invoice to buyer/i })).toBeHidden()
    await expect(page.getByRole("link", { name: /open payment page/i })).toBeHidden()
    await expect(page.getByRole("button", { name: /mark as paid/i })).toBeHidden()
  })
}
