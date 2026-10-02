import { describe, expect, it } from "vitest"
import { invoiceCategoryFormSchema } from "./invoiceCategory.schemas"

const VALID = { name: "Gold Sponsor", isActive: true, displayOrder: "" }

function firstError(input: Record<string, unknown>): string | undefined {
  const result = invoiceCategoryFormSchema.safeParse(input)
  return result.success ? undefined : result.error.issues[0]?.message
}

describe("invoiceCategoryFormSchema", () => {
  /** A blank name is the most common mistake and must be caught with the exact backend wording. */
  it("BlankName_RejectedWithRequiredMessage", () => {
    expect(firstError({ ...VALID, name: "   " })).toBe("Category name is required.")
  })

  /** A single character is not a usable category label; the backend enforces two, so must the form. */
  it("OneCharName_RejectedWithMinLengthMessage", () => {
    expect(firstError({ ...VALID, name: "A" })).toBe("Category name must be at least 2 characters.")
  })

  /** The column caps at 100 characters; a longer name must fail on the client before it reaches the API. */
  it("NameOver100Chars_RejectedWithMaxLengthMessage", () => {
    expect(firstError({ ...VALID, name: "x".repeat(101) })).toBe(
      "Category name must be 100 characters or fewer.",
    )
  })

  /** A well-formed category with no explicit order is valid - blank display order is allowed. */
  it("ValidNameBlankOrder_Accepted", () => {
    expect(invoiceCategoryFormSchema.safeParse(VALID).success).toBe(true)
  })

  /** A whole-number order is accepted; the picker uses it to sort. */
  it("WholeNumberDisplayOrder_Accepted", () => {
    expect(invoiceCategoryFormSchema.safeParse({ ...VALID, displayOrder: "3" }).success).toBe(true)
  })

  /** A negative or fractional order is nonsense for a sort position and is rejected. */
  it("NegativeOrFractionalDisplayOrder_Rejected", () => {
    expect(firstError({ ...VALID, displayOrder: "-1" })).toBe(
      "Display order must be a whole number, zero or greater.",
    )
    expect(firstError({ ...VALID, displayOrder: "1.5" })).toBe(
      "Display order must be a whole number, zero or greater.",
    )
  })
})
