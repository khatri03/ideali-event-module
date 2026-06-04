import { useMemo } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { APP_ROUTES } from "@/utils/routes"

export interface SessionWizardStep {
  slug: "name" | "description" | "event" | "venue" | "booking" | "start-end" | "schedule" | "ticket" | "review"
  label: string
  path: string
}

const SESSION_WIZARD_STEP_DEFINITIONS: Array<Omit<SessionWizardStep, "path">> = [
  { slug: "name", label: "Name" },
  { slug: "description", label: "Description" },
  { slug: "event", label: "Event" },
  { slug: "venue", label: "Venue" },
  { slug: "booking", label: "Booking Window" },
  { slug: "start-end", label: "Session Date/Time" },
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

const SESSION_WIZARD_STEP_NUMBER: Record<SessionWizardStep["slug"], number> = {
  name: 1,
  description: 2,
  event: 3,
  venue: 4,
  booking: 5,
  "start-end": 6,
  schedule: 7,
  ticket: 8,
  review: 9,
}

export function getSessionWizardStepNumber(step: SessionWizardStep["slug"]) {
  return SESSION_WIZARD_STEP_NUMBER[step]
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
