import { zodResolver } from "@hookform/resolvers/zod"
import { DeviceFrameset } from "react-device-frameset"
import "react-device-frameset/styles/marvel-devices.min.css"
import { Box, Button, Field, Flex, Grid, Heading, Skeleton, SkeletonText, Stack, Text, useBreakpointValue } from "@chakra-ui/react"
import { useMutation } from "@tanstack/react-query"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { Navigate, Outlet, useNavigate, useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { ArrowLeft, ChevronLeft, ChevronRight, Sparkles } from "lucide-react"
import { createEvent } from "@/api/events"
import { useAuthSession } from "@/hooks/useAuthSession"
import { auth, sessionDataToUser } from "@/lib/auth"
import { queryClient } from "@/lib/queryClient"
import { APP_ROUTES } from "@/utils/routes"
import { useEventWizardDraft } from "../hooks/useEventWizardDraft"
import { useEventWizardNavigation, type EventWizardStep } from "../hooks/useEventWizard"
import { defaultEventWizardValues, eventWizardFieldGroups, eventWizardSchema, type EventWizardValues } from "../schemas/eventWizard.schemas"
import { EventWizardStepper } from "../components/EventWizardStepper"
import { EventWizardStepSkeleton } from "../components/EventWizardStepSkeleton"
import { EventWizardActions } from "../components/EventWizardActions"
import { eventToWizardValues } from "../utils/eventWizardMappers"
import { buildCreateEventPayload } from "../hooks/useEventWizard"

type PreviewMode = "mobile" | "laptop"

interface DeviceFrameSpec {
  width: number
  height: number
  scale: number
}

const PREVIEW_DEVICE_SPECS: Record<PreviewMode, DeviceFrameSpec> = {
  mobile: {
    width: 375,
    height: 812,
    scale: 0.74,
  },
  laptop: {
    width: 960,
    height: 600,
    scale: 0.36,
  },
}

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

function PreviewModeToggle({
  mode,
  onChange,
}: {
  mode: PreviewMode
  onChange: (mode: PreviewMode) => void
}) {
  return (
    <Flex
      w="auto"
      minW={{ base: "280px", md: "320px" }}
      borderRadius="999px"
      border="1px solid"
      borderColor="gray.200"
      bg="gray.50"
      p={1}
      mx="auto"
    >
      <Button
        flex={1}
        h="36px"
        px={6}
        borderRadius="999px"
        variant="ghost"
        bg={mode === "mobile" ? "white" : "transparent"}
        boxShadow={mode === "mobile" ? "sm" : "none"}
        onClick={() => onChange("mobile")}
      >
        Mobile
      </Button>
      <Button
        flex={1}
        h="36px"
        px={6}
        borderRadius="999px"
        variant="ghost"
        bg={mode === "laptop" ? "white" : "transparent"}
        boxShadow={mode === "laptop" ? "sm" : "none"}
        onClick={() => onChange("laptop")}
      >
        Laptop
      </Button>
    </Flex>
  )
}

function PreviewContent({ mode }: { mode: PreviewMode }) {
  return (
    <Flex direction="column" gap={4} p={{ base: 4, md: 5 }} pt={mode === "mobile" ? { base: 9, md: 10 } : { base: 5, md: 6 }} h="full" position="relative">
      {mode === "mobile" ? (
        <Box
          position="absolute"
          top={3}
          left="50%"
          transform="translateX(-50%)"
          w="96px"
          h="6px"
          borderRadius="999px"
          bg="gray.200"
        />
      ) : null}

      <Box
        borderRadius="16px"
        bg="gray.50"
        border="1px solid"
        borderColor="gray.200"
        p={4}
      >
        <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
          Event preview
        </Text>
        <Text mt={2} fontSize={{ base: "lg", md: "xl" }} fontWeight="800" color="gray.900" lineHeight={1.05}>
          Ideali Summit 2026
        </Text>
        <Text mt={2} fontSize={{ base: "sm", md: "md" }} color="gray.600">
          Clean preview with the lightest possible bezel treatment.
        </Text>
      </Box>

      <Box borderRadius="16px" bg="green.50" border="1px solid" borderColor="green.100" p={4}>
        <Flex align="center" justify="space-between" gap={3}>
          <Box minW={0}>
            <Text fontSize="xs" fontWeight="800" color="green.700" textTransform="uppercase" letterSpacing="0.08em">
              Sessions
            </Text>
            <Text mt={1} fontSize={{ base: "sm", md: "md" }} fontWeight="700" color="gray.900">
              3 sessions scheduled
            </Text>
          </Box>
          <Box borderRadius="999px" bg="white" px={3} py={1}>
            <Text fontSize="xs" fontWeight="800" color="green.700">
              Draft
            </Text>
          </Box>
        </Flex>
      </Box>
    </Flex>
  )
}

function PreviewFrame({ mode }: { mode: PreviewMode }) {
  const spec = PREVIEW_DEVICE_SPECS[mode]
  const frameWidth = Math.round(spec.width * spec.scale)
  const frameHeight = Math.round(spec.height * spec.scale)

  if (mode === "mobile") {
    return (
      <Box display="flex" justifyContent="center" w="full" overflow="visible">
        <Box position="relative" w="full" maxW={`${frameWidth}px`} h={`${frameHeight}px`} overflow="visible">
          <Box position="absolute" top={0} left="50%" transform="translateX(-50%) scale(0.74)" transformOrigin="top center">
            <DeviceFrameset device="iPhone X" width={spec.width} height={spec.height}>
              <PreviewContent mode="mobile" />
            </DeviceFrameset>
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box display="flex" justifyContent="center" w="full" overflow="visible">
      <Box position="relative" w="full" maxW={`${frameWidth}px`} h={`${frameHeight}px`} overflow="visible">
        <Box position="absolute" top={0} left="50%" transform="translateX(-50%) scale(0.36)" transformOrigin="top center">
          <DeviceFrameset device="MacBook Pro" width={spec.width} height={spec.height}>
            <PreviewContent mode="laptop" />
          </DeviceFrameset>
        </Box>
      </Box>
    </Box>
  )
}

function WizardStepsRail({
  activeStepIndex,
  isCollapsed,
  onToggle,
  onStepClick,
  steps,
}: {
  activeStepIndex: number
  isCollapsed: boolean
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
      p={{ base: 4, md: 5 }}
      pt={{ base: 7, md: 7 }}
      pr={{ base: 4, md: 5 }}
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
        h={{ base: "36px", md: "40px" }}
        w={{ base: "36px", md: "40px" }}
        minW={{ base: "36px", md: "40px" }}
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

        {!isCollapsed ? <EventWizardStepper steps={steps} activeStepIndex={activeStepIndex} onStepClick={onStepClick} /> : null}
      </Box>
    </Box>
  )
}

export function EventWizardLayout() {
  const navigate = useNavigate()
  const { eventId } = useParams<{ eventId?: string }>()
  const sessionQuery = useAuthSession()
  const currentUser = auth.getUser() ?? (sessionQuery.data ? sessionDataToUser(sessionQuery.data) : null)
  const organizer = auth.getOrganizer()
  const { steps, activeStepIndex, activeStep, goToStep, goBack, goNext, isFirstStep, isLastStep } = useEventWizardNavigation()
  const wizardDraftQuery = useEventWizardDraft(eventId)
  const isMobile = useBreakpointValue({ base: true, lg: false }) ?? true
  const [isStepsCollapsedOverride, setIsStepsCollapsedOverride] = useState<boolean | null>(null)
  const [previewMode, setPreviewMode] = useState<PreviewMode>("mobile")
  const isStepsCollapsed = isStepsCollapsedOverride ?? isMobile

  const form = useForm<EventWizardValues>({
    defaultValues: {
      ...defaultEventWizardValues,
      paymentAccountId: organizer?.paymentAccounts?.[0]?.uniqueId ?? "",
    },
    resolver: zodResolver(eventWizardSchema),
    mode: "onSubmit",
  })
  const paymentAccountId = useWatch({ control: form.control, name: "paymentAccountId" })
  const isReviewStep = activeStep.slug === "review"
  const isOptionalStep =
    activeStep.slug === "description" ||
    activeStep.slug === "discount-coupon" ||
    activeStep.slug === "questions" ||
    activeStep.slug === "thank-you-email" ||
    activeStep.slug === "purchase-time-limit"
  const isPaymentAccountStep = activeStep.slug === "payment-account"
  const isLastWizardStep = isLastStep

  const createEventMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      navigate(APP_ROUTES.events, { replace: true })
    },
    onError: () => {
      // handled inline below
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] })
    },
  })

  useEffect(() => {
    if (wizardDraftQuery.data) {
      form.reset(eventToWizardValues(wizardDraftQuery.data))
    }
  }, [form, wizardDraftQuery.data])

  function getStepValidationFields() {
    switch (activeStep.slug) {
      case "name":
        return eventWizardFieldGroups.name
      case "description":
        return eventWizardFieldGroups.description
      case "theme-color":
        return eventWizardFieldGroups.theme
      case "payment-account":
        return eventWizardFieldGroups.paymentAccount
      case "time-zone":
        return eventWizardFieldGroups.timeZone
      case "sessions":
        return eventWizardFieldGroups.sessions
      case "discount-coupon":
      case "questions":
      case "thank-you-email":
        return []
      case "purchase-time-limit":
        return eventWizardFieldGroups.advancedSettings
      case "review":
        return []
    }
  }

  async function handleSaveContinue() {
    if (isReviewStep) {
      await createEventMutation.mutateAsync(buildCreateEventPayload(form.getValues()))
      return
    }

    const isValid = await form.trigger(getStepValidationFields())
    if (isValid) {
      goNext()
    }
  }

  async function handleSaveExit() {
    if (isReviewStep) {
      await createEventMutation.mutateAsync(buildCreateEventPayload(form.getValues()))
      return
    }

    const isValid = await form.trigger(getStepValidationFields())
    if (isValid) {
      navigate(APP_ROUTES.events)
    }
  }

  async function handleSkip() {
    goNext()
  }

  if (sessionQuery.isLoading && !currentUser) {
    return <WizardLoadingState />
  }

  if (!currentUser) {
    return <Navigate to={APP_ROUTES.auth.login} replace />
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
                steps={steps}
                isCollapsed={isStepsCollapsed}
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
                templateColumns={{ base: "1fr", lg: "minmax(0, 1fr) 1px minmax(0, 1fr)" }}
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
                    <PreviewModeToggle mode={previewMode} onChange={setPreviewMode} />
                    <PreviewFrame mode={previewMode} />
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
                  {createEventMutation.isError ? (
                    <Field.Root invalid>
                      <Field.ErrorText>We could not create the event. Please try again.</Field.ErrorText>
                    </Field.Root>
                  ) : null}

                  <EventWizardActions
                    showBack={!isFirstStep}
                    showSkip={isOptionalStep && !isLastWizardStep}
                    isPrimaryDisabled={isPaymentAccountStep && (!paymentAccountId || !organizer?.paymentAccounts?.length)}
                    isSecondaryDisabled={isPaymentAccountStep && !organizer?.paymentAccounts?.length}
                    isPrimaryLoading={createEventMutation.isPending && isReviewStep}
                    isSecondaryLoading={createEventMutation.isPending && isReviewStep}
                    primaryLabel={isReviewStep ? "Create Event" : "Save & Continue"}
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
