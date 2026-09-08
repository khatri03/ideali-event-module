import { useEffect, useState } from "react"
import { Box, Text } from "@chakra-ui/react"
import { Clock3 } from "lucide-react"
import { formatPurchaseCountdown, hexToRgba, parseUtcDateTime } from "@/features/events/utils/registrationFormat"
import { serverNow } from "@/lib/serverClock"

interface PurchaseTimerChipProps {
  /**
   * Absolute UTC deadline the seats are held until: the cart's once one is open, and before that the hold token's.
   * Null only when the buyer is holding nothing at all.
   */
  expiresAtUtc: string | null
  accentColor: string
  onExpire: () => void
}

const LOW_TIME_THRESHOLD_MS = 2 * 60 * 1000

/**
 * Counts down to the server-issued deadline the buyer's seats are held until. The client never decides when the
 * window starts - it only renders the time left until `expiresAtUtc`.
 *
 * The countdown is measured against the server's clock rather than the device's. The deadline is the server's
 * reading; comparing it to a device running minutes fast would retire a cart that is still alive, and one running
 * slow would keep counting down over seats already back on sale.
 */
export function PurchaseTimerChip({ expiresAtUtc, accentColor, onExpire }: PurchaseTimerChipProps) {
  const expiresAt = parseUtcDateTime(expiresAtUtc)
  const [now, setNow] = useState(() => serverNow())

  useEffect(() => {
    if (!expiresAtUtc) return

    const timer = window.setInterval(() => setNow(serverNow()), 1000)
    return () => window.clearInterval(timer)
  }, [expiresAtUtc])

  const remainingMs = expiresAt ? expiresAt.getTime() - now : null
  const isExpired = remainingMs !== null && remainingMs <= 0

  useEffect(() => {
    if (isExpired) {
      onExpire()
    }
  }, [isExpired, onExpire])

  if (remainingMs === null) {
    return null
  }

  const isRunningLow = !isExpired && remainingMs <= LOW_TIME_THRESHOLD_MS
  const borderColor = isExpired ? "red.200" : isRunningLow ? "orange.200" : hexToRgba(accentColor, 0.16)
  const background = isExpired ? "red.50" : isRunningLow ? "orange.50" : "white"
  const iconBackground = isExpired ? "red.600" : isRunningLow ? "orange.600" : accentColor
  const textColor = isExpired ? "red.700" : isRunningLow ? "orange.800" : "gray.800"
  const helperText = isExpired
    ? "Purchase time limit reached. Remove selected tickets to start a new purchase flow."
    : isRunningLow
      ? "Time is running out. Your ticket hold is about to be released."
      : "Your tickets are held until this timer runs out."

  return (
    <Box
      as="span"
      title={helperText}
      aria-label={helperText}
      role="status"
      display="inline-flex"
      alignItems="center"
      gap={2.5}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="full"
      bg={background}
      boxShadow="0 12px 28px rgba(15, 23, 42, 0.08)"
      px={3}
      py={2}
      cursor="help"
      maxW="full"
      minH="11"
    >
      <Box w="8" h="8" borderRadius="full" display="grid" placeItems="center" bg={iconBackground} color="white" flexShrink={0}>
        <Clock3 size={16} />
      </Box>
      <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="900" color={textColor} letterSpacing="-0.02em" lineHeight="1">
        {formatPurchaseCountdown(remainingMs)}
      </Text>
    </Box>
  )
}
