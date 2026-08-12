import { useLocation } from "react-router-dom"

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
