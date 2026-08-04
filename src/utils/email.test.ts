import { describe, expect, it } from "vitest"
import { isRoutableEmail } from "@/utils/email"

describe("isRoutableEmail", () => {
  it("accepts an address the mail provider can deliver to", () => {
    expect(isRoutableEmail("buyer@example.com")).toBe(true)
  })

  it("accepts an address padded with whitespace", () => {
    expect(isRoutableEmail("  buyer@example.com  ")).toBe(true)
  })

  it.each(["k", "buyer@", "@example.com", "buyer example.com"])(
    "rejects %s, which the mail provider answers with a 400",
    (value) => {
      expect(isRoutableEmail(value)).toBe(false)
    },
  )

  it.each([null, undefined, "", "   "])("treats %s as not routable", (value) => {
    expect(isRoutableEmail(value)).toBe(false)
  })
})
