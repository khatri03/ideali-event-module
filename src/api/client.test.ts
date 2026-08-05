import type { InternalAxiosRequestConfig } from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { turnstileMocks } = vi.hoisted(() => ({
  turnstileMocks: {
    isTurnstileConfigured: vi.fn(() => true),
    requestTurnstileToken: vi.fn(async () => "0.minted-token"),
  },
}))

vi.mock("@/lib/turnstile", () => ({
  ...turnstileMocks,
  TurnstileError: class TurnstileError extends Error {},
}))

const { client } = await import("./client")

const CART_ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301"

let sentRequests: InternalAxiosRequestConfig[] = []

client.defaults.adapter = async (config) => {
  sentRequests.push(config as InternalAxiosRequestConfig)

  return {
    data: { success: true, data: null },
    status: 200,
    statusText: "OK",
    headers: {},
    config: config as InternalAxiosRequestConfig,
  }
}

function sentHeader() {
  const request = sentRequests.at(-1)
  if (!request) throw new Error("No request reached the adapter.")
  return request.headers.get("Turnstile-Token") ?? null
}

describe("api client bot challenge", () => {
  beforeEach(() => {
    sentRequests = []
    turnstileMocks.isTurnstileConfigured.mockReset().mockReturnValue(true)
    turnstileMocks.requestTurnstileToken.mockReset().mockResolvedValue("0.minted-token")
  })

  it("Challenge_OpeningACart_SendsAFreshTurnstileToken", async () => {
    await client.post("/api/events/cart", {})

    expect(sentHeader()).toBe("0.minted-token")
  })

  it("Challenge_CreatingAPaymentIntent_SendsAFreshTurnstileToken", async () => {
    await client.post(`/api/events/cart/${CART_ID}/checkout/intent`, {})

    expect(sentHeader()).toBe("0.minted-token")
  })

  it("Challenge_UploadingAnAnswerFile_SendsAFreshTurnstileToken", async () => {
    await client.post(`/api/events/cart/${CART_ID}/answers/files`, new FormData())

    expect(sentHeader()).toBe("0.minted-token")
  })

  it("Challenge_SubmittingAnswers_SendsNoTokenBecauseTheCartIdAlreadyProvesTheChallenge", async () => {
    await client.post(`/api/events/cart/${CART_ID}/answers`, {})

    expect(sentHeader()).toBeNull()
    expect(turnstileMocks.requestTurnstileToken).not.toHaveBeenCalled()
  })

  it("Challenge_TwoChallengedCalls_MintASeparateTokenForEach", async () => {
    turnstileMocks.requestTurnstileToken
      .mockResolvedValueOnce("0.first")
      .mockResolvedValueOnce("0.second")

    await client.post("/api/events/cart", {})
    const firstToken = sentHeader()
    await client.post(`/api/events/cart/${CART_ID}/checkout/intent`, {})

    expect(firstToken).toBe("0.first")
    expect(sentHeader()).toBe("0.second")
  })

  it.each([
    ["priced", `/api/events/cart/${CART_ID}/price`],
    ["confirmed", `/api/events/cart/${CART_ID}/checkout/confirm`],
    ["extended with a line", `/api/events/cart/${CART_ID}/lines`],
  ])("Challenge_CartIs%s_SendsNoTokenBecauseTheCartIdAlreadyProvesTheChallenge", async (_case, url) => {
    await client.post(url, {})

    expect(sentHeader()).toBeNull()
    expect(turnstileMocks.requestTurnstileToken).not.toHaveBeenCalled()
  })

  it("Challenge_ReadingACart_SendsNoToken", async () => {
    await client.get(`/api/events/cart/${CART_ID}`)

    expect(sentHeader()).toBeNull()
  })

  it("Challenge_SiteKeyNotConfigured_SendsTheRequestUnchallenged", async () => {
    turnstileMocks.isTurnstileConfigured.mockReturnValue(false)

    await client.post("/api/events/cart", {})

    expect(sentHeader()).toBeNull()
    expect(turnstileMocks.requestTurnstileToken).not.toHaveBeenCalled()
  })

  it("Challenge_TokenCannotBeMinted_NeverReachesTheApi", async () => {
    turnstileMocks.requestTurnstileToken.mockRejectedValue(new Error("challenge failed"))

    await expect(client.post("/api/events/cart", {})).rejects.toThrow("challenge failed")
    expect(sentRequests).toHaveLength(0)
  })
})
