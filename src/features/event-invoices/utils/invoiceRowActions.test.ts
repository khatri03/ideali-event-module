import { describe, expect, it } from "vitest"
import { canResendInvoiceTickets } from "./invoiceRowActions"

describe("canResendInvoiceTickets", () => {
  it("PaidInvoiceWithTickets_AllowsResend", () => {
    expect(canResendInvoiceTickets({ invoiceStatus: "Paid", ticketCount: 2 })).toBe(true)
  })

  it.each(["Cancelled", "Refund", "AdjustedInSystem", "Failed"])(
    "%sInvoice_BlocksResend",
    (invoiceStatus) => {
      expect(canResendInvoiceTickets({ invoiceStatus, ticketCount: 2 })).toBe(false)
    },
  )

  it("InvoiceWithoutIssuedTickets_BlocksResend", () => {
    expect(canResendInvoiceTickets({ invoiceStatus: "PendingPayment", ticketCount: 0 })).toBe(false)
  })

  /** A partial refund still leaves tickets the rest of the party can use. */
  it("PartiallyRefundedInvoice_AllowsResend", () => {
    expect(canResendInvoiceTickets({ invoiceStatus: "PartiallyRefunded", ticketCount: 3 })).toBe(true)
  })
})
