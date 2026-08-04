import { SearchX } from "lucide-react"
import { OrderStatusHeader } from "./OrderStatusHeader"

/**
 * Deliberately says nothing about why. The id is the only credential this page has, so a wrong one
 * must not be able to tell the difference between "never existed" and "exists but not yours".
 */
export function OrderNotFoundCard() {
  return (
    <OrderStatusHeader
      tone="danger"
      icon={<SearchX size={24} />}
      title="We can't find that order"
      description="This confirmation link is not valid. Check that you opened the full link from your email, or contact the organizer with the reference from your receipt."
    />
  )
}
