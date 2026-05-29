import axios from "axios"
import { auth } from "@/lib/auth"

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000",
  withCredentials: true,
})

const AUTH_FLOW_PATHS = [
  "/api/identity/account/authenticate",
  "/api/identity/account/authenticate/external-login",
  "/api/identity/account/2fa/",
  "/api/identity/account/forgot-password",
  "/api/identity/account/reset-password",
  "/api/identity/account/password-verify-link",
  "/api/identity/account/logout",
  "/api/identity/account/refresh-token",
  "/api/identity/account/session",
]

function shouldSkipRefresh(url?: string) {
  return AUTH_FLOW_PATHS.some((path) => url?.includes(path))
}

async function requestRefreshToken() {
  await axios.post(
    `${client.defaults.baseURL}/api/identity/account/refresh-token`,
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
      if (!window.location.pathname.startsWith("/auth")) {
        window.location.href = "/auth/login"
      }
      return Promise.reject(error)
    }
  }
)
