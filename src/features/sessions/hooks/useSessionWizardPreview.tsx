/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

/** What a wizard step asks the preview panel to show. */
export interface SessionWizardPreview {
  /** Seating layout the preview belongs to, named so the panel can say which layout is pictured. */
  name: string
  /** Picture Seats.io renders for the published chart, or null when the chart has never been published. */
  thumbnailUrl: string | null
  /** Public Seats.io page for the chart, or null when there is nothing to open. */
  previewUrl: string | null
}

interface SessionWizardPreviewContextValue {
  preview: SessionWizardPreview | null
  setPreview: (preview: SessionWizardPreview | null) => void
}

const SessionWizardPreviewContext = createContext<SessionWizardPreviewContextValue | undefined>(undefined)

/**
 * Holds what the wizard's preview panel shows. The panel sits in the layout while the step that knows what is worth
 * previewing renders inside the outlet, so the two can only meet through context.
 */
export function SessionWizardPreviewProvider({ children }: { children: ReactNode }) {
  const [preview, setPreviewState] = useState<SessionWizardPreview | null>(null)

  const setPreview = useCallback((next: SessionWizardPreview | null) => {
    setPreviewState((current) => {
      if (current === next) {
        return current
      }

      const isSame =
        current !== null &&
        next !== null &&
        current.name === next.name &&
        current.thumbnailUrl === next.thumbnailUrl &&
        current.previewUrl === next.previewUrl

      return isSame ? current : next
    })
  }, [])

  const value = useMemo(() => ({ preview, setPreview }), [preview, setPreview])

  return <SessionWizardPreviewContext.Provider value={value}>{children}</SessionWizardPreviewContext.Provider>
}

export function useSessionWizardPreview() {
  const context = useContext(SessionWizardPreviewContext)

  if (!context) {
    throw new Error("useSessionWizardPreview must be used within SessionWizardPreviewProvider.")
  }

  return context
}
