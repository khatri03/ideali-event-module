import { afterEach, describe, expect, it, vi } from "vitest"
import { buildBuyerAppUrl } from "./appConfig"

describe("buildBuyerAppUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  /** The organizer shares this URL with a buyer, so it must be the configured buyer origin followed by the route, with nothing lost or doubled at the join. */
  it("BuildBuyerAppUrl_JoinsBaseAndRoute", () => {
    vi.stubEnv("VITE_BUYER_APP_BASE_URL", "https://pay.example.test")

    expect(buildBuyerAppUrl("/custom-invoices/abc/pay")).toBe("https://pay.example.test/custom-invoices/abc/pay")
  })

  /** A misconfigured origin must fail loudly at the point of use rather than produce a link to the wrong place. */
  it("BuildBuyerAppUrl_InvalidBase_Throws", () => {
    vi.stubEnv("VITE_BUYER_APP_BASE_URL", "events.example.com")

    expect(() => buildBuyerAppUrl("/custom-invoices/abc/pay")).toThrow(/VITE_BUYER_APP_BASE_URL/)
  })
})
