import { useEffect, useState } from "react"
import { useConfirmEventCheckout } from "@/features/events/hooks/useEventCheckout"
import { clearStoredCartId } from "@/features/events/utils/registrationCartCookie"

/**
 * Runs the checkout confirm fast-path once for a buyer who arrived here straight from Stripe's
 * redirect, where the wizard never got the chance to call it.
 *
 * A failure is not reported: confirm holds no truth about the money, the webhook settles the order
 * either way, and the page is already polling for that. All the buyer would get from an error here
 * is alarm about something they cannot act on.
 *
 * Settlement is tracked with our own cancellation flag rather than the mutation's per-call callback
 * or observed status - React 18 dev-mode double-invokes this effect, and a mutation observer torn
 * down between the two runs can leave the outer callback permanently unfired, stranding the page on
 * its loading skeleton even though the request itself succeeded.
 */
export function useOrderCheckoutHandoff(cartUniqueId: string | null, onCompleted: () => void) {
  const [isHandingOff, setIsHandingOff] = useState(Boolean(cartUniqueId))
  const { mutateAsync } = useConfirmEventCheckout(cartUniqueId ?? undefined)

  useEffect(() => {
    if (!cartUniqueId) return

    let isCancelled = false
    // The money has moved, so this cart must stop being resumable whatever the confirm call reports.
    clearStoredCartId()

    mutateAsync().catch(() => undefined).finally(() => {
      if (isCancelled) return
      setIsHandingOff(false)
      onCompleted()
    })

    return () => {
      isCancelled = true
    }
  }, [cartUniqueId, mutateAsync, onCompleted])

  return { isHandingOff }
}
