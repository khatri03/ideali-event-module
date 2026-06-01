import axios from "axios"
import { auth } from "@/lib/auth"
import { API_AUTH_ROUTES, APP_ROUTES } from "@/utils/routes"

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000",
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
