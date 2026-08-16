import { useEffect } from "react"

const OPEN_MODAL_SELECTOR = "[role=dialog][data-state=open], [role=alertdialog][data-state=open]"

/** The marker the dialog leaves on everything it hid from assistive technology while it was open. */
const HIDDEN_BY_MODAL_SELECTOR = "[data-aria-hidden]"

/**
 * A modal freezes the page behind it twice over: `pointer-events: none` on <body> so nothing takes a
 * click, and `aria-hidden` on everything outside it so nothing is announced. Both are meant to come off
 * as it closes, and under React's StrictMode double-mount they do not - the dialog goes, the guards stay,
 * and the screen sits there refusing every tap with nothing on it to explain why.
 *
 * Releasing is guarded by the same condition the guards exist for: a modal still open keeps them, so this
 * only unwinds once none is left.
 */
function releasePage() {
  if (document.querySelector(OPEN_MODAL_SELECTOR)) {
    return
  }

  document.body.style.pointerEvents = ""
  document.body.style.overflow = ""
  document.body.style.paddingRight = ""

  document.querySelectorAll(HIDDEN_BY_MODAL_SELECTOR).forEach((element) => {
    element.removeAttribute("aria-hidden")
    element.removeAttribute("data-aria-hidden")
  })
}

export function useModalGuardRelease(isOpen: boolean) {
  useEffect(() => {
    if (isOpen) {
      return
    }

    // After the exit has been committed, so a dialog still animating out is not mistaken for an open one.
    const frame = window.requestAnimationFrame(releasePage)

    return () => window.cancelAnimationFrame(frame)
  }, [isOpen])

  // A dialog torn out of the tree never runs its own close, so the guards would outlive the page they froze.
  useEffect(() => releasePage, [])
}
