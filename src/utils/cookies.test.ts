import { afterEach, describe, expect, it } from "vitest"
import { deleteCookie, readCookie, writeCookie } from "@/utils/cookies"

function clearAllCookies() {
  for (const entry of document.cookie.split(";")) {
    const name = entry.split("=")[0]?.trim()
    if (name) deleteCookie(decodeURIComponent(name), "/")
  }
}

afterEach(clearAllCookies)

describe("cookies", () => {
  it("Write_ThenRead_ReturnsTheStoredValue", () => {
    writeCookie("cart", "abc-123", { path: "/" })

    expect(readCookie("cart")).toBe("abc-123")
  })

  it("Read_UnknownName_ReturnsNull", () => {
    expect(readCookie("missing")).toBeNull()
  })

  it("Read_WithOtherCookiesPresent_PicksTheRightOne", () => {
    writeCookie("theme", "dark", { path: "/" })
    writeCookie("cart", "abc-123", { path: "/" })
    writeCookie("cart-other", "should-not-match", { path: "/" })

    expect(readCookie("cart")).toBe("abc-123")
  })

  it("Read_NameIsAPrefixOfAnother_DoesNotMatchThatOther", () => {
    writeCookie("cart-other", "nope", { path: "/" })

    expect(readCookie("cart")).toBeNull()
  })

  it("Write_ValueWithSpecialCharacters_RoundTrips", () => {
    writeCookie("cart", "a;b=c d", { path: "/" })

    expect(readCookie("cart")).toBe("a;b=c d")
  })

  it("Delete_ExistingCookie_RemovesIt", () => {
    writeCookie("cart", "abc-123", { path: "/" })
    deleteCookie("cart", "/")

    expect(readCookie("cart")).toBeNull()
  })

  it("Write_PastExpiry_IsNotReadableBack", () => {
    writeCookie("cart", "abc-123", { path: "/", expires: new Date(Date.now() - 60_000) })

    expect(readCookie("cart")).toBeNull()
  })

  it("Write_FutureExpiry_IsReadableBack", () => {
    writeCookie("cart", "abc-123", { path: "/", expires: new Date(Date.now() + 600_000) })

    expect(readCookie("cart")).toBe("abc-123")
  })
})
