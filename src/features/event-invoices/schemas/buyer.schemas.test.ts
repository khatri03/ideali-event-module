import { describe, expect, it } from "vitest"
import { buyerSchema } from "./buyer.schemas"

function parse(overrides: Partial<Record<"buyerName" | "buyerEmail" | "buyerPhone", string>> = {}) {
  return buyerSchema.safeParse({
    buyerName: "Jane Doe",
    buyerEmail: "jane@example.com",
    buyerPhone: "",
    ...overrides,
  })
}

function messageFor(result: ReturnType<typeof parse>, field: "buyerName" | "buyerEmail" | "buyerPhone") {
  return result.success ? null : result.error.issues.find((issue) => issue.path[0] === field)?.message
}

describe("buyerSchema", () => {
  it("CompleteBuyer_IsAccepted", () => {
    expect(parse({ buyerPhone: "+1 555 0100" }).success).toBe(true)
  })

  it("PhoneOmitted_IsAcceptedBecauseItIsOptional", () => {
    expect(parse({ buyerPhone: "" }).success).toBe(true)
  })

  it("SurroundingWhitespace_IsTrimmedRatherThanStored", () => {
    const result = parse({ buyerName: "  Jane Doe  ", buyerPhone: "  +1 555 0100  " })

    expect(result.success).toBe(true)
    expect(result.success && result.data.buyerName).toBe("Jane Doe")
    expect(result.success && result.data.buyerPhone).toBe("+1 555 0100")
  })

  it.each(["", "   "])("BlankName_IsRejected_%s", (buyerName) => {
    expect(messageFor(parse({ buyerName }), "buyerName")).toMatch(/buyer name is required/i)
  })

  it.each(["", "   ", "not-an-address", "@example.com", "jane@"])(
    "UnroutableEmail_IsRejected_%s",
    (buyerEmail) => {
      expect(messageFor(parse({ buyerEmail }), "buyerEmail")).toMatch(/actually receive mail at/i)
    },
  )

  it("NameLongerThanTheColumn_IsRejectedBeforeTheRequestIsMade", () => {
    expect(messageFor(parse({ buyerName: "a".repeat(256) }), "buyerName")).toMatch(/under 255 characters/i)
  })

  it("NameExactlyTheColumnWidth_IsAccepted", () => {
    expect(parse({ buyerName: "a".repeat(255) }).success).toBe(true)
  })

  it("PhoneLongerThanTheColumn_IsRejectedBeforeTheRequestIsMade", () => {
    expect(messageFor(parse({ buyerPhone: "9".repeat(51) }), "buyerPhone")).toMatch(/under 50 characters/i)
  })

  it("PhoneExactlyTheColumnWidth_IsAccepted", () => {
    expect(parse({ buyerPhone: "9".repeat(50) }).success).toBe(true)
  })
})
