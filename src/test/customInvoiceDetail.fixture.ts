import type { CustomInvoiceDetail } from "@/api/customInvoices"

/**
 * A pending, payable, sendable custom invoice that has never been emailed, as the detail endpoint reports it
 * after normalisation. Tests override only the fields their rule depends on, so each reads as the one
 * condition it checks.
 */
export function buildCustomInvoiceDetail(overrides: Partial<CustomInvoiceDetail> = {}): CustomInvoiceDetail {
  return {
    invoiceUniqueId: "invoice-1",
    invoiceNo: "CINV-3001",
    invoiceStatus: "PendingPayment",
    invoiceStatusLabel: "Pending Payment",
    invoiceDateUtc: "2026-08-01T10:00:00Z",
    moduleType: "Event",
    entityUniqueId: "event-1",
    entityName: "Annual Convention",
    categoryName: "Gold Sponsor",
    dueDateUtc: "2026-12-31T00:00:00Z",
    isOverdue: false,
    specialNotes: null,
    companyName: "Northwind Traders",
    buyerFirstName: "Ada",
    buyerMiddleName: null,
    buyerLastName: "Lovelace",
    buyerName: "Ada Lovelace",
    buyerEmail: "ada@example.com",
    buyerPhone: null,
    subTotal: "1500.00",
    totalAmount: "1500.00",
    balanceAmount: "1500.00",
    currencySymbol: "$",
    lineItems: [{ invoiceItemUniqueId: "line-1", description: "Headline sponsorship", amount: "1500.00" }],
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
