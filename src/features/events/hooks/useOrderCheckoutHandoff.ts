import { useEffect, useRef, useState } from "react"
import { useConfirmEventCheckout } from "@/features/events/hooks/useEventCheckout"
import { clearStoredCartId } from "@/features/events/utils/registrationCartCookie"

/**
 * Runs the checkout confirm fast-path once for a buyer who arrived here straight from Stripe's
 * redirect, where the wizard never got the chance to call it.
 *
 * A failure is not reported: confirm holds no truth about the money, the webhook settles the order
 * either way, and the page is already polling for that. All the buyer would get from an error here
 * is alarm about something they cannot act on.
 */
export function useOrderCheckoutHandoff(cartUniqueId: string | null, onCompleted: () => void) {
  const [isHandingOff, setIsHandingOff] = useState(Boolean(cartUniqueId))
  const hasAttemptedRef = useRef(false)
  const { mutate } = useConfirmEventCheckout(cartUniqueId ?? undefined)

  useEffect(() => {
    if (!cartUniqueId || hasAttemptedRef.current) return

    hasAttemptedRef.current = true
    // The money has moved, so this cart must stop being resumable whatever the confirm call reports.
    clearStoredCartId()

    mutate(undefined, {
      onSettled: () => {
        setIsHandingOff(false)
        onCompleted()
      },
    })
  }, [cartUniqueId, mutate, onCompleted])

  return { isHandingOff }
}
