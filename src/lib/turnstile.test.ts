import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

interface RenderOptions {
  sitekey: string
  callback: (token: string) => void
  "error-callback": () => void
  "expired-callback": () => void
  "timeout-callback": () => void
  "before-interactive-callback": () => void
  "after-interactive-callback": () => void
}

const SITE_KEY = "0x-site-key"
const HOST_ID = "cloudflare-turnstile-host"

let lastOptions: RenderOptions | null = null
let removedWidgets: string[] = []

function installTurnstileStub() {
  window.turnstile = {
    render: (_container, options) => {
      lastOptions = options as RenderOptions
      return "widget-1"
    },
    remove: (widgetId) => {
      removedWidgets.push(widgetId)
    },
  }
}

async function importTurnstile(siteKey: string | undefined) {
  vi.resetModules()

  if (siteKey === undefined) {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "")
  } else {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", siteKey)
  }

  return import("./turnstile")
}

function host() {
  const element = document.getElementById(HOST_ID)
  if (!element) throw new Error("Turnstile host was never created.")
  return element
}

describe("turnstile", () => {
  beforeEach(() => {
    lastOptions = null
    removedWidgets = []
    document.getElementById(HOST_ID)?.remove()
    installTurnstileStub()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    delete window.turnstile
  })

  it("Configuration_SiteKeyMissing_ReportsTheChallengeAsUnavailable", async () => {
    const { isTurnstileConfigured } = await importTurnstile(undefined)

    expect(isTurnstileConfigured()).toBe(false)
  })

  it("Configuration_SiteKeyPresent_ReportsTheChallengeAsAvailable", async () => {
    const { isTurnstileConfigured } = await importTurnstile(SITE_KEY)

    expect(isTurnstileConfigured()).toBe(true)
  })

  it("Token_WidgetSolves_ResolvesTheTokenAndDestroysTheWidget", async () => {
    const { requestTurnstileToken } = await importTurnstile(SITE_KEY)

    const pending = requestTurnstileToken()
    await vi.waitFor(() => expect(lastOptions).not.toBeNull())
    lastOptions!.callback("0.solved-token")

    await expect(pending).resolves.toBe("0.solved-token")
    expect(removedWidgets).toEqual(["widget-1"])
  })

  it("Token_WidgetRendered_UsesTheConfiguredSiteKey", async () => {
    const { requestTurnstileToken } = await importTurnstile(SITE_KEY)

    const pending = requestTurnstileToken()
    await vi.waitFor(() => expect(lastOptions).not.toBeNull())
    lastOptions!.callback("0.solved-token")
    await pending

    expect(lastOptions!.sitekey).toBe(SITE_KEY)
  })

  it("Token_TwoCallsInSequence_MintAFreshTokenEachTime", async () => {
    const { requestTurnstileToken } = await importTurnstile(SITE_KEY)

    const first = requestTurnstileToken()
    await vi.waitFor(() => expect(lastOptions).not.toBeNull())
    lastOptions!.callback("0.first")
    await first

    lastOptions = null
    const second = requestTurnstileToken()
    await vi.waitFor(() => expect(lastOptions).not.toBeNull())
    lastOptions!.callback("0.second")

    await expect(second).resolves.toBe("0.second")
    expect(removedWidgets).toEqual(["widget-1", "widget-1"])
  })

  it.each([
    ["error-callback"],
    ["expired-callback"],
    ["timeout-callback"],
  ] as const)("Token_Cloudflare%sFires_RejectsWithoutATokenAndCleansUp", async (callbackName) => {
    const { requestTurnstileToken, TurnstileError } = await importTurnstile(SITE_KEY)

    const pending = requestTurnstileToken()
    await vi.waitFor(() => expect(lastOptions).not.toBeNull())
    lastOptions![callbackName]()

    await expect(pending).rejects.toBeInstanceOf(TurnstileError)
    expect(removedWidgets).toEqual(["widget-1"])
  })

  it("Token_ChallengeFails_SaysNothingAboutTheReasonToTheBuyer", async () => {
    const { requestTurnstileToken } = await importTurnstile(SITE_KEY)

    const pending = requestTurnstileToken()
    await vi.waitFor(() => expect(lastOptions).not.toBeNull())
    lastOptions!["error-callback"]()

    await expect(pending).rejects.toThrow("We couldn't verify your browser. Please try again.")
  })

  it("Host_NoInteractionNeeded_StaysOutOfTheBuyersWay", async () => {
    const { requestTurnstileToken } = await importTurnstile(SITE_KEY)

    const pending = requestTurnstileToken()
    await vi.waitFor(() => expect(lastOptions).not.toBeNull())

    expect(host().style.pointerEvents).toBe("none")
    expect(host().style.height).toBe("0px")

    lastOptions!.callback("0.solved-token")
    await pending
  })

  it("Host_CloudflareDemandsInteraction_TakesOverTheScreenThenReleasesIt", async () => {
    const { requestTurnstileToken } = await importTurnstile(SITE_KEY)

    const pending = requestTurnstileToken()
    await vi.waitFor(() => expect(lastOptions).not.toBeNull())

    lastOptions!["before-interactive-callback"]()
    expect(host().style.display).toBe("flex")
    expect(host().style.pointerEvents).not.toBe("none")

    lastOptions!.callback("0.solved-token")
    await pending

    expect(host().style.pointerEvents).toBe("none")
  })
})
