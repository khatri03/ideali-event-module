import { describe, expect, it } from "vitest"
import { invoiceDetailPath } from "./invoiceRoutes"

describe("invoiceDetailPath", () => {
  /** A custom invoice is served only by its own page; the Event detail route answers ticket orders alone. */
  it("CustomInvoice_OpensTheCustomInvoiceDetailRoute", () => {
    expect(invoiceDetailPath({ invoiceUniqueId: "invoice-2", invoiceType: "Custom" })).toBe(
      "/organizer/custom-invoices/invoice-2",
    )
  })

  /** A ticket order keeps opening on the Event invoice detail route. */
  it("TicketOrder_OpensTheEventInvoiceDetailRoute", () => {
    expect(invoiceDetailPath({ invoiceUniqueId: "invoice-1", invoiceType: "Regular" })).toBe(
      "/organizer/events/invoices/invoice-1",
    )
  })
})
