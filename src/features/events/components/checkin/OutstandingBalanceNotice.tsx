import { Flex, Text } from "@chakra-ui/react"
import { Wallet } from "lucide-react"
import { formatCurrencyCode } from "@/utils/format"

interface OutstandingBalanceNoticeProps {
  amount: string
  currency: string | null
}

/**
 * An organizer may send a ticket against an order that has not been paid - a cheque taken but not
 * banked is the everyday case - and the holder then walks up to a desk that has no way of knowing.
 * This says so without standing in their way: the door has already opened by the time it is read, and
 * turning it into a second gate would put the operator in an argument they cannot settle at the front
 * of a queue.
 */
export function OutstandingBalanceNotice({ amount, currency }: OutstandingBalanceNoticeProps) {
  return (
    <Flex
      align="center"
      gap={2}
      borderWidth="1px"
      borderColor="status.warning"
      borderRadius="12px"
      bg="status.warning.bg"
      color="status.warning.fg"
      px={3}
      py={2}
      role="status"
      aria-live="polite"
    >
      <Wallet size={16} aria-hidden="true" color="currentColor" style={{ flexShrink: 0 }} />
      <Text fontSize="sm" fontWeight="700" lineHeight="1.3">
        Balance due {formatCurrencyCode(amount, currency)} — collect at desk
      </Text>
    </Flex>
  )
}
