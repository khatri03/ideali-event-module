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

describe("fetchEventInvoices date range", () => {
  beforeEach(() => {
    getMock.mockReset()
    getMock.mockResolvedValue(listResponse(PENDING_INVOICE))
  })

  async function sentParams(filters: Partial<EventInvoiceFilters>) {
    await fetchEventInvoices({ ...NO_FILTERS, ...filters }, 1, 10, "invoiceDateUtc", "desc")
    return getMock.mock.calls.at(-1)?.[1].params as URLSearchParams
  }

  /** The organizer picks a calendar date in their own zone; the API compares against UTC instants. */
  it("DateFrom_IsSentAsTheUtcInstantOfLocalMidnight", async () => {
    const params = await sentParams({ invoiceDateFrom: "2026-03-01" })

    expect(params.get("invoiceDateFrom")).toBe(new Date(2026, 2, 1).toISOString())
  })

  /** Exclusive, so an invoice raised at 23:59 on the chosen day is still inside the range. */
  it("DateTo_IsSentAsTheUtcInstantOfTheFollowingLocalMidnight", async () => {
    const params = await sentParams({ invoiceDateTo: "2026-03-01" })

    expect(params.get("invoiceDateTo")).toBe(new Date(2026, 2, 2).toISOString())
  })

  it("SameDayRange_CoversAnInvoiceRaisedLateThatEvening", async () => {
    const params = await sentParams({ invoiceDateFrom: "2026-03-01", invoiceDateTo: "2026-03-01" })
    const lateEvening = new Date(2026, 2, 1, 23, 59)

    expect(lateEvening >= new Date(params.get("invoiceDateFrom") as string)).toBe(true)
    expect(lateEvening < new Date(params.get("invoiceDateTo") as string)).toBe(true)
  })

  it("NoDatesChosen_SendsNeitherBound", async () => {
    const params = await sentParams({})

    expect(params.has("invoiceDateFrom")).toBe(false)
    expect(params.has("invoiceDateTo")).toBe(false)
  })

  /** A value the picker could never produce must not become a bogus bound the API silently applies. */
  it("MalformedDate_IsDroppedRatherThanSent", async () => {
    const params = await sentParams({ invoiceDateFrom: "01/03/2026" })

    expect(params.has("invoiceDateFrom")).toBe(false)
  })
})
