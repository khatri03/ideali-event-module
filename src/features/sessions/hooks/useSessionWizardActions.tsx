/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react"

type SessionWizardAction = () => Promise<void> | void

interface SessionWizardActionsContextValue {
  setPrimaryAction: (action: SessionWizardAction | null) => void
  setPrimaryActionReady: (ready: boolean) => void
  runPrimaryAction: () => Promise<void>
  isPrimaryActionReady: boolean
}

const SessionWizardActionsContext = createContext<SessionWizardActionsContextValue | undefined>(undefined)

export function SessionWizardActionsProvider({ children }: { children: ReactNode }) {
  const primaryActionRef = useRef<SessionWizardAction | null>(null)
  const [isPrimaryActionReady, setIsPrimaryActionReady] = useState(true)

  const setPrimaryAction = useCallback((action: SessionWizardAction | null) => {
    primaryActionRef.current = action
  }, [])

  const setPrimaryActionReady = useCallback((ready: boolean) => {
    setIsPrimaryActionReady(ready)
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
      runPrimaryAction,
      isPrimaryActionReady,
    }),
    [isPrimaryActionReady, runPrimaryAction, setPrimaryAction, setPrimaryActionReady],
  )

  return <SessionWizardActionsContext.Provider value={value}>{children}</SessionWizardActionsContext.Provider>
}

export function useSessionWizardActions() {
  const context = useContext(SessionWizardActionsContext)

  if (!context) {
    throw new Error("useSessionWizardActions must be used within SessionWizardActionsProvider.")
  }

  return context
}
