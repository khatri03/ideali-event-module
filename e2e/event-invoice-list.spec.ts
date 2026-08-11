import { expect, test } from "@playwright/test"

const INVOICE_ID = "11111111-1111-1111-1111-111111111111"

const sessionResponse = {
  success: true,
  message: null,
  timestamp: "2026-08-11T10:00:00Z",
  data: {
    userDetail: {
      userId: 1,
      roles: ["Organizer"],
      email: "organizer@example.com",
      name: "Organizer User",
      logoUrl: null,
    },
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

test("invoice number is a real link and opens invoice detail", async ({ page }) => {
  await page.route("**/api/identity/account/session", (route) => route.fulfill({ json: sessionResponse }))
  await page.route("**/api/alert-inbox/**", (route) =>
    route.fulfill({ json: { success: true, data: null, message: null, timestamp: "2026-08-11T10:00:00Z" } }),
  )
  await page.route("**/api/organizer/events/invoices/filter-options", (route) =>
    route.fulfill({
      json: {
        success: true,
        message: null,
        timestamp: "2026-08-11T10:00:00Z",
        data: { events: [], sessions: [] },
      },
    }),
  )
  await page.route("**/api/organizer/events/invoices/list**", (route) =>
    route.fulfill({
      json: {
        success: true,
        message: null,
        timestamp: "2026-08-11T10:00:00Z",
        data: {
          pageData: [
            {
              invoiceUniqueId: INVOICE_ID,
              invoiceNo: "INV-2001",
              invoiceStatus: "Paid",
              invoiceStatusLabel: "Paid",
              invoiceDateUtc: "2026-08-01T10:00:00Z",
              totalAmount: 251.78,
              balanceAmount: 251.78,
              currencySymbol: "$",
              buyerName: "Playwright Buyer",
              buyerEmail: "buyer@example.com",
              eventName: "Annual Convention",
              paymentMethod: "Stripe",
              paymentSource: "Visa ending 4242",
              ticketCount: 1,
            },
          ],
          totalRecordsCount: 1,
          pageNo: 1,
          pageSize: 20,
          pageCount: 1,
        },
      },
    }),
  )
  await page.route(`**/api/organizer/events/invoices/${INVOICE_ID}`, (route) =>
    route.fulfill({
      json: {
        success: true,
        message: null,
        timestamp: "2026-08-11T10:00:00Z",
        data: {
          invoiceUniqueId: INVOICE_ID,
          invoiceNo: "INV-2001",
          invoiceStatus: "Paid",
          invoiceStatusLabel: "Paid",
          invoiceDateUtc: "2026-08-01T10:00:00Z",
          subTotal: 210,
          discountAmount: null,
          discountCouponCode: null,
          taxAmount: null,
          platformCharges: 41.78,
          serviceCharges: null,
          totalAmount: 251.78,
          balanceAmount: 251.78,
          currencySymbol: "$",
          eventUniqueId: "event-1",
          eventName: "Annual Convention",
          buyerName: "Playwright Buyer",
          buyerEmail: "buyer@example.com",
          buyerPhone: "555-0100",
          lineItems: [],
          notes: [],
          payments: [],
        },
      },
    }),
  )

  await page.goto("/organizer/events/invoices")

  const link = page.getByRole("link", { name: "INV-2001" })
  await expect(link).toHaveAttribute("href", `/organizer/events/invoices/${INVOICE_ID}`)

  await link.click()

  await expect(page).toHaveURL(`/organizer/events/invoices/${INVOICE_ID}`)
  await expect(page.getByText("INV-2001")).toBeVisible()
})
