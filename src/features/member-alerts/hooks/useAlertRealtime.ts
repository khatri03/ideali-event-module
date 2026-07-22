import { useEffect, useRef } from "react"
import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from "@microsoft/signalr"
import { useQueryClient } from "@tanstack/react-query"
import { auth } from "@/lib/auth"
import { toaster } from "@/lib/toaster"
import { ALERT_INBOX_QUERY_KEY } from "./useAlerts"

const HUB_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000"
const HUB_URL = `${HUB_BASE}/hubs/alerts`

interface AlertReceivedPayload {
  title?: string
  Title?: string
}

/**
 * Opens the alert hub for the signed-in user and refreshes the inbox when a push arrives. Auth rides
 * the httpOnly cookie via withCredentials, so there is no token to read or pass. Mounted once, high in
 * the tree; a member offline at send time simply never receives the push and sees the count on next load.
 */
export function useAlertRealtime() {
  const queryClient = useQueryClient()
  const connectionRef = useRef<HubConnection | null>(null)

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      return
    }

    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, { withCredentials: true })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    connectionRef.current = connection

    connection.on("alertReceived", (payload: AlertReceivedPayload) => {
      queryClient.invalidateQueries({ queryKey: ALERT_INBOX_QUERY_KEY })
      const title = payload?.title ?? payload?.Title
      toaster.create({
        type: "info",
        title: "New notification",
        description: title ?? "You have a new notification.",
      })
    })

    connection.start().catch(() => {
      // A failed hub connection must never break the app. The inbox still works by polling on load.
    })

    return () => {
      connection.off("alertReceived")
      if (connection.state !== HubConnectionState.Disconnected) {
        connection.stop().catch(() => undefined)
      }
      connectionRef.current = null
    }
  }, [queryClient])

  return connectionRef
}
