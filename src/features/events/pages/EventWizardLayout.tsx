import { zodResolver } from "@hookform/resolvers/zod"
import { Box, Button, Field, Flex, Grid, Heading, Skeleton, SkeletonText, Stack, Text, useBreakpointValue } from "@chakra-ui/react"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { Navigate, Outlet, useLocation, useNavigate, useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { ArrowLeft, ChevronLeft, ChevronRight, Sparkles } from "lucide-react"
import {
  skipEventWizardStep,
  updateEventWizardDateTime,
  updateEventWizardAdvancedSettings,
  updateEventWizardDescription,
  updateEventWizardName,
  updateEventWizardPaymentAccount,
  updateEventWizardTimeZone,
  updateEventWizardTermsConditions,
  updateEventWizardVenue,
  updateEventWizardThemeColor,
} from "@/api/events"
import { useAuthSession } from "@/hooks/useAuthSession"
import { auth, sessionDataToUser } from "@/lib/auth"
import { queryClient } from "@/lib/queryClient"
import { APP_ROUTES } from "@/utils/routes"
import { useEventWizardProgress } from "../hooks/useEventWizardProgress"
import { useEventWizardDraft } from "../hooks/useEventWizardDraft"
import { useEventWizardResumeValues } from "../hooks/useEventWizardResumeValues"
import { useEventReviewSummary } from "../hooks/useEventReviewSummary"
import { buildEventWizardSteps, getEventWizardStepNumber, useCreateEventDraft, useEventWizardNavigation, type EventWizardStep } from "../hooks/useEventWizard"
import { defaultEventWizardValues, eventWizardFieldGroups, eventWizardSchema, type EventWizardValues } from "../schemas/eventWizard.schemas"
import { EventWizardStepper } from "../components/EventWizardStepper"
import { EventWizardStepSkeleton } from "../components/EventWizardStepSkeleton"
import { EventWizardActions } from "../components/EventWizardActions"
import { EventWizardActionsProvider, useEventWizardActions } from "../hooks/useEventWizardActions"

function WizardLoadingState() {
  return (
    <Flex
      minH="100dvh"
      align="center"
      justify="center"
      px={6}
      bg="linear-gradient(180deg, #F7F9FC 0%, #EEF2FF 45%, #F8FAFC 100%)"
    >
      <Box
        w="full"
        maxW="960px"
        bg="white"
        borderRadius="28px"
        border="1px solid"
        borderColor="gray.200"
        boxShadow="0 24px 60px rgba(15, 23, 42, 0.12)"
        p={{ base: 6, md: 8 }}
      >
        <Skeleton height="18px" width="180px" mb={3} />
        <Skeleton height="34px" width="320px" mb={4} />
        <SkeletonText noOfLines={2} mb={8} />
        <Grid templateColumns={{ base: "1fr", lg: "280px 1fr" }} gap={8}>
          <Box>
            <Skeleton height="24px" width="160px" mb={4} />
            <SkeletonText noOfLines={7} />
          </Box>
          <Box>
            <Skeleton height="26px" width="220px" mb={4} />
            <Skeleton height="180px" borderRadius="20px" mb={4} />
            <Flex gap={3}>
              <Skeleton height="44px" flex={1} borderRadius="14px" />
              <Skeleton height="44px" flex={1} borderRadius="14px" />
            </Flex>
          </Box>
        </Grid>
      </Box>
    </Flex>
  )
}

function normalizeSetupState(value: string) {
  return value.replace(/\s+/g, "").toLowerCase()
}

function PreviewFrame() {
  return (
    <Box
      w="full"
      minH={{ base: "240px", md: "320px" }}
      borderRadius="24px"
      border="1px dashed"
      borderColor="gray.200"
      bg="gray.50"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={6}
      py={8}
    >
      <Stack gap={2} align="center" textAlign="center" maxW="280px">
        <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
          Preview
        </Text>
        <Text fontSize={{ base: "sm", md: "md" }} fontWeight="700" color="gray.700">
          Preview container only
        </Text>
        <Text fontSize="sm" color="gray.500">
          Device mockups are hidden for now.
        </Text>
      </Stack>
    </Box>
  )
}

function WizardStepsRail({
  activeStepIndex,
  completedStepCount,
  isCollapsed,
  maxUnlockedStepIndex,
  onToggle,
  onStepClick,
  steps,
}: {
  activeStepIndex: number
  completedStepCount: number
  isCollapsed: boolean
  maxUnlockedStepIndex: number
  onToggle: () => void
  onStepClick: (step: EventWizardStep["slug"]) => void
  steps: ReturnType<typeof useEventWizardNavigation>["steps"]
}) {
  return (
    <Box
      bg="white"
      borderRadius="24px"
      border="1px solid"
      borderColor="gray.200"
      boxShadow="0 16px 40px rgba(15, 23, 42, 0.06)"
      p={{ base: 3, md: 4 }}
      pt={{ base: 6, md: 6 }}
      pr={{ base: 3, md: 4 }}
      position="relative"
      overflow="visible"
      minW={0}
    >
      <Box
        position="absolute"
        inset={0}
        bg="radial-gradient(circle at top left, rgba(117,81,255,0.08), transparent 38%)"
        pointerEvents="none"
      />
      <Button
        type="button"
        aria-label={isCollapsed ? "Show steps" : "Hide steps"}
        variant="solid"
        borderRadius="full"
        h={{ base: "34px", md: "38px" }}
        w={{ base: "34px", md: "38px" }}
        minW={{ base: "34px", md: "38px" }}
        p={0}
        flexShrink={0}
        onClick={onToggle}
        position="absolute"
        top={{ base: 12, md: 14 }}
        right={{ base: -18, md: -18 }}
        zIndex={2}
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        boxShadow="0 10px 22px rgba(15, 23, 42, 0.14)"
        bg="white"
        color="gray.700"
        border="1px solid"
        borderColor="gray.200"
        _hover={{ bg: "gray.50", borderColor: "gray.300" }}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={16} />}
      </Button>

      <Box position="relative" minH={isCollapsed ? "48px" : "auto"}>
        {!isCollapsed ? (
          <Flex align="center" justify="space-between" gap={3} mb={2}>
            <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.1em">
              Steps
            </Text>
            <Box />
          </Flex>
        ) : null}

        {!isCollapsed ? (
          <EventWizardStepper
            steps={steps}
            activeStepIndex={activeStepIndex}
            completedStepCount={completedStepCount}
            maxUnlockedStepIndex={maxUnlockedStepIndex}
            onStepClick={onStepClick}
          />
        ) : null}
      </Box>
    </Box>
  )
}

export function EventWizardLayout() {
  return (
    <EventWizardActionsProvider>
      <EventWizardLayoutContent />
    </EventWizardActionsProvider>
  )
}

function EventWizardLayoutContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { eventId } = useParams<{ eventId?: string }>()
  const returnUrl = new URLSearchParams(location.search).get("returnUrl") ?? undefined
  const sessionQuery = useAuthSession()
  const currentUser = auth.getUser() ?? (sessionQuery.data ? sessionDataToUser(sessionQuery.data) : null)
  const wizardProgressQuery = useEventWizardProgress(eventId)
  const lastCompletedStepNo = eventId ? wizardProgressQuery.data?.stepNo ?? 0 : 0
  const wizardSteps = buildEventWizardSteps(eventId)
  function mapProgressToVisibleStepIndex(stepNo: number) {
    if (stepNo <= 0) {
      return 0
    }

    return Math.min(stepNo, wizardSteps.length - 1)
  }

  const resolvedStepIndex = eventId ? mapProgressToVisibleStepIndex(lastCompletedStepNo) : -1
  const maxUnlockedStepIndex = eventId ? Math.max(resolvedStepIndex, 0) : 0
  const { activeStepIndex, activeStep, goToStep, goBack, goNext, isFirstStep, isLastStep } = useEventWizardNavigation(maxUnlockedStepIndex)
  const isReviewStep = activeStep.slug === "review"
  const reviewSummaryQuery = useEventReviewSummary(eventId)
  const reviewSummary = reviewSummaryQuery.data
  const setupStateOptions = reviewSummary?.setupStateOptions ?? []
  const finalSetupState = setupStateOptions.find((option) => option.isFinal)?.value ?? ""
  const currentSetupState = reviewSummary?.setupState ?? ""
  const isReviewComplete =
    Boolean(eventId) && normalizeSetupState(currentSetupState) === normalizeSetupState(finalSetupState || "ReadyForSale")
  const hasReachedReviewStep = lastCompletedStepNo >= Math.max(wizardSteps.length - 1, 0)
  const completedStepCount = eventId
    ? hasReachedReviewStep
      ? isReviewComplete
        ? wizardSteps.length
        : Math.max(wizardSteps.length - 1, 0)
      : Math.max(lastCompletedStepNo, 0)
    : 0
  const wizardDraftQuery = useEventWizardDraft(eventId, activeStep.slug)
  const resumeValuesQuery = useEventWizardResumeValues(eventId, lastCompletedStepNo)
  const { runPrimaryAction, runSkipAction, isPrimaryActionReady } = useEventWizardActions()
  const isMobile = useBreakpointValue({ base: true, lg: false }) ?? true
  const [isStepsCollapsedOverride, setIsStepsCollapsedOverride] = useState<boolean | null>(null)
  const isStepsCollapsed = isStepsCollapsedOverride ?? isMobile
  const createEventDraftMutation = useCreateEventDraft()
  function setWizardStepCache(
    step:
      | "name"
      | "description"
      | "terms-conditions"
      | "banner"
      | "time-zone"
      | "theme-color"
      | "venue"
      | "date-time"
      | "advanced-settings"
      | "thank-you-email",
    value: unknown,
  ) {
    if (!eventId) {
      return
    }

    queryClient.setQueryData(["events", "wizard-draft", eventId, step], value)
  }

  function setPaymentAccountStepCache(value: unknown) {
    if (!eventId) {
      return
    }

    queryClient.setQueryData(["events", "wizard-draft", eventId, "payment-account"], value)
  }

  function setWizardProgressCache(stepNo: number) {
    if (!eventId) {
      return
    }

    queryClient.setQueryData(["events", "wizard-progress", eventId], (current: { stepNo?: number } | undefined) => ({
      stepNo: Math.max(current?.stepNo ?? 0, stepNo),
    }))
  }

  const form = useForm<EventWizardValues>({
    defaultValues: {
      ...defaultEventWizardValues,
      paymentAccountId: "",
    },
    resolver: zodResolver(eventWizardSchema),
    mode: "onSubmit",
  })
  const paymentAccountId = useWatch({ control: form.control, name: "paymentAccountId" })
  const paymentMethods = useWatch({ control: form.control, name: "paymentMethods" })
  const venueUniqueId = useWatch({ control: form.control, name: "venueUniqueId" }) ?? ""
  const isOptionalStep =
    activeStep.slug === "description" ||
    activeStep.slug === "terms-conditions" ||
    activeStep.slug === "time-zone" ||
    activeStep.slug === "venue" ||
    activeStep.slug === "sessions" ||
    activeStep.slug === "discount-coupon" ||
    activeStep.slug === "questions"
  const isPaymentAccountStep = activeStep.slug === "payment-account"
  const isBannerStep = activeStep.slug === "banner"
  const isDateTimeStep = activeStep.slug === "date-time"
  const isDiscountCouponStep = activeStep.slug === "discount-coupon"
  const isPageManagedSaveStep =
    isBannerStep ||
    isDateTimeStep ||
    isDiscountCouponStep ||
    activeStep.slug === "questions" ||
    activeStep.slug === "thank-you-email"
  const isLastWizardStep = isLastStep
  const resolvedStepPath = eventId ? wizardSteps[resolvedStepIndex]?.path : undefined
  const currentStepIndex = eventId ? wizardSteps.findIndex((step) => step.path === location.pathname) : -1
  const shouldRedirectToResolvedStep =
    Boolean(eventId) &&
    wizardProgressQuery.isSuccess &&
    (currentStepIndex === -1 || currentStepIndex > resolvedStepIndex)

  useEffect(() => {
    const draftData = wizardDraftQuery.data
    if (draftData) {
      if ("name" in draftData) {
        form.setValue("name", draftData.name, { shouldDirty: false, shouldTouch: false, shouldValidate: false })
      } else if ("description" in draftData) {
        form.setValue("description", draftData.description ?? "", { shouldDirty: false, shouldTouch: false, shouldValidate: false })
      } else if ("termsConditions" in draftData) {
        form.setValue("termsConditions", draftData.termsConditions ?? "", {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        })
      } else if ("bannerUrl" in draftData) {
        form.setValue("bannerUrl", draftData.bannerUrl ?? "", {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        })
      } else if ("timeZoneId" in draftData) {
        form.setValue("timeZoneId", draftData.timeZoneId ?? undefined, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        })
      } else if ("themeColor" in draftData) {
        form.setValue("themeColor", draftData.themeColor ?? "", { shouldDirty: false, shouldTouch: false, shouldValidate: false })
      } else if ("paymentAccountUniqueId" in draftData) {
        form.setValue("paymentAccountId", draftData.paymentAccountUniqueId ?? "", {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        })
        form.setValue("paymentMethods", draftData.paymentMethods ?? [], {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        })
      } else if ("venueUniqueId" in draftData) {
        form.setValue("venueUniqueId", draftData.venueUniqueId ?? "", {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        })
      } else if ("startDate" in draftData || "endDate" in draftData || "bookingStartDate" in draftData || "bookingEndDate" in draftData) {
        form.setValue("startDate", draftData.startDate ?? "", {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        })
        form.setValue("endDate", draftData.endDate ?? "", {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        })
        form.setValue("bookingStartDate", draftData.bookingStartDate ?? "", {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        })
        form.setValue("bookingEndDate", draftData.bookingEndDate ?? "", {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        })
      } else if ("purchaseTimeLimit" in draftData || "visibility" in draftData || "chargeRuleUniqueIds" in draftData) {
        form.setValue("purchaseTimeLimitMinutes", draftData.purchaseTimeLimit ?? undefined, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        })
        form.setValue("visibility", draftData.visibility ?? "Public", {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        })
        form.setValue("chargeRuleUniqueIds", draftData.chargeRuleUniqueIds ?? [], {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        })
        form.setValue("applyPaymentMethodCharges", draftData.applyPaymentMethodCharges ?? false, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        })
        form.setValue("blockEntryUntilPaid", draftData.blockEntryUntilPaid ?? false, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        })
      }
    }
  }, [form, wizardDraftQuery.data])

  useEffect(() => {
    const resumeValues = resumeValuesQuery.data
    if (!resumeValues) {
      return
    }

    if (resumeValues.startDate !== undefined) {
      form.setValue("startDate", resumeValues.startDate ?? "", { shouldDirty: false, shouldTouch: false, shouldValidate: false })
    }

    if (resumeValues.endDate !== undefined) {
      form.setValue("endDate", resumeValues.endDate ?? "", { shouldDirty: false, shouldTouch: false, shouldValidate: false })
    }

    if (resumeValues.bookingStartDate !== undefined) {
      form.setValue("bookingStartDate", resumeValues.bookingStartDate ?? "", {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      })
    }

    if (resumeValues.bookingEndDate !== undefined) {
      form.setValue("bookingEndDate", resumeValues.bookingEndDate ?? "", {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      })
    }
  }, [form, resumeValuesQuery.data])

  useEffect(() => {
    if (shouldRedirectToResolvedStep && resolvedStepPath) {
      navigate(resolvedStepPath, { replace: true })
    }
  }, [navigate, resolvedStepPath, shouldRedirectToResolvedStep])

  async function persistSkippedStep(stepSlug: EventWizardStep["slug"]) {
    if (!eventId) {
      return
    }

    const stepNo = getEventWizardStepNumber(stepSlug)
    const result = await skipEventWizardStep(eventId, stepNo)
    setWizardProgressCache(result.stepNo)
  }

  function getStepValidationFields() {
    switch (activeStep.slug) {
      case "name":
        return eventWizardFieldGroups.name
      case "description":
        return eventWizardFieldGroups.description
      case "terms-conditions":
        return eventWizardFieldGroups.termsConditions
      case "banner":
        return []
      case "time-zone":
        return []
      case "theme-color":
        return eventWizardFieldGroups.theme
      case "payment-account":
        return eventWizardFieldGroups.paymentAccount
      case "venue":
        return eventWizardFieldGroups.venue
      case "sessions":
        return []
      case "date-time":
        return []
      case "discount-coupon":
      case "questions":
      case "thank-you-email":
        return []
      case "advanced-settings":
        return eventWizardFieldGroups.advancedSettings
      case "review":
        return []
    }
  }

  async function handleSaveContinue() {
    const name = form.getValues("name").trim()
    const description = form.getValues("description").trim()
    const termsConditions = form.getValues("termsConditions").trim()
    const themeColor = form.getValues("themeColor").trim()
    const timeZoneId = form.getValues("timeZoneId") ?? null
    const startDate = form.getValues("startDate")?.trim() || null
    const endDate = form.getValues("endDate")?.trim() || null
    const bookingStartDate = form.getValues("bookingStartDate")?.trim() || null
    const bookingEndDate = form.getValues("bookingEndDate")?.trim() || null
    const purchaseTimeLimitMinutes = form.getValues("purchaseTimeLimitMinutes") ?? null

    if (activeStep.slug === "name") {
      const isNameValid = await form.trigger(eventWizardFieldGroups.name)
      if (!isNameValid) {
        return
      }
    }

    if (!eventId && activeStep.slug === "name") {
      const result = await createEventDraftMutation.mutateAsync({ name, stepNo: 1 })
      navigate(APP_ROUTES.eventWizard.editStep(result.uniqueId, "description"), { replace: true })
      return
    }

    if (isReviewStep) {
      try {
        await runPrimaryAction()
      } catch {
        return
      }

      navigate(APP_ROUTES.events, { replace: true })
      return
    }

    if (isPageManagedSaveStep) {
      try {
        await runPrimaryAction()
      } catch {
        return
      }

      if (returnUrl) {
        navigate(returnUrl, { replace: true })
        return
      }

      goNext()
      return
    }

    const isValid = await form.trigger(getStepValidationFields())
    if (isValid) {
      if (eventId) {
        if (activeStep.slug === "name") {
          const result = await updateEventWizardName(eventId, { name }, 1)
          setWizardStepCache("name", result)
          setWizardProgressCache(1)
        } else if (activeStep.slug === "description") {
          const result = await updateEventWizardDescription(eventId, { description }, 2)
          setWizardStepCache("description", result)
          setWizardProgressCache(2)
        } else if (activeStep.slug === "terms-conditions") {
          const result = await updateEventWizardTermsConditions(eventId, { termsConditions }, 3)
          setWizardStepCache("terms-conditions", result)
          setWizardProgressCache(3)
        } else if (activeStep.slug === "theme-color") {
          const result = await updateEventWizardThemeColor(eventId, { themeColor }, 5)
          setWizardStepCache("theme-color", result)
          setWizardProgressCache(5)
        } else if (activeStep.slug === "time-zone") {
          if (timeZoneId) {
            const result = await updateEventWizardTimeZone(eventId, { timeZoneId }, 7)
            setWizardStepCache("time-zone", result)
            setWizardProgressCache(7)
          } else {
            await persistSkippedStep(activeStep.slug)
          }
        } else if (activeStep.slug === "date-time") {
          const result = await updateEventWizardDateTime(eventId, { startDate, endDate, bookingStartDate, bookingEndDate }, 10)
          setWizardStepCache("date-time", result)
          setWizardProgressCache(10)
        } else if (activeStep.slug === "payment-account") {
          const result = await updateEventWizardPaymentAccount(
            eventId,
            {
              paymentAccountUniqueId: paymentAccountId,
              paymentMethods: paymentMethods ?? [],
            },
            6,
          )
          setPaymentAccountStepCache(result)
          setWizardProgressCache(6)
        } else if (activeStep.slug === "venue") {
          if (venueUniqueId.trim()) {
            const result = await updateEventWizardVenue(eventId, { venueUniqueId }, 8)
            setWizardStepCache("venue", result)
            setWizardProgressCache(8)
          } else {
            await persistSkippedStep(activeStep.slug)
          }
        } else if (activeStep.slug === "advanced-settings") {
          const result = await updateEventWizardAdvancedSettings(
            eventId,
            {
              purchaseTimeLimit: purchaseTimeLimitMinutes,
              visibility: form.getValues("visibility"),
              chargeRuleUniqueIds: form.getValues("chargeRuleUniqueIds") ?? [],
              applyPaymentMethodCharges: form.getValues("applyPaymentMethodCharges"),
              blockEntryUntilPaid: form.getValues("blockEntryUntilPaid"),
            },
            14,
          )
          setWizardStepCache("advanced-settings", result)
          setWizardProgressCache(14)
        } else if (activeStep.slug === "sessions") {
          await persistSkippedStep(activeStep.slug)
        } else if (
          activeStep.slug === "discount-coupon" ||
          activeStep.slug === "questions"
        ) {
          await persistSkippedStep(activeStep.slug)
        }
      }

      if (returnUrl) {
        navigate(returnUrl, { replace: true })
        return
      }

      goNext()
    }
  }

  async function handleSaveExit() {
    const name = form.getValues("name").trim()
    const description = form.getValues("description").trim()
    const termsConditions = form.getValues("termsConditions").trim()
    const themeColor = form.getValues("themeColor").trim()
    const timeZoneId = form.getValues("timeZoneId") ?? null
    const startDate = form.getValues("startDate")?.trim() || null
    const endDate = form.getValues("endDate")?.trim() || null
    const bookingStartDate = form.getValues("bookingStartDate")?.trim() || null
    const bookingEndDate = form.getValues("bookingEndDate")?.trim() || null
    const purchaseTimeLimitMinutes = form.getValues("purchaseTimeLimitMinutes") ?? null

    if (activeStep.slug === "name") {
      const isNameValid = await form.trigger(eventWizardFieldGroups.name)
      if (!isNameValid) {
        return
      }
    }

    if (!eventId && activeStep.slug === "name") {
      await createEventDraftMutation.mutateAsync({ name, stepNo: 1 })
      navigate(APP_ROUTES.events, { replace: true })
      return
    }

    if (isReviewStep) {
      try {
        await runPrimaryAction()
      } catch {
        return
      }

      return
    }

    if (isPageManagedSaveStep) {
      try {
        await runPrimaryAction()
      } catch {
        return
      }

      if (returnUrl) {
        navigate(returnUrl, { replace: true })
        return
      }

      navigate(APP_ROUTES.events)
      return
    }

    const isValid = await form.trigger(getStepValidationFields())
    if (isValid) {
      if (eventId) {
        if (activeStep.slug === "name") {
          const result = await updateEventWizardName(eventId, { name }, 1)
          setWizardStepCache("name", result)
          setWizardProgressCache(1)
        } else if (activeStep.slug === "description") {
          const result = await updateEventWizardDescription(eventId, { description }, 2)
          setWizardStepCache("description", result)
          setWizardProgressCache(2)
        } else if (activeStep.slug === "terms-conditions") {
          const result = await updateEventWizardTermsConditions(eventId, { termsConditions }, 3)
          setWizardStepCache("terms-conditions", result)
          setWizardProgressCache(3)
        } else if (activeStep.slug === "theme-color") {
          const result = await updateEventWizardThemeColor(eventId, { themeColor }, 5)
          setWizardStepCache("theme-color", result)
          setWizardProgressCache(5)
        } else if (activeStep.slug === "time-zone") {
          if (timeZoneId) {
            const result = await updateEventWizardTimeZone(eventId, { timeZoneId }, 7)
            setWizardStepCache("time-zone", result)
            setWizardProgressCache(7)
          } else {
            await persistSkippedStep(activeStep.slug)
          }
        } else if (activeStep.slug === "date-time") {
          const result = await updateEventWizardDateTime(eventId, { startDate, endDate, bookingStartDate, bookingEndDate }, 10)
          setWizardStepCache("date-time", result)
          setWizardProgressCache(10)
        } else if (activeStep.slug === "payment-account") {
          const result = await updateEventWizardPaymentAccount(
            eventId,
            {
              paymentAccountUniqueId: paymentAccountId,
              paymentMethods: paymentMethods ?? [],
            },
            6,
          )
          setPaymentAccountStepCache(result)
          setWizardProgressCache(6)
        } else if (activeStep.slug === "venue") {
          if (venueUniqueId.trim()) {
            const result = await updateEventWizardVenue(eventId, { venueUniqueId }, 8)
            setWizardStepCache("venue", result)
            setWizardProgressCache(8)
          } else {
            await persistSkippedStep(activeStep.slug)
          }
        } else if (activeStep.slug === "advanced-settings") {
          const result = await updateEventWizardAdvancedSettings(
            eventId,
            {
              purchaseTimeLimit: purchaseTimeLimitMinutes,
              visibility: form.getValues("visibility"),
              chargeRuleUniqueIds: form.getValues("chargeRuleUniqueIds") ?? [],
              applyPaymentMethodCharges: form.getValues("applyPaymentMethodCharges"),
              blockEntryUntilPaid: form.getValues("blockEntryUntilPaid"),
            },
            14,
          )
          setWizardStepCache("advanced-settings", result)
          setWizardProgressCache(14)
        } else if (activeStep.slug === "sessions") {
          await persistSkippedStep(activeStep.slug)
        } else if (
          activeStep.slug === "discount-coupon" ||
          activeStep.slug === "questions"
        ) {
          await persistSkippedStep(activeStep.slug)
        }
      }

      if (returnUrl) {
        navigate(returnUrl, { replace: true })
        return
      }

      navigate(APP_ROUTES.events)
    }
  }

  async function handleSkip() {
    if (activeStep.slug === "time-zone") {
      form.setValue("timeZoneId", undefined, { shouldDirty: false, shouldTouch: false, shouldValidate: false })
      form.setValue("timeZone", "", { shouldDirty: false, shouldTouch: false, shouldValidate: false })
    }

    if (activeStep.slug === "thank-you-email") {
      try {
        await runSkipAction()
      } catch {
        return
      }

      goNext()
      return
    }

    await persistSkippedStep(activeStep.slug)
    goNext()
  }

  if (sessionQuery.isLoading && !currentUser) {
    return <WizardLoadingState />
  }

  if (!currentUser) {
    return <Navigate to={APP_ROUTES.auth.login} replace />
  }

  if (eventId && (wizardProgressQuery.isLoading || (currentStepIndex === -1 && wizardProgressQuery.isSuccess))) {
    return <WizardLoadingState />
  }

  return (
    <Flex
      minH="100dvh"
      direction="column"
      bg="linear-gradient(180deg, #F7F9FC 0%, #EEF2FF 45%, #F8FAFC 100%)"
    >
      <Box
        px={{ base: 5, md: 8 }}
        py={{ base: 4, md: 5 }}
        borderBottom="1px solid"
        borderColor="rgba(117, 81, 255, 0.08)"
        bg="rgba(255,255,255,0.7)"
        backdropFilter="blur(14px)"
      >
        <Flex align="center" justify="space-between" gap={4} w="full">
          <Flex align="center" gap={3}>
            <Flex
              w="42px"
              h="42px"
              borderRadius="14px"
              align="center"
              justify="center"
              bg="linear-gradient(135deg, #7551FF 0%, #422AFB 100%)"
              boxShadow="0 12px 30px rgba(66, 42, 251, 0.25)"
              flexShrink={0}
            >
              <Sparkles size={20} color="white" fill="white" />
            </Flex>
            <Box>
              <Text fontSize="lg" fontWeight="800" letterSpacing="-0.03em" lineHeight={1}>
                ideali<Text as="span" color="brand.500">events</Text>
              </Text>
              <Text fontSize="11px" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em" mt={1}>
                Event creation wizard
              </Text>
            </Box>
          </Flex>

          <Button
            variant="ghost"
            onClick={() => navigate(APP_ROUTES.events)}
            borderRadius="12px"
            h="44px"
          >
            <Flex align="center" gap={2}>
              <ArrowLeft size={16} />
              Back to events
            </Flex>
          </Button>
        </Flex>
      </Box>

      <Box flex={1} px={{ base: 5, md: 8 }} py={{ base: 6, md: 8 }}>
        <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="gray.900">
          Create event
        </Heading>
        <Text mt={2} color="gray.600" fontSize={{ base: "sm", md: "md" }}>
          This wizard is route-driven and each step persists independently through its own endpoint.
        </Text>
        <Text mt={2} color="gray.600" fontSize="sm">
          Fields marked with * are required before you continue. Optional fields can be skipped when available.
        </Text>

        <FormProvider {...form}>
          <Grid
            templateColumns={{ base: "1fr", lg: isStepsCollapsed ? "56px minmax(0, 1fr)" : "320px minmax(0, 1fr)" }}
            gap={{ base: 5, lg: 8 }}
            mt={{ base: 6, md: 8 }}
            w="full"
            alignItems="stretch"
          >
            <Box display="block" position="relative">
              <WizardStepsRail
                activeStepIndex={activeStepIndex}
                completedStepCount={completedStepCount}
                steps={wizardSteps}
                isCollapsed={isStepsCollapsed}
                maxUnlockedStepIndex={maxUnlockedStepIndex}
                onToggle={() => setIsStepsCollapsedOverride((current) => !(current ?? isMobile))}
                onStepClick={goToStep}
              />
            </Box>

            <Box
              bg="white"
              borderRadius="24px"
              border="1px solid"
              borderColor="gray.200"
              boxShadow="0 16px 40px rgba(15, 23, 42, 0.06)"
              p={{ base: 5, md: 8 }}
              minH={{ base: "auto", lg: "calc(100dvh - 280px)" }}
              h="full"
              w="full"
              minW={0}
              display="flex"
              flexDirection="column"
            >
              <Grid
                templateColumns={{ base: "1fr", lg: "minmax(0, 7fr) 1px minmax(0, 3fr)" }}
                gap={0}
                flex={1}
                minH={0}
                w="full"
              >
                <Box
                  pr={{ base: 0, lg: 8 }}
                  pb={{ base: 6, lg: 0 }}
                  minW={0}
                  display="flex"
                  flexDirection="column"
                  minH={0}
                >
                  {wizardDraftQuery.isLoading && eventId ? (
                    <EventWizardStepSkeleton step={activeStep.slug} />
                  ) : (
                    <Outlet />
                  )}
                </Box>

                <Box
                  display={{ base: "none", lg: "block" }}
                  bg="linear-gradient(180deg, rgba(117,81,255,0.15) 0%, rgba(66,42,251,0.35) 50%, rgba(117,81,255,0.15) 100%)"
                  w="2px"
                  minH="full"
                  borderRadius="full"
                  boxShadow="0 0 0 1px rgba(117,81,255,0.08)"
                />

                <Box
                  pl={{ base: 0, lg: 8 }}
                  pt={{ base: 6, lg: 0 }}
                  borderTop={{ base: "1px solid", lg: "none" }}
                  borderColor={{ base: "gray.200", lg: "transparent" }}
                  minW={0}
                  minH={0}
                >
                  <Stack gap={2} h="full" minH="240px" align="center" w="full">
                    <Text
                      fontSize="xs"
                      fontWeight="800"
                      color="gray.500"
                      textTransform="uppercase"
                      letterSpacing="0.1em"
                      textAlign="center"
                    >
                      Preview
                    </Text>
                    <PreviewFrame />
                  </Stack>
                </Box>
              </Grid>

              <Box
                mt={6}
                pt={5}
                borderTop="1px solid"
                borderColor="gray.200"
              >
                <Stack gap={3}>
                  {createEventDraftMutation.isError ? (
                    <Field.Root invalid>
                      <Field.ErrorText>We could not create the event. Please try again.</Field.ErrorText>
                    </Field.Root>
                  ) : null}

                  <EventWizardActions
                    showBack={!isFirstStep}
                    showSkip={isOptionalStep && !isLastWizardStep}
                    isPrimaryDisabled={
                      (isPaymentAccountStep && (!paymentAccountId || (paymentMethods?.length ?? 0) === 0)) ||
                      ((isPageManagedSaveStep || isReviewStep) && !isPrimaryActionReady)
                    }
                    isSecondaryDisabled={
                      (isPaymentAccountStep && (!paymentAccountId || (paymentMethods?.length ?? 0) === 0)) ||
                      ((isPageManagedSaveStep || isReviewStep) && !isPrimaryActionReady)
                    }
                    isPrimaryLoading={
                      createEventDraftMutation.isPending ||
                      ((isPageManagedSaveStep || isReviewStep) && !isPrimaryActionReady)
                    }
                    isSecondaryLoading={
                      createEventDraftMutation.isPending ||
                      ((isPageManagedSaveStep || isReviewStep) && !isPrimaryActionReady)
                    }
                    primaryLabel={!eventId && activeStep.slug === "name" ? "Create Event" : isReviewStep ? "Finish" : "Save & Continue"}
                    secondaryLabel="Save & Exit"
                    onBack={goBack}
                    onPrimary={handleSaveContinue}
                    onSecondary={handleSaveExit}
                    onSkip={handleSkip}
                  />
                </Stack>
              </Box>
            </Box>
          </Grid>
        </FormProvider>
      </Box>
    </Flex>
  )
}
