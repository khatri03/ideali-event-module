import { parseBuyerAppBaseUrl } from "./buyerAppBaseUrl"

/** The buyer-facing origin, read through the same validator the build runs so the two can never disagree. */
export function readBuyerAppBaseUrl(): string {
  return parseBuyerAppBaseUrl(import.meta.env.VITE_BUYER_APP_BASE_URL as string | undefined)
}

/** An absolute URL a buyer can open outside the organizer's session, for a browser route such as the invoice pay page. */
export function buildBuyerAppUrl(path: string): string {
  return `${readBuyerAppBaseUrl()}${path}`
}
