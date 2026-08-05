const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
const SCRIPT_ID = "cloudflare-turnstile"
const CONTAINER_ID = "cloudflare-turnstile-host"

/** Cloudflare gives up on its own long before this; the guard only covers a script that never answers. */
const TOKEN_TIMEOUT_MS = 45_000

const CHALLENGE_FAILED_MESSAGE = "We couldn't verify your browser. Please try again."

/** Distinguishes a challenge that never produced a token from an API rejection of one that did. */
export class TurnstileError extends Error {
  constructor() {
    super(CHALLENGE_FAILED_MESSAGE)
    this.name = "TurnstileError"
  }
}

interface TurnstileRenderOptions {
  sitekey: string
  appearance: "always" | "execute" | "interaction-only"
  retry: "auto" | "never"
  callback: (token: string) => void
  "error-callback": () => void
  "expired-callback": () => void
  "timeout-callback": () => void
  "before-interactive-callback": () => void
  "after-interactive-callback": () => void
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const siteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() ?? ""

let scriptPromise: Promise<TurnstileApi> | null = null

/**
 * Absent site key means the deployment runs unchallenged, which is how local development and the
 * existing production build behave today. Callers skip the challenge rather than block on it.
 */
export function isTurnstileConfigured(): boolean {
  return siteKey.length > 0
}

/**
 * Mints one single-use Cloudflare Turnstile token. A widget is rendered, read and destroyed per call,
 * because a token expires in minutes while a registration wizard stays open for far longer.
 */
export async function requestTurnstileToken(): Promise<string> {
  const turnstile = await loadTurnstile()
  const host = resolveHost()

  return new Promise<string>((resolve, reject) => {
    let widgetId: string | null = null

    const settle = (outcome: () => void) => {
      window.clearTimeout(timeoutId)
      hideHost(host)
      if (widgetId !== null) turnstile.remove(widgetId)
      outcome()
    }

    const timeoutId = window.setTimeout(
      () => settle(() => reject(new TurnstileError())),
      TOKEN_TIMEOUT_MS,
    )

    const fail = () => settle(() => reject(new TurnstileError()))

    widgetId = turnstile.render(host, {
      sitekey: siteKey,
      appearance: "interaction-only",
      retry: "never",
      callback: (token) => settle(() => resolve(token)),
      "error-callback": fail,
      "expired-callback": fail,
      "timeout-callback": fail,
      "before-interactive-callback": () => showHost(host),
      "after-interactive-callback": () => hideHost(host),
    })
  })
}

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID)
    const script = existing instanceof HTMLScriptElement ? existing : document.createElement("script")

    script.addEventListener("load", () => {
      if (window.turnstile) {
        resolve(window.turnstile)
        return
      }

      scriptPromise = null
      reject(new TurnstileError())
    })

    script.addEventListener("error", () => {
      scriptPromise = null
      reject(new TurnstileError())
    })

    if (existing !== script) {
      script.id = SCRIPT_ID
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
  })

  return scriptPromise
}

/**
 * The widget must sit in the live document to render, but stays collapsed until Cloudflare decides the
 * visitor has to solve something - only then does it take over the screen.
 */
function resolveHost(): HTMLElement {
  const existing = document.getElementById(CONTAINER_ID)
  if (existing) return existing

  const host = document.createElement("div")
  host.id = CONTAINER_ID
  hideHost(host)
  document.body.appendChild(host)

  return host
}

function showHost(host: HTMLElement) {
  host.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483647",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "padding:16px",
    "background:rgba(0,0,0,0.55)",
  ].join(";")
}

function hideHost(host: HTMLElement) {
  host.style.cssText = "position:fixed;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none"
}
