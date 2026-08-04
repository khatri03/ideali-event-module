import { useCallback, useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchEventOrderStatus } from "@/api/eventOrders"

/**
 * How long the page keeps asking before it accepts that this order will not settle while the buyer
 * watches. Bank rails can take days, so past this point the honest answer is "we will email you"
 * rather than a spinner that never resolves.
 */
const POLL_WINDOW_MS = 3 * 60_000

/** Tightest at first, when a card is a second away from settling, then backing off. */
const BACKOFF_STEPS = [
  { withinMs: 15_000, seconds: 3 },
  { withinMs: 45_000, seconds: 5 },
  { withinMs: 90_000, seconds: 10 },
]
const SLOWEST_POLL_SECONDS = 30

function resolvePollIntervalMs(serverPollSeconds: number, elapsedMs: number) {
  const step = BACKOFF_STEPS.find((candidate) => elapsedMs < candidate.withinMs)
  const backoffSeconds = step?.seconds ?? SLOWEST_POLL_SECONDS

  // The server's hint is a floor, not a suggestion - it is the side that knows what the rail costs.
  return Math.max(backoffSeconds, serverPollSeconds) * 1000
}

export function useEventOrderStatus(orderUniqueId: string) {
  const [hasPollWindowElapsed, setHasPollWindowElapsed] = useState(false)
  /** Stamped outside render, on whichever of the poll or the deadline effect runs first. */
  const pollStartedAtRef = useRef(0)

  function markPollStarted() {
    if (pollStartedAtRef.current === 0) {
      pollStartedAtRef.current = Date.now()
    }

    return pollStartedAtRef.current
  }

  const query = useQuery({
    queryKey: ["event-order", orderUniqueId],
    queryFn: () => fetchEventOrderStatus(orderUniqueId),
    enabled: Boolean(orderUniqueId),
    refetchInterval: (activeQuery) => {
      const order = activeQuery.state.data
      if (!order || order.orderState !== "Processing" || hasPollWindowElapsed) return false

      return resolvePollIntervalMs(order.pollAfterSeconds, Date.now() - markPollStarted())
    },
  })

  const { refetch } = query
  const isProcessing = query.data?.orderState === "Processing"

  useEffect(() => {
    if (!isProcessing || hasPollWindowElapsed) return

    const remainingMs = POLL_WINDOW_MS - (Date.now() - markPollStarted())

    if (remainingMs <= 0) {
      setHasPollWindowElapsed(true)
      return
    }

    const timeoutId = window.setTimeout(() => setHasPollWindowElapsed(true), remainingMs)
    return () => window.clearTimeout(timeoutId)
  }, [isProcessing, hasPollWindowElapsed])

  /** The buyer's own "check again", which reopens the poll window rather than firing one lone request. */
  const recheck = useCallback(() => {
    pollStartedAtRef.current = Date.now()
    setHasPollWindowElapsed(false)
    return refetch()
  }, [refetch])

  return {
    order: query.data,
    isLoading: query.isPending,
    isError: query.isError,
    isRechecking: query.isFetching,
    hasPollWindowElapsed,
    recheck,
  }
}
