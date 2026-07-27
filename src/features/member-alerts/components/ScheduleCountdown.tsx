import { useEffect, useState } from "react"
import { Box, Text } from "@chakra-ui/react"
import { formatCountdown, formatDateTime } from "../constants"

interface ScheduleCountdownProps {
  /** Any Date-parseable string - a local datetime-local value or a UTC ISO string both work. */
  targetDateTime: string
}

/**
 * Ticks independently of its parent, same reasoning as CurrentUtcClock: an isolated interval here keeps
 * the composer form (or the detail view) from re-rendering just to keep the countdown live.
 */
export function ScheduleCountdown({ targetDateTime }: ScheduleCountdownProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(intervalId)
  }, [])

  const target = new Date(targetDateTime)
  if (!targetDateTime || Number.isNaN(target.getTime())) {
    return null
  }

  return (
    <Box>
      <Text fontSize="sm" fontWeight="700">{formatCountdown(target, now)}</Text>
      <Text fontSize="xs" color="text.secondary">{formatDateTime(targetDateTime)}</Text>
    </Box>
  )
}
