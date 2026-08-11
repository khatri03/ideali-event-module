import { expect, test, type Page } from "@playwright/test"

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

function invoiceDetail(notes: Array<{ note: string; createdBy: string; createdOnUtc: string }>) {
  return {
    success: true,
    message: null,
    timestamp: "2026-08-11T10:00:00Z",
    data: {
      invoiceUniqueId: INVOICE_ID,
      invoiceNo: "INV-2001",
      invoiceStatus: "Paid",
      invoiceStatusLabel: "Paid",
      invoiceDateUtc: "2026-08-01T10:00:00Z",
      subTotal: 420,
      discountAmount: null,
      discountCouponCode: null,
      taxAmount: 75.56,
      platformCharges: 4,
      serviceCharges: 5,
      totalAmount: 504.56,
      balanceAmount: null,
      currencySymbol: "$",
      eventUniqueId: "event-1",
      eventName: "Annual Convention",
      buyerName: "Playwright Buyer",
      buyerEmail: "buyer@example.com",
      buyerPhone: "555-0100",
      charges: [
        {
          label: "Sales Tax",
          chargeKind: "Tax",
          chargeKindLabel: "Tax",
          sourceType: "EventChargeRule",
          sourceTypeLabel: "Event Charge Rule",
          calculationType: "Percent",
          calculationTypeLabel: "Percent",
          sourceUniqueId: "rule-1",
          value: 17.99,
          amount: 75.56,
          displayOrder: 1,
        },
        {
          label: "Platform Charges",
          chargeKind: "RevenuePlan",
          chargeKindLabel: "Revenue Plan",
          sourceType: "RevenuePlanRule",
          sourceTypeLabel: "Revenue Plan Rule",
          calculationType: "Fixed",
          calculationTypeLabel: "Fixed",
          sourceUniqueId: "rule-2",
          value: 4,
          amount: 4,
          displayOrder: 2,
        },
        {
          label: "Credit Card Fee",
          chargeKind: "PaymentMethod",
          chargeKindLabel: "Payment Method",
          sourceType: "PaymentProcessorFeeRule",
          sourceTypeLabel: "Payment Processor Fee Rule",
          calculationType: "Percent",
          calculationTypeLabel: "Percent",
          sourceUniqueId: "rule-3",
          value: 1,
          amount: 5,
          displayOrder: 3,
        },
      ],
      lineItems: [
        {
          invoiceItemUniqueId: "line-1",
          sessionUniqueId: "session-1",
          sessionName: "Friday Dinner",
          ticketTypeName: "Aga Khan",
          quantity: 1,
          unitPrice: 210,
          lineTotal: 210,
          attendees: [{ name: "Playwright Buyer", email: "buyer@example.com", phone: null }],
          tickets: [
            {
              ticketUniqueId: "ticket-1",
              ticketCode: "EVT_ABC123",
              ticketStatus: "Active",
              ticketStatusLabel: "Active",
              deliveredAtUtc: "2026-08-01T11:00:00Z",
              checkedInAtUtc: null,
            },
          ],
        },
        {
          invoiceItemUniqueId: "line-2",
          sessionUniqueId: "session-1",
          sessionName: "Friday Dinner",
          ticketTypeName: "Allama Iqbal",
          quantity: 1,
          unitPrice: 210,
          lineTotal: 210,
          attendees: [{ name: "Playwright Buyer", email: "buyer@example.com", phone: null }],
          tickets: [
            {
              ticketUniqueId: "ticket-2",
              ticketCode: "EVT_DEF456",
              ticketStatus: "Active",
              ticketStatusLabel: "Active",
              deliveredAtUtc: "2026-08-01T11:00:00Z",
              checkedInAtUtc: null,
            },
          ],
        },
      ],
      notes,
      payments: [],
    },
  }
}

async function mockOrganizerInvoiceDetail(page: Page) {
  const notes = [
    { note: "Existing newest note", createdBy: "tester", createdOnUtc: "2026-08-02T10:00:00Z" },
    { note: "Existing older note", createdBy: "tester", createdOnUtc: "2026-08-01T10:00:00Z" },
  ]

  await page.route("**/api/identity/account/session", (route) => route.fulfill({ json: sessionResponse }))
  await page.route("**/api/alert-inbox/**", (route) => route.fulfill({ json: { success: true, data: null, message: null, timestamp: "2026-08-11T10:00:00Z" } }))
  await page.route(`**/api/organizer/events/invoices/${INVOICE_ID}`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: invoiceDetail(notes) })
    }
    return route.fallback()
  })
  await page.route(`**/api/organizer/events/invoices/${INVOICE_ID}/add-note`, async (route) => {
    const payload = route.request().postDataJSON() as { note: string }
    notes.unshift({ note: payload.note, createdBy: "tester", createdOnUtc: "2026-08-03T10:00:00Z" })
    await route.fulfill({ json: { success: true, data: true, message: null, timestamp: "2026-08-11T10:00:00Z" } })
  })
}

test("organizer can view, collapse, expand, and add invoice notes", async ({ page }) => {
  await mockOrganizerInvoiceDetail(page)

  await page.goto(`/organizer/events/invoices/${INVOICE_ID}`)

  await expect(page.getByText("INV-2001")).toBeVisible()
  const eventLinks = page.getByRole("link", { name: "Annual Convention" })
  await expect(eventLinks).toHaveCount(2)
  await expect(eventLinks.first()).toHaveAttribute("href", "/organizer/events/event-1")
  await expect(eventLinks.first()).toHaveAttribute("target", "_blank")
  await expect(page.getByText("Subtotal")).toBeVisible()
  await expect(page.getByText("Sales Tax")).toBeVisible()
  await expect(page.getByText("Platform Charges")).toBeVisible()
  await expect(page.getByText("Credit Card Fee")).toBeVisible()
  await expect(page.getByText("$75.56")).toBeVisible()
  await expect(page.getByText("$4.00")).toBeVisible()
  await expect(page.getByText("$5.00")).toBeVisible()
  await expect(page.getByText("$504.56")).toBeVisible()
  await expect(page.getByText("Existing newest note")).toBeVisible()

  await page.getByRole("button", { name: /invoice notes 2/i }).click()
  await expect(page.getByText("Existing newest note")).not.toBeVisible()

  await page.getByRole("button", { name: /invoice notes 2/i }).click()
  await expect(page.getByText("Existing newest note")).toBeVisible()

  await page.getByRole("button", { name: /add note/i }).click()
  await page.getByLabel(/^note$/i).fill("Follow up after settlement.")
  await page.getByRole("button", { name: /save note/i }).click()

  const newest = page.getByText("Follow up after settlement.")
  await expect(newest).toBeVisible()
  await expect(newest).toHaveCount(1)
  await expect(page.getByText("Existing newest note")).toBeVisible()
  expect(
    await newest.evaluate((node) => {
      const existing = [...document.querySelectorAll("p")].find((item) => item.textContent === "Existing newest note")
      return existing ? Boolean(node.compareDocumentPosition(existing) & Node.DOCUMENT_POSITION_FOLLOWING) : false
    }),
  ).toBe(true)
})
