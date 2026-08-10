import { beforeEach, describe, expect, it, vi } from "vitest"
import { fetchEventInvoices, type EventInvoiceFilters } from "./eventInvoices"

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock("./client", () => ({ client: { get: getMock } }))

const NO_FILTERS: EventInvoiceFilters = {
  eventUniqueIds: [],
  sessionUniqueIds: [],
  statuses: [],
  paymentMethods: [],
  invoiceDateFrom: null,
  invoiceDateTo: null,
  searchTerm: "",
}

function listResponse(invoice: Record<string, unknown>) {
  return {
    data: {
      success: true,
      data: { pageNo: 1, pageSize: 10, pageCount: 1, totalRecordsCount: 1, pageData: [invoice] },
    },
  }
}

const PENDING_INVOICE = {
  invoiceUniqueId: "invoice-1",
  invoiceNo: "INV-1",
  eventUniqueId: "event-1",
  eventName: "Annual Summit",
  buyerName: "Jane Doe",
  invoiceStatus: "PendingPayment",
  invoiceDateUtc: "2026-08-01T10:00:00Z",
  totalAmount: 100,
  balanceAmount: 100,
  currencySymbol: "$",
  ticketCount: 1,
}

async function firstInvoice() {
  const page = await fetchEventInvoices(NO_FILTERS, 1, 10, "invoiceDateUtc", "desc")
  return page.items[0]
}

describe("fetchEventInvoices status labelling", () => {
  beforeEach(() => getMock.mockReset())

  it("StatusLabelSentByApi_IsUsedForDisplayWhileTheEnumNameStaysTheKey", async () => {
    getMock.mockResolvedValue(listResponse({ ...PENDING_INVOICE, invoiceStatusLabel: "Pending Payment" }))

    const invoice = await firstInvoice()

    expect(invoice.invoiceStatusLabel).toBe("Pending Payment")
    expect(invoice.invoiceStatus).toBe("PendingPayment")
  })

  it("StatusLabelMissing_FallsBackToTheEnumNameRatherThanRenderingBlank", async () => {
    getMock.mockResolvedValue(listResponse(PENDING_INVOICE))

    expect((await firstInvoice()).invoiceStatusLabel).toBe("PendingPayment")
  })

  it("StatusLabelBlank_FallsBackToTheEnumName", async () => {
    getMock.mockResolvedValue(listResponse({ ...PENDING_INVOICE, invoiceStatusLabel: "   " }))

    expect((await firstInvoice()).invoiceStatusLabel).toBe("PendingPayment")
  })
})
