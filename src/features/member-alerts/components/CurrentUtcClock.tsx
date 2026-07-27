import { useEffect, useState } from "react"
import { Text } from "@chakra-ui/react"
import { formatCurrentUtc } from "../constants"

/**
 * Ticks independently of the composer form: isolating the interval here means the schedule picker's
 * containing form doesn't re-render every second just to keep this clock live.
 */
export function CurrentUtcClock() {
  const [nowUtc, setNowUtc] = useState(() => formatCurrentUtc(new Date()))

  useEffect(() => {
    const intervalId = setInterval(() => setNowUtc(formatCurrentUtc(new Date())), 1000)
    return () => clearInterval(intervalId)
  }, [])

  return (
    <Text fontSize="xs" color="text.secondary">
      Current UTC time: {nowUtc}
    </Text>
  )
}
