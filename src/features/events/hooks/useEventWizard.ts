import { useMemo } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createEventDraft } from "@/api/events"
import type { AppEvent } from "@/types"
import { APP_ROUTES } from "@/utils/routes"
import type { EventWizardValues } from "../schemas/eventWizard.schemas"

export interface EventWizardStep {
  slug:
    | "name"
    | "description"
    | "theme-color"
    | "payment-account"
    | "advanced-settings"
    | "time-zone"
    | "sessions"
    | "discount-coupon"
    | "questions"
    | "thank-you-email"
    | "review"
  label: string
  path: string
}

const EVENT_WIZARD_STEP_DEFINITIONS: Array<Omit<EventWizardStep, "path">> = [
  { slug: "name", label: "Name" },
  { slug: "description", label: "Description" },
  { slug: "theme-color", label: "Theme Color" },
  { slug: "payment-account", label: "Payment Account" },
  { slug: "time-zone", label: "Time Zone" },
  { slug: "sessions", label: "Sessions" },
  { slug: "discount-coupon", label: "Discount Coupon" },
  { slug: "questions", label: "Questions" },
  { slug: "thank-you-email", label: "Thank you Email" },
  { slug: "advanced-settings", label: "Advanced Settings" },
  { slug: "review", label: "Review" },
]

export type EventWizardStepSlug = EventWizardStep["slug"]

export function buildEventWizardSteps(eventId?: string): EventWizardStep[] {
  if (!eventId) {
    return EVENT_WIZARD_STEP_DEFINITIONS.map((step, index) => ({
      ...step,
      path: index === 0 ? APP_ROUTES.eventWizard.createBase : `${APP_ROUTES.eventWizard.createBase}/${step.slug}`,
    }))
  }

  const basePath = APP_ROUTES.eventWizard.edit(eventId)

  return EVENT_WIZARD_STEP_DEFINITIONS.map((step, index) => ({
    ...step,
    path: index === 0 ? `${basePath}/name` : `${basePath}/${step.slug}`,
  }))
}

export function getEventWizardStepIndex(pathname: string, eventId?: string) {
  const steps = buildEventWizardSteps(eventId)
  return steps.findIndex((step) => pathname === step.path)
}

export function useEventWizardNavigation() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { eventId } = useParams<{ eventId?: string }>()
  const steps = buildEventWizardSteps(eventId)

  const activeStepIndex = useMemo(() => {
    const index = getEventWizardStepIndex(pathname, eventId)
    return index >= 0 ? index : 0
  }, [eventId, pathname])

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
    goToStep: (step: EventWizardStepSlug) => {
      const target = steps.find((item) => item.slug === step)
      if (target && steps.indexOf(target) <= activeStepIndex) {
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

export function buildCreateEventPayload(values: EventWizardValues): Omit<AppEvent, "id"> {
  const firstSession = values.sessions[0]
  const lastSession = values.sessions[values.sessions.length - 1]

  return {
    title: values.name.trim(),
    description: values.description.trim(),
    startDate: firstSession?.startsAt || new Date().toISOString(),
    endDate: lastSession?.endsAt || new Date().toISOString(),
    location: "TBD",
    category: "other",
    status: "draft",
    capacity: 1,
    attendees: 0,
    organizer: "TBD",
    coverColor: values.themeColor,
    price: 0,
    currency: "USD",
    tags: [],
    timeZone: values.timeZone,
    paymentAccountId: values.paymentAccountId,
    purchaseTimeLimitHours: values.purchaseTimeLimitHours ?? null,
    sessions: values.sessions,
  }
}

export function useCreateEventDraft() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { name: string; stepNo?: number }) =>
      createEventDraft({ name: payload.name }, payload.stepNo ?? 1),
    onError: () => {
      // handled by caller
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] })
    },
  })
}
