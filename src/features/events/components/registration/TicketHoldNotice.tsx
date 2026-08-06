import { useEffect, useState } from "react"
import { Flex, Stack, Text } from "@chakra-ui/react"
import { Clock } from "lucide-react"

interface TicketHoldNoticeProps {
  /** Epoch milliseconds, not a Date: the parent rebuilds the date on every render, and an object
   *  identity that changes every render would restart the countdown's timer just as often. */
  releasesAtMs: number
  onRelease?: () => void
}

function getSecondsRemaining(releasesAtMs: number) {
  return Math.max(Math.ceil((releasesAtMs - Date.now()) / 1000), 0)
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

/**
 * Shown in place of the quantity stepper when every seat is inside somebody else's checkout. Without
 * it the buyer reads a sold-out ticket type as gone for good and leaves, when the seats are usually
 * minutes away from coming back.
 *
 * The countdown is deliberately approximate: the housekeeping pass that returns the seats runs on its
 * own cycle, so they reappear at or shortly after zero, never before it.
 */
export function TicketHoldNotice({ releasesAtMs, onRelease }: TicketHoldNoticeProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(() => getSecondsRemaining(releasesAtMs))
  const [countingDownTo, setCountingDownTo] = useState(releasesAtMs)

  // Adjusted during render rather than in an effect, so a new release time never renders a frame of
  // the previous ticket type's countdown.
  if (countingDownTo !== releasesAtMs) {
    setCountingDownTo(releasesAtMs)
    setSecondsRemaining(getSecondsRemaining(releasesAtMs))
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsRemaining(getSecondsRemaining(releasesAtMs))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [releasesAtMs])

  useEffect(() => {
    if (secondsRemaining === 0) onRelease?.()
  }, [secondsRemaining, onRelease])

  return (
    <Flex
      role="status"
      aria-live="polite"
      borderWidth="1px"
      borderColor="orange.200"
      borderRadius="16px"
      bg="orange.50"
      px={{ base: 3, md: 4 }}
      py={3}
      gap={3}
      align="center"
      w="full"
    >
      <Flex color="orange.600" flexShrink="0" aria-hidden="true">
        <Clock size={18} strokeWidth={2.25} />
      </Flex>
      <Stack gap={0.5} minW="0">
        <Text fontSize="sm" fontWeight="700" color="orange.900" lineHeight="1.3">
          Currently in someone else's checkout
        </Text>
        <Text fontSize="xs" color="orange.800" lineHeight="1.4">
          {secondsRemaining === 0
            ? "Checking for released seats..."
            : `Seats should free up in about ${formatCountdown(secondsRemaining)}. This page updates on its own.`}
        </Text>
      </Stack>
    </Flex>
  )
}
