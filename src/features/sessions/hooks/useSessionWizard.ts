import { useMemo } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { APP_ROUTES } from "@/utils/routes"

export interface SessionWizardStep {
  slug:
    | "name"
    | "description"
    | "banner"
    | "genre"
    | "event"
    | "venue"
    | "membership-access"
    | "seat-selection"
    | "dates-time"
    | "booking"
    | "start-end"
    | "schedule"
    | "ticket"
    | "e-ticketing"
    | "review"
  label: string
  path: string
}

const SESSION_WIZARD_STEP_DEFINITIONS: Array<Omit<SessionWizardStep, "path">> = [
  { slug: "name", label: "Name" },
  { slug: "description", label: "Description" },
  { slug: "genre", label: "Genre" },
  { slug: "banner", label: "Banner" },
  { slug: "event", label: "Event" },
  { slug: "venue", label: "Venue" },
  { slug: "membership-access", label: "Membership Access" },
  { slug: "seat-selection", label: "Seat Selection" },
  { slug: "dates-time", label: "Dates & Time" },
  { slug: "schedule", label: "Schedule" },
  { slug: "ticket", label: "Tickets" },
  { slug: "e-ticketing", label: "e-Ticketing" },
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
  genre: 3,
  banner: 4,
  event: 5,
  venue: 6,
  "membership-access": 7,
  "seat-selection": 8,
  booking: 9,
  "start-end": 9,
  "dates-time": 9,
  schedule: 10,
  ticket: 11,
  "e-ticketing": 12,
  // 13 was the retired questions step; review keeps its number so saved progress still reads true.
  review: 14,
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
