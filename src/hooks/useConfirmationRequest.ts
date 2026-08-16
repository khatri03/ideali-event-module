import { useCallback, useState } from "react"

interface ConfirmationRequest<TRequest> {
  /** The last request made. Kept after closing so the dialog can stay mounted through its exit. */
  request: TRequest | null
  isOpen: boolean
  open: (request: TRequest) => void
  close: () => void
  confirm: (act: (request: TRequest) => void) => void
}

/**
 * Holds the pending request behind a confirmation dialog.
 *
 * A dialog locks scrolling and puts a pointer-events guard on <body> while it is open, and releases both
 * as part of its own close transition. Dropping the state that renders it - the usual `{pending ? <Dialog/>
 * : null}` - tears the dialog out before that transition runs, so the guard is never lifted and the whole
 * page stops responding to clicks. Keeping the request after close means the dialog stays mounted and only
 * its `open` flag flips, which is the sequence the dialog is built to clean up after.
 */
export function useConfirmationRequest<TRequest>(): ConfirmationRequest<TRequest> {
  const [request, setRequest] = useState<TRequest | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback((next: TRequest) => {
    setRequest(next)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => setIsOpen(false), [])

  const confirm = useCallback(
    (act: (request: TRequest) => void) => {
      if (request === null) {
        return
      }

      act(request)
      setIsOpen(false)
    },
    [request],
  )

  return { request, isOpen, open, close, confirm }
}
