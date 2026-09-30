import { Button } from "@chakra-ui/react"
import { CheckCircle2, Info, RotateCcw, XCircle } from "lucide-react"
import { OrderStatusHeader, type OrderStatusTone } from "@/features/events/components/order/OrderStatusHeader"

const ICON_SIZE = 24

const TONE_ICONS: Record<OrderStatusTone, React.ReactNode> = {
  success: <CheckCircle2 size={ICON_SIZE} />,
  pending: <Info size={ICON_SIZE} />,
  danger: <XCircle size={ICON_SIZE} />,
}

interface InvoicePayStatusCardProps {
  tone: OrderStatusTone
  title: string
  description: string
  /** Offered only when asking again could change the outcome - a load that failed, not a settled invoice. */
  onRetry?: () => void
  isRetrying?: boolean
}

/** Every pay-page outcome that is not the card form, in the same treatment as the order confirmation page. */
export function InvoicePayStatusCard({ tone, title, description, onRetry, isRetrying = false }: InvoicePayStatusCardProps) {
  return (
    <OrderStatusHeader tone={tone} icon={TONE_ICONS[tone]} title={title} description={description}>
      {onRetry ? (
        <Button
          variant="outline"
          borderColor="gray.300"
          bg="white"
          fontWeight="700"
          minH="11"
          mt={2}
          alignSelf="flex-start"
          w={{ base: "full", sm: "auto" }}
          cursor={isRetrying ? "not-allowed" : "pointer"}
          disabled={isRetrying}
          loading={isRetrying}
          loadingText="Retrying..."
          onClick={onRetry}
        >
          <RotateCcw size={16} />
          Try again
        </Button>
      ) : null}
    </OrderStatusHeader>
  )
}
