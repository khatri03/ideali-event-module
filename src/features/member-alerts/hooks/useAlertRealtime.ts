import { useEffect, useRef } from "react"
import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from "@microsoft/signalr"
import { useQueryClient } from "@tanstack/react-query"
import { claimPendingInstantToasts } from "@/api/alerts"
import { auth } from "@/lib/auth"
import { toaster } from "@/lib/toaster"
import { ALERT_INBOX_QUERY_KEY } from "./useAlerts"

const HUB_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000"
const HUB_URL = `${HUB_BASE}/hubs/alerts`

/** Rapid pushes are collapsed into one toast fired this long after the last arrival. */
const COALESCE_MS = 800

function summaryText(count: number) {
  return count === 1 ? "You have 1 new notification." : `You have ${count} new notifications.`
}

/**
 * Live alert channel plus its safety nets. SignalR is only the fast path: it delivers instantly when the
 * member is connected to the same instance a push originates from. Correctness never depends on it —
 * {@link useUnseenCount} polls the badge and {@link usePendingInstantToasts} claims missed toasts on load,
 * so a member on another instance, or one whose connection dropped, still converges. Here we additionally
 * re-claim on reconnect and coalesce bursts into a single toast. Mounted once, high in the tree.
 */
export function useAlertRealtime() {
  const queryClient = useQueryClient()
  const connectionRef = useRef<HubConnection | null>(null)
  const pendingCountRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      return
    }

    function flushToast() {
      const count = pendingCountRef.current
      pendingCountRef.current = 0
      timerRef.current = null
      if (count > 0) {
        toaster.create({ type: "info", title: "New notifications", description: summaryText(count) })
      }
    }

    function queueToast(added: number) {
      pendingCountRef.current += added
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(flushToast, COALESCE_MS)
    }

    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, { withCredentials: true })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    connectionRef.current = connection

    connection.on("alertReceived", () => {
      queryClient.invalidateQueries({ queryKey: ALERT_INBOX_QUERY_KEY })
      queueToast(1)
    })

    connection.onreconnected(() => {
      // Messages sent while disconnected are not replayed, so treat a reconnect like a fresh load: refresh
      // the badge and claim anything missed. The claim is idempotent, so this can never double-toast.
      queryClient.invalidateQueries({ queryKey: ALERT_INBOX_QUERY_KEY })
      claimPendingInstantToasts()
        .then((count) => {
          if (count > 0) {
            queueToast(count)
          }
        })
        .catch(() => undefined)
    })

    connection.start().catch(() => {
      // A failed hub connection must never break the app; the poll + login claim keep the inbox correct.
    })

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      connection.off("alertReceived")
      if (connection.state !== HubConnectionState.Disconnected) {
        connection.stop().catch(() => undefined)
      }
      connectionRef.current = null
    }
  }, [queryClient])

  return connectionRef
}
