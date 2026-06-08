/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react"

type EventWizardAction = () => Promise<void> | void

interface EventWizardActionsContextValue {
  setPrimaryAction: (action: EventWizardAction | null) => void
  setPrimaryActionReady: (ready: boolean) => void
  setPrimaryActionEnabled: (enabled: boolean) => void
  runPrimaryAction: () => Promise<void>
  isPrimaryActionReady: boolean
  canPrimaryActionProceed: boolean
}

const EventWizardActionsContext = createContext<EventWizardActionsContextValue | undefined>(undefined)

export function EventWizardActionsProvider({ children }: { children: ReactNode }) {
  const primaryActionRef = useRef<EventWizardAction | null>(null)
  const [isPrimaryActionReady, setIsPrimaryActionReady] = useState(false)
  const [canPrimaryActionProceed, setCanPrimaryActionProceed] = useState(false)

  const setPrimaryAction = useCallback((action: EventWizardAction | null) => {
    primaryActionRef.current = action
  }, [])

  const setPrimaryActionReady = useCallback((ready: boolean) => {
    setIsPrimaryActionReady(ready)
  }, [])

  const setPrimaryActionEnabled = useCallback((enabled: boolean) => {
    setCanPrimaryActionProceed(enabled)
  }, [])

  const runPrimaryAction = useCallback(async () => {
    if (primaryActionRef.current) {
      await primaryActionRef.current()
    }
  }, [])

  const value = useMemo(
    () => ({
      setPrimaryAction,
      setPrimaryActionReady,
      setPrimaryActionEnabled,
      runPrimaryAction,
      isPrimaryActionReady,
      canPrimaryActionProceed,
    }),
    [canPrimaryActionProceed, isPrimaryActionReady, runPrimaryAction, setPrimaryAction, setPrimaryActionEnabled, setPrimaryActionReady],
  )

  return <EventWizardActionsContext.Provider value={value}>{children}</EventWizardActionsContext.Provider>
}

export function useEventWizardActions() {
  const context = useContext(EventWizardActionsContext)

  if (!context) {
    throw new Error("useEventWizardActions must be used within EventWizardActionsProvider.")
  }

  return context
}
