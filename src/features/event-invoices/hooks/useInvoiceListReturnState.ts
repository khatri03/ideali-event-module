import { useLocation, useNavigate } from "react-router-dom"
import { APP_ROUTES } from "@/utils/routes"

export interface InvoiceListReturnState {
  returnTo: string
}

/**
 * Records the list URL an invoice was opened from so the detail page can send the organizer back to the
 * same place rather than a freshly defaulted list.
 */
export function useInvoiceListReturnState(): InvoiceListReturnState {
  const location = useLocation()
  return { returnTo: `${location.pathname}${location.search}` }
}

/**
 * Where "back" should land, as the list recorded it when it opened this invoice. Only an in-app path is
 * honoured - history state is attacker-reachable, and an absolute URL here would be an open redirect.
 */
export function readReturnTo(state: unknown): string | null {
  if (typeof state !== "object" || state === null) {
    return null
  }
  const candidate = (state as { returnTo?: unknown }).returnTo
  const isInAppPath = typeof candidate === "string" && candidate.startsWith("/") && !candidate.startsWith("//")
  return isInAppPath ? candidate : null
}

/** Back from an invoice detail: the list it was opened from, or the plain Event Invoices list. */
export function useBackToInvoiceList(): () => void {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = readReturnTo(location.state) ?? APP_ROUTES.eventInvoices.list
  return () => navigate(returnTo)
}
