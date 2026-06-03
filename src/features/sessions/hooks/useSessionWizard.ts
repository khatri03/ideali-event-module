import { useMemo } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { APP_ROUTES } from "@/utils/routes"

export interface SessionWizardStep {
  slug: "name" | "description" | "venue" | "booking" | "start-end" | "schedule" | "ticket" | "review"
  label: string
  path: string
}

const SESSION_WIZARD_STEP_DEFINITIONS: Array<Omit<SessionWizardStep, "path">> = [
  { slug: "name", label: "Name" },
  { slug: "description", label: "Description" },
  { slug: "venue", label: "Venue" },
  { slug: "booking", label: "Booking" },
  { slug: "start-end", label: "Start/End" },
  { slug: "schedule", label: "Schedule" },
  { slug: "ticket", label: "Ticket" },
  { slug: "review", label: "Review" },
]

export function buildSessionWizardSteps(sessionId?: string): SessionWizardStep[] {
  if (!sessionId) {
    return []
  }

  const basePath = APP_ROUTES.sessionWizard.edit(sessionId)
  return SESSION_WIZARD_STEP_DEFINITIONS.map((step) => ({
    ...step,
    path: `${basePath}/${step.slug}`,
  }))
}

export function getSessionWizardStepIndex(pathname: string, sessionId?: string) {
  const steps = buildSessionWizardSteps(sessionId)
  return steps.findIndex((step) => pathname === step.path)
}

export function useSessionWizardNavigation() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { sessionId } = useParams<{ sessionId?: string }>()
  const steps = useMemo(() => buildSessionWizardSteps(sessionId), [sessionId])

  const activeStepIndex = useMemo(() => {
    const index = getSessionWizardStepIndex(pathname, sessionId)
    return index >= 0 ? index : 0
  }, [pathname, sessionId])

  const activeStep = steps[activeStepIndex]
  const previousStep = steps[activeStepIndex - 1]
  const nextStep = steps[activeStepIndex + 1]

  return {
    steps,
    activeStep,
    activeStepIndex,
    isFirstStep: activeStepIndex === 0,
    isLastStep: activeStepIndex === steps.length - 1,
    previousStep,
    nextStep,
    goToStep: (step: SessionWizardStep["slug"]) => {
      const target = steps.find((item) => item.slug === step)
      if (target) {
        navigate(target.path)
      }
    },
    goBack: () => {
      if (previousStep) {
        navigate(previousStep.path)
      }
    },
    goNext: () => {
      if (nextStep) {
        navigate(nextStep.path)
      }
    },
  }
}
