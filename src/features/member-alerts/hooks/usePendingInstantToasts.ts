import { useEffect, useRef } from "react"
import { claimPendingInstantToasts } from "@/api/alerts"
import { toaster } from "@/lib/toaster"

/**
 * Shows a single catch-up toast for instant alerts that arrived while the user was offline. The server
 * dedupes via InstantDeliveredAtUtc, so the claim is exactly-once across reloads and devices — a member
 * who was online at send time gets the live toast instead and has nothing pending here. Mounted once,
 * high in the tree, alongside {@link useAlertRealtime}. Best-effort: a failure never blocks the app.
 *
 * `enabled` must track auth readiness reactively: the session resolves after mount on a hard refresh, so a
 * one-shot check would run before the user exists and never claim. Gating on the flag runs it once ready.
 */
export function usePendingInstantToasts(enabled: boolean) {
  const claimedRef = useRef(false)

  useEffect(() => {
    if (claimedRef.current || !enabled) {
      return
    }
    claimedRef.current = true

    claimPendingInstantToasts()
      .then((count) => {
        if (count <= 0) {
          return
        }
        toaster.create({
          type: "info",
          title: "New notifications",
          description:
            count === 1 ? "You have 1 new notification." : `You have ${count} new notifications.`,
        })
      })
      .catch(() => {
        // Allow a later mount to retry; the server call is idempotent, so a retry cannot double-toast.
        claimedRef.current = false
      })
  }, [enabled])
}
