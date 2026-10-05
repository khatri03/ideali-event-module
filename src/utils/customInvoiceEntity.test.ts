import { describe, expect, it } from "vitest"
import { formatBilledEntity } from "./customInvoiceEntity"

describe("formatBilledEntity", () => {
  /** Each module is named with the entity picker's label, so a Donation invoice reads as a campaign, not a "Donation". */
  it.each([
    ["Event", "Annual Gala", "Event: Annual Gala"],
    ["Membership", "Gold", "Membership: Gold"],
    ["Donation", "Winter Appeal", "Campaign: Winter Appeal"],
  ] as const)("%sInvoice_IsLabelledByItsModule", (moduleType, entityName, expected) => {
    expect(formatBilledEntity(moduleType, entityName)).toBe(expected)
  })

  /** A deleted record arrives with a blank name; printing "Membership:" with nothing after it would look broken. */
  it.each([null, "", "   "])("BlankName_%j_ReturnsNothingToShow", (entityName) => {
    expect(formatBilledEntity("Membership", entityName)).toBe("")
  })

  /** Stray whitespace from the record's name must not leak into the printed label. */
  it("PaddedName_IsTrimmed", () => {
    expect(formatBilledEntity("Event", "  Annual Gala  ")).toBe("Event: Annual Gala")
  })
})
