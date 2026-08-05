import { useCallback, useEffect, useRef, useState } from "react"
import { isTabClosed, openPath, reloadTab, requestTabClose } from "@/utils/browserTab"

/** Long enough for the browser to act on `window.close()`, short enough not to read as a hang. */
const CLOSE_GRACE_MS = 400

interface OrderCompletionPrompt {
  isPromptOpen: boolean
  /** True once the browser has refused to close the tab, which only manual action can resolve. */
  hasCloseFailed: boolean
  buyAgain: () => void
  closeTab: () => void
  dismiss: () => void
}

/**
 * Asks a buyer whose registration just settled what they want next. Every exit leaves a clean screen:
 * buying again starts a fresh registration, and dismissing the prompt reloads rather than leaving a
 * spent cart and a paid order sharing one page.
 */
export function useOrderCompletionPrompt(isOrderConfirmed: boolean, registerPath: string | null): OrderCompletionPrompt {
  const [isPromptOpen, setIsPromptOpen] = useState(false)
  const [hasCloseFailed, setHasCloseFailed] = useState(false)
  const hasPromptedRef = useRef(false)
  const closeCheckRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isOrderConfirmed || hasPromptedRef.current) return

    hasPromptedRef.current = true
    setIsPromptOpen(true)
  }, [isOrderConfirmed])

  useEffect(
    () => () => {
      if (closeCheckRef.current !== null) window.clearTimeout(closeCheckRef.current)
    },
    [],
  )

  const buyAgain = useCallback(() => {
    if (registerPath) {
      openPath(registerPath)
      return
    }

    // Without a registration link to return to, a reload is still a clean slate for this buyer.
    reloadTab()
  }, [registerPath])

  const closeTab = useCallback(() => {
    setHasCloseFailed(false)
    requestTabClose()

    closeCheckRef.current = window.setTimeout(() => {
      closeCheckRef.current = null
      if (!isTabClosed()) setHasCloseFailed(true)
    }, CLOSE_GRACE_MS)
  }, [])

  const dismiss = useCallback(() => {
    setIsPromptOpen(false)
    reloadTab()
  }, [])

  return { isPromptOpen, hasCloseFailed, buyAgain, closeTab, dismiss }
}
