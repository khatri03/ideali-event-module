import { CheckCircle2, Clock, XCircle } from "lucide-react"
import { OrderStatusHeader, type OrderStatusTone } from "./OrderStatusHeader"
import type { EventOrderState } from "@/features/events/schemas/eventOrder.schemas"

interface OrderStateHeaderProps {
  orderState: EventOrderState
  hasTickets: boolean
  buyerEmailMasked: string | null
}

const ICON_SIZE = 24

export function OrderStateHeader({ orderState, hasTickets, buyerEmailMasked }: OrderStateHeaderProps) {
  const presentation = resolvePresentation(orderState, hasTickets, buyerEmailMasked)

  return (
    <OrderStatusHeader
      tone={presentation.tone}
      icon={presentation.icon}
      title={presentation.title}
      description={presentation.description}
    />
  )
}

interface OrderStatePresentation {
  tone: OrderStatusTone
  icon: React.ReactNode
  title: string
  description: string
}

function resolvePresentation(
  orderState: EventOrderState,
  hasTickets: boolean,
  buyerEmailMasked: string | null,
): OrderStatePresentation {
  const deliveryNote = buyerEmailMasked ? ` We have emailed them to ${buyerEmailMasked}.` : ""

  if (orderState === "Confirmed") {
    return {
      tone: "success",
      icon: <CheckCircle2 size={ICON_SIZE} />,
      title: "You're going",
      description: hasTickets
        ? `Your registration is confirmed and your tickets are issued.${deliveryNote}`
        : "Your registration is confirmed. This event does not issue tickets, so nothing else is needed from you.",
    }
  }

  if (orderState === "Processing") {
    return {
      tone: "pending",
      icon: <Clock size={ICON_SIZE} />,
      title: "Payment received",
      description:
        "Your bank is still clearing this payment, which can take a few working days. Nothing more is needed from you - we will issue your tickets the moment it settles.",
    }
  }

  return {
    tone: "danger",
    icon: <XCircle size={ICON_SIZE} />,
    title: "This order is not active",
    description:
      "The payment for this order did not complete, or the order was cancelled. You have not been charged for it. Please contact the organizer if you believe this is wrong.",
  }
}
