import { describe, expect, it } from "vitest"
import { parseBuyerAppBaseUrl } from "./buyerAppBaseUrl"

const INVALID_MESSAGE =
  "VITE_BUYER_APP_BASE_URL must be the absolute http(s) address buyers open, for example https://events.example.com."

describe("parseBuyerAppBaseUrl", () => {
  /** A build with no buyer origin would ship payment links that point nowhere, so it must stop with a message naming the variable. */
  it.each([
    ["missing", undefined],
    ["blank", "   "],
  ])("ParseBuyerAppBaseUrl_Missing_ThrowsAPlainMessage_%s", (_case, raw) => {
    expect(() => parseBuyerAppBaseUrl(raw)).toThrow(INVALID_MESSAGE)
  })

  /** A relative value resolves against whatever page the organizer is on, which is never the buyer's pay page. */
  it("ParseBuyerAppBaseUrl_Relative_Throws", () => {
    expect(() => parseBuyerAppBaseUrl("/events")).toThrow(INVALID_MESSAGE)
  })

  /** Only a web address can be opened by a buyer; any other scheme would hand them a link their browser cannot load. */
  it("ParseBuyerAppBaseUrl_NonHttpScheme_Throws", () => {
    expect(() => parseBuyerAppBaseUrl("ftp://events.example.com")).toThrow(INVALID_MESSAGE)
  })

  /** Routes start with a slash, so a trailing slash on the origin would put a double slash in every payment link. */
  it("ParseBuyerAppBaseUrl_TrailingSlash_IsStripped", () => {
    expect(parseBuyerAppBaseUrl("https://events.example.com/")).toBe("https://events.example.com")
  })

  /** A buyer app hosted under a sub-path must keep that path, or every link lands outside the app. */
  it("ParseBuyerAppBaseUrl_WithPathPrefix_KeepsThePrefix", () => {
    expect(parseBuyerAppBaseUrl("https://example.com/buyers/")).toBe("https://example.com/buyers")
  })
})
