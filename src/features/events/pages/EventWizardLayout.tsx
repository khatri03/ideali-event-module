import { zodResolver } from "@hookform/resolvers/zod"
import { Box, Button, Flex, Grid, Heading, Skeleton, SkeletonText, Text, useBreakpointValue } from "@chakra-ui/react"
import { FormProvider, useForm } from "react-hook-form"
import { Navigate, Outlet, useNavigate, useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { ArrowLeft, ChevronLeft, ChevronRight, Sparkles } from "lucide-react"
import { useAuthSession } from "@/hooks/useAuthSession"
import { auth } from "@/lib/auth"
import { APP_ROUTES } from "@/utils/routes"
import { useEventWizardDraft } from "../hooks/useEventWizardDraft"
import { useEventWizardNavigation, type EventWizardStep } from "../hooks/useEventWizard"
import { defaultEventWizardValues, eventWizardSchema, type EventWizardValues } from "../schemas/eventWizard.schemas"
import { EventWizardStepper } from "../components/EventWizardStepper"
import { EventWizardStepSkeleton } from "../components/EventWizardStepSkeleton"
import { eventToWizardValues } from "../utils/eventWizardMappers"
import { sessionDataToUser } from "@/lib/auth"

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
      p={{ base: 5, md: 6 }}
      pt={{ base: 8, md: 8 }}
      pr={{ base: 5, md: 6 }}
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
          <Flex align="center" justify="space-between" gap={3} mb={3}>
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
  const { steps, activeStepIndex, activeStep, goToStep } = useEventWizardNavigation()
  const wizardDraftQuery = useEventWizardDraft(eventId)
  const isMobile = useBreakpointValue({ base: true, lg: false }) ?? true
  const [isStepsCollapsedOverride, setIsStepsCollapsedOverride] = useState<boolean | null>(null)
  const isStepsCollapsed = isStepsCollapsedOverride ?? isMobile

  const form = useForm<EventWizardValues>({
    defaultValues: {
      ...defaultEventWizardValues,
      paymentAccountId: organizer?.paymentAccounts?.[0]?.uniqueId ?? "",
    },
    resolver: zodResolver(eventWizardSchema),
    mode: "onSubmit",
  })

  useEffect(() => {
    if (wizardDraftQuery.data) {
      form.reset(eventToWizardValues(wizardDraftQuery.data))
    }
  }, [form, wizardDraftQuery.data])

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
              {wizardDraftQuery.isLoading && eventId ? (
                <EventWizardStepSkeleton step={activeStep.slug} />
              ) : (
                <Outlet />
              )}
            </Box>
          </Grid>
        </FormProvider>
      </Box>
    </Flex>
  )
}
