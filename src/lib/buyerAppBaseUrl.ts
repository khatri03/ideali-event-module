// Imported by vite.config.ts as well as the app, and that config is type-checked with node types only,
// so this module depends on nothing and never reads Vite's client env itself.

const INVALID_BUYER_APP_BASE_URL_MESSAGE =
  "VITE_BUYER_APP_BASE_URL must be the absolute http(s) address buyers open, for example https://events.example.com."

/**
 * The one validator for the origin every buyer payment link points at. The build and the app both run it,
 * so a bundle can never ship links built from a value the build would have refused.
 * Returns the origin plus any path prefix, without a trailing slash.
 */
export function parseBuyerAppBaseUrl(raw: string | undefined): string {
  let url: URL
  try {
    url = new URL(raw?.trim() ?? "")
  } catch {
    throw new Error(INVALID_BUYER_APP_BASE_URL_MESSAGE)
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(INVALID_BUYER_APP_BASE_URL_MESSAGE)
  }

  return `${url.origin}${url.pathname}`.replace(/\/+$/, "")
}
