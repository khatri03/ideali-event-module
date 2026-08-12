import { useCallback, useEffect, useRef, useState } from "react"
import { clearStoredCartId } from "@/features/events/utils/registrationCartCookie"
import { isTabClosed, openPath, reloadTab, requestTabClose } from "@/utils/browserTab"

/** Long enough for the browser to act on `window.close()`, short enough not to read as a hang. */
const CLOSE_GRACE_MS = 400

interface OrderCompletionActions {
  /** True once the browser has refused to close the window, which only manual action can resolve. */
  hasCloseFailed: boolean
  closeWindow: () => void
  newRegistration: () => void
}

/**
 * Drives the two exits from a settled order. Starting again drops the cart cookie first: the cart
 * behind this order is spent, and resuming it would put the buyer back on a checkout they already paid.
 */
export function useOrderCompletionActions(registerPath: string | null): OrderCompletionActions {
  const [hasCloseFailed, setHasCloseFailed] = useState(false)
  const closeCheckRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (closeCheckRef.current !== null) window.clearTimeout(closeCheckRef.current)
    },
    [],
  )

  const newRegistration = useCallback(() => {
    clearStoredCartId()

    if (registerPath) {
      openPath(registerPath)
      return
    }

    // Without a registration link to return to, a reload is still a clean slate for this buyer.
    reloadTab()
  }, [registerPath])

  const closeWindow = useCallback(() => {
    setHasCloseFailed(false)
    requestTabClose()

    closeCheckRef.current = window.setTimeout(() => {
      closeCheckRef.current = null
      if (!isTabClosed()) setHasCloseFailed(true)
    }, CLOSE_GRACE_MS)
  }, [])

  return { hasCloseFailed, closeWindow, newRegistration }
}
