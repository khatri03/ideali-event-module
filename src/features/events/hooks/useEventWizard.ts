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
    | "terms-conditions"
    | "banner"
    | "theme-color"
    | "payment-account"
    | "venue"
    | "advanced-settings"
    | "time-zone"
    | "sessions"
    | "date-time"
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
  { slug: "terms-conditions", label: "Terms & Conditions" },
  { slug: "banner", label: "Banner" },
  { slug: "theme-color", label: "Theme Color" },
  { slug: "payment-account", label: "Payment Account" },
  { slug: "time-zone", label: "Time Zone" },
  { slug: "venue", label: "Venue" },
  { slug: "sessions", label: "Sessions" },
  { slug: "date-time", label: "Event Date/Time" },
  { slug: "discount-coupon", label: "Discount Coupon" },
  { slug: "questions", label: "Questions" },
  { slug: "thank-you-email", label: "Thank you Email" },
  { slug: "advanced-settings", label: "Advanced Settings" },
  { slug: "review", label: "Review" },
]

export type EventWizardStepSlug = EventWizardStep["slug"]

export function getEventWizardStepNumber(stepSlug: EventWizardStepSlug) {
  switch (stepSlug) {
    case "name":
      return 1
    case "description":
      return 2
    case "terms-conditions":
      return 3
    case "banner":
      return 4
    case "theme-color":
      return 5
    case "payment-account":
      return 6
    case "time-zone":
      return 7
    case "venue":
      return 8
    case "sessions":
      return 9
    case "date-time":
      return 10
    case "discount-coupon":
      return 11
    case "questions":
      return 12
    case "thank-you-email":
      return 13
    case "advanced-settings":
      return 14
    case "review":
      return 15
  }
}

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

export function useEventWizardNavigation(maxUnlockedStepIndex?: number) {
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
      const targetIndex = target ? steps.indexOf(target) : -1
      const maxIndex = maxUnlockedStepIndex ?? activeStepIndex
      if (target && targetIndex >= 0 && targetIndex <= maxIndex) {
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
    termsConditions: values.termsConditions.trim() || null,
    bannerUrl: values.bannerUrl.trim() || null,
    startDate: values.startDate?.trim() || firstSession?.startsAt || new Date().toISOString(),
    endDate: values.endDate?.trim() || lastSession?.endsAt || new Date().toISOString(),
    bookingStartDate: values.bookingStartDate?.trim() || values.startDate?.trim() || new Date().toISOString(),
    bookingEndDate: values.bookingEndDate?.trim() || values.endDate?.trim() || new Date().toISOString(),
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
    timeZone: values.timeZone?.trim() || undefined,
    visibility: values.visibility,
    paymentAccountId: values.paymentAccountId,
    venueUniqueId: values.venueUniqueId?.trim() || undefined,
    purchaseTimeLimitMinutes: values.purchaseTimeLimitMinutes ?? null,
    sessions: values.sessions ?? [],
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
