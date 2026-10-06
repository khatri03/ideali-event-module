import { describe, expect, it } from "vitest"
import { customInvoiceLineSchema, customInvoiceSchema } from "./customInvoice.schemas"

const VALID = {
  moduleType: "Event",
  entityUniqueId: "evt-1",
  categoryUniqueId: "cat-1",
  dueDate: "2026-12-31",
  companyName: "Acme Corp",
  lastName: "Doe",
  email: "buyer@acme.test",
  lineItems: [{ description: "Gold sponsorship", amount: "100.00" }],
  emailOnCreate: true,
  linkToExisting: false,
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

  /** Turning off the email-on-create choice is kept as the organizer set it, so no link is sent against their wish. */
  it("customInvoiceSchema_EmailOnCreateOff_IsKeptAsFalse", () => {
    const result = customInvoiceSchema.safeParse({ ...VALID, emailOnCreate: false })

    expect(result.success && result.data.emailOnCreate).toBe(false)
  })

  /** The email-on-create choice must be a yes or no; an unset flag cannot decide whether the buyer is emailed. */
  it("customInvoiceSchema_EmailOnCreateMissing_Rejected", () => {
    expect(customInvoiceSchema.safeParse({ ...VALID, emailOnCreate: undefined }).success).toBe(false)
  })

  /** No module picked is blocked with the server's own wording, so the rule reads the same on both sides. */
  it("customInvoiceSchema_MissingModule_ReportsChooseModule", () => {
    expect(firstError({ ...VALID, moduleType: undefined })).toBe("Choose the module this invoice bills.")
  })

  /** A module the invoice cannot bill is refused rather than posted for the server to reject. */
  it("customInvoiceSchema_UnknownModule_ReportsChooseModule", () => {
    expect(firstError({ ...VALID, moduleType: "Parking" })).toBe("Choose the module this invoice bills.")
  })

  /** No record picked is blocked: an invoice must bill something within its module. */
  it("customInvoiceSchema_MissingEntity_ReportsChooseWhatItBills", () => {
    expect(firstError({ ...VALID, entityUniqueId: "" })).toBe("Choose what this invoice bills.")
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

  /** A non-positive amount on a line is refused through the whole-form parse, not only the line schema. */
  it("NonPositiveLineAmount_RejectedThroughFullForm", () => {
    expect(firstError({ ...VALID, lineItems: [{ description: "Booth", amount: "0" }] })).toBe(
      "Enter an amount greater than zero.",
    )
  })

  /** A member-picked buyer carries its member id through the form without disturbing validation. */
  it("MemberUniqueId_IsAcceptedAlongsideAValidBuyer", () => {
    expect(customInvoiceSchema.safeParse({ ...VALID, memberUniqueId: "mem-1" }).success).toBe(true)
  })
})

describe("customInvoiceSchema link to an existing invoice", () => {
  /** With the link switched on, saving without a picked invoice is stopped in the form, on the picker's own field. */
  it("schema_LinkOnWithoutPick_ReportsChooseTheInvoiceToLinkTo", () => {
    const result = customInvoiceSchema.safeParse({ ...VALID, linkToExisting: true })

    expect(result.success).toBe(false)
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ["linkedInvoiceUniqueId"], message: "Choose the invoice to link to." }),
    ])
  })

  /** A link switched off is ignored even when an id from an earlier pick is still held, so it never blocks saving. */
  it("schema_LinkOff_IgnoresLinkedId", () => {
    expect(customInvoiceSchema.safeParse({ ...VALID, linkToExisting: false, linkedInvoiceUniqueId: "" }).success).toBe(true)
  })

  /** A link switched on with a picked invoice is valid. */
  it("schema_LinkOnWithPick_Accepted", () => {
    expect(customInvoiceSchema.safeParse({ ...VALID, linkToExisting: true, linkedInvoiceUniqueId: "inv-42" }).success).toBe(true)
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
