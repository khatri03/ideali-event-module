import { describe, expect, it } from "vitest"
import { customInvoiceLineSchema, customInvoiceSchema } from "./customInvoice.schemas"

const VALID = {
  eventUniqueId: "evt-1",
  categoryUniqueId: "cat-1",
  dueDate: "2026-12-31",
  companyName: "Acme Corp",
  lastName: "Doe",
  email: "buyer@acme.test",
  lineItems: [{ description: "Gold sponsorship", amount: "100.00" }],
}

function firstError(input: Record<string, unknown>): string | undefined {
  const result = customInvoiceSchema.safeParse(input)
  return result.success ? undefined : result.error.issues[0]?.message
}

describe("customInvoiceSchema", () => {
  /** A fully filled form with one line is the happy path and must parse. */
  it("ValidForm_Accepted", () => {
    expect(customInvoiceSchema.safeParse(VALID).success).toBe(true)
  })

  /** No event picked is blocked with the exact backend wording. */
  it("MissingEvent_RejectedWithSelectMessage", () => {
    expect(firstError({ ...VALID, eventUniqueId: "" })).toBe("Select an event.")
  })

  /** No sponsorship type picked is blocked. */
  it("MissingCategory_RejectedWithSelectMessage", () => {
    expect(firstError({ ...VALID, categoryUniqueId: "" })).toBe("Select a sponsorship type.")
  })

  /** A due date is required to issue the invoice. */
  it("MissingDueDate_Rejected", () => {
    expect(firstError({ ...VALID, dueDate: "" })).toBe("Payment due date is required.")
  })

  /** Company is required to issue (BUYER-03). */
  it("BlankCompany_Rejected", () => {
    expect(firstError({ ...VALID, companyName: "   " })).toBe("Company name is required.")
  })

  /** Last name is required to issue (BUYER-03). */
  it("BlankLastName_Rejected", () => {
    expect(firstError({ ...VALID, lastName: "   " })).toBe("Last name is required.")
  })

  /** An unroutable email is caught client-side with the buyer-facing message. */
  it("InvalidEmail_Rejected", () => {
    expect(firstError({ ...VALID, email: "not-an-email" })).toBe(
      "Enter an email address the buyer can actually receive mail at.",
    )
  })

  /** At least one line is required - there is nothing to bill otherwise. */
  it("NoLineItems_Rejected", () => {
    expect(firstError({ ...VALID, lineItems: [] })).toBe("Add at least one line item to bill for.")
  })

  /** Notes over the 2000-character column cap are rejected before reaching the API. */
  it("NotesOver2000Chars_Rejected", () => {
    expect(firstError({ ...VALID, specialNotes: "x".repeat(2001) })).toBe(
      "Keep notes under 2000 characters.",
    )
  })
})

describe("customInvoiceLineSchema", () => {
  /** A blank description is not a billable line. */
  it("BlankDescription_Rejected", () => {
    const result = customInvoiceLineSchema.safeParse({ description: "  ", amount: "10.00" })
    expect(result.success ? undefined : result.error.issues[0]?.message).toBe("Description is required.")
  })

  /** Zero or negative amounts are refused - a line must charge something. */
  it("ZeroAmount_Rejected", () => {
    const result = customInvoiceLineSchema.safeParse({ description: "Booth", amount: "0" })
    expect(result.success ? undefined : result.error.issues[0]?.message).toBe(
      "Enter an amount greater than zero.",
    )
  })

  /** A non-numeric amount is refused with the same wording so the form reads consistently. */
  it("NonNumericAmount_Rejected", () => {
    const result = customInvoiceLineSchema.safeParse({ description: "Booth", amount: "abc" })
    expect(result.success ? undefined : result.error.issues[0]?.message).toBe(
      "Enter an amount greater than zero.",
    )
  })

  /** Money keeps two decimal places; three is refused. */
  it("MoreThanTwoDecimals_Rejected", () => {
    const result = customInvoiceLineSchema.safeParse({ description: "Booth", amount: "10.001" })
    expect(result.success).toBe(false)
  })

  /** A well-formed decimal line parses. */
  it("ValidLine_Accepted", () => {
    expect(customInvoiceLineSchema.safeParse({ description: "Booth", amount: "10.01" }).success).toBe(true)
  })
})
