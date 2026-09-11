import { beforeEach, describe, expect, it, vi } from "vitest"
import { fetchEventSeating } from "./eventSeating"

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock("./client", () => ({ client: { get: getMock } }))

const CART_UNIQUE_ID = "3a8ed9de-45c8-4326-8bbe-5e433c5f4d9d"
const SESSION_UNIQUE_ID = "1ac62399-e763-4b7e-ad58-0c6aad72ebce"

const SEATING_MAP = {
  sessionUniqueId: SESSION_UNIQUE_ID,
  seatsIoPublicKey: "public-key",
  region: "eu",
  seatsIoEventKey: "event-key",
  holdToken: "hold-token",
  holdTokenExpiresAtUtc: "2026-09-10T10:00:00Z",
  categories: [],
  selectedSeats: [],
}

beforeEach(() => {
  getMock.mockReset()
  getMock.mockResolvedValue({ data: { data: SEATING_MAP } })
})

describe("fetchEventSeating", () => {
  /**
   * The chart holds every seat the buyer picks under the browser's own token before a cart exists. When the cart
   * later reads the map it must be told that token, or it mints a second one and the seats — held under the first —
   * can no longer be released. So the presented token has to travel to the server as a query parameter.
   */
  it("sends the presented hold token so the cart adopts it rather than minting another", async () => {
    await fetchEventSeating(CART_UNIQUE_ID, SESSION_UNIQUE_ID, "browser-token")

    expect(getMock).toHaveBeenCalledWith(
      expect.stringContaining(CART_UNIQUE_ID) as unknown as string,
      { params: { holdToken: "browser-token" } },
    )
  })

  /**
   * A cart with no seats picked before it opened has no token to offer. Sending a blank one would ask the server to
   * adopt nothing, so the parameter is omitted entirely and the cart mints its own token as it always has.
   */
  it("omits the token parameter when the browser is holding none", async () => {
    await fetchEventSeating(CART_UNIQUE_ID, SESSION_UNIQUE_ID, null)

    expect(getMock).toHaveBeenCalledWith(
      expect.stringContaining(CART_UNIQUE_ID) as unknown as string,
      { params: undefined },
    )
  })
})
