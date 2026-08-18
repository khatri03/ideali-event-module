import { Badge } from "@chakra-ui/react"
import { formatCurrencyCode } from "@/utils/format"

interface OutstandingBalanceBadgeProps {
  amount: string
  currency: string | null
}

/**
 * The roster's version of the notice the scan result shows. It is a badge rather than a banner because
 * it sits on a row among many and has to be picked out at a glance while the operator scrolls a queue -
 * the point is that an unpaid guest is spotted before the check-in button is pressed, not after.
 */
export function OutstandingBalanceBadge({ amount, currency }: OutstandingBalanceBadgeProps) {
  return (
    <Badge
      mt={1}
      px={2}
      py={0.5}
      borderRadius="999px"
      fontSize="2xs"
      fontWeight="700"
      bg="status.warning.bg"
      color="status.warning.fg"
    >
      Due {formatCurrencyCode(amount, currency)}
    </Badge>
  )
}
