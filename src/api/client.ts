import axios from "axios"
import { auth } from "@/lib/auth"
import { isTurnstileConfigured, requestTurnstileToken } from "@/lib/turnstile"
import { API_AUTH_ROUTES, APP_ROUTES } from "@/utils/routes"

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000",
  // Carries the refresh cookie and the signed event-cart capability cookie. Drop this and every
  // cart call after creation is refused with 403 cart_capability_required.
  withCredentials: true,
})

const AUTH_FLOW_PATHS = [
  API_AUTH_ROUTES.authenticate,
  API_AUTH_ROUTES.authenticateExternal,
  API_AUTH_ROUTES.twoFactorPrefix,
  API_AUTH_ROUTES.forgotPassword,
  API_AUTH_ROUTES.resetPassword,
  API_AUTH_ROUTES.passwordVerifyLink,
  API_AUTH_ROUTES.logout,
  API_AUTH_ROUTES.refreshToken,
  API_AUTH_ROUTES.session,
]

function shouldSkipRefresh(url?: string) {
  return AUTH_FLOW_PATHS.some((path) => url?.includes(path))
}

async function requestRefreshToken() {
  await axios.post(
    `${client.defaults.baseURL}${API_AUTH_ROUTES.refreshToken}`,
    undefined,
    {
      withCredentials: true,
    }
  )
}

const TURNSTILE_HEADER = "Turnstile-Token"

/**
 * The two anonymous entry points the API challenges: opening a cart, which holds seats, and creating a
 * payment intent, which reaches Stripe. Every other cart route needs a cart id only these can produce.
 */
const CHALLENGED_ROUTES = [
  /^\/api\/events\/cart\/?$/,
  /^\/api\/events\/cart\/[^/]+\/checkout\/intent\/?$/,
  // Anonymous file upload: cheap to call, expensive to serve, so it never runs unchallenged.
  /^\/api\/events\/cart\/[^/]+\/answers\/files\/?$/,
]

function requiresBotChallenge(method: string | undefined, url: string | undefined) {
  if (method?.toLowerCase() !== "post" || !url) return false
  return CHALLENGED_ROUTES.some((route) => route.test(url))
}

// A token is single-use and short-lived, so it is minted per request rather than held for the session.
client.interceptors.request.use(async (config) => {
  if (!isTurnstileConfigured() || !requiresBotChallenge(config.method, config.url)) {
    return config
  }

  config.headers.set(TURNSTILE_HEADER, await requestTurnstileToken())
  return config
})

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (
      error.response?.status !== 401 ||
      original._retry ||
      shouldSkipRefresh(original.url)
    ) {
      return Promise.reject(error)
    }

    original._retry = true

    try {
      await requestRefreshToken()
      return client(original)
    } catch {
      auth.clear()
      if (!window.location.pathname.startsWith(APP_ROUTES.auth.base)) {
        window.location.href = APP_ROUTES.auth.login
      }
      return Promise.reject(error)
    }
  }
)
