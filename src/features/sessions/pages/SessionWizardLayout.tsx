import { useEffect, useState } from "react"
import { Box, Button, Flex, Grid, Heading, Skeleton, SkeletonText, Stack, Text, useBreakpointValue } from "@chakra-ui/react"
import { Navigate, Outlet, useLocation, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, ChevronLeft, ChevronRight, Sparkles } from "lucide-react"
import { APP_ROUTES } from "@/utils/routes"
import { SessionWizardStepper } from "../components/SessionWizardStepper"
import { SessionWizardActionsProvider, useSessionWizardActions } from "../hooks/useSessionWizardActions"
import { useSessionWizardNavigation } from "../hooks/useSessionWizard"

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

export function SessionWizardLayout() {
  return (
    <SessionWizardActionsProvider>
      <SessionWizardLayoutContent />
    </SessionWizardActionsProvider>
  )
}

function SessionWizardLayoutContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { sessionId } = useParams<{ sessionId?: string }>()
  const isMobile = useBreakpointValue({ base: true, lg: false }) ?? true
  const [isStepsCollapsedOverride, setIsStepsCollapsedOverride] = useState<boolean | null>(null)
  const isStepsCollapsed = isStepsCollapsedOverride ?? isMobile
  const { steps, activeStepIndex, goToStep, goBack, goNext, isFirstStep, isLastStep } = useSessionWizardNavigation()
  const { runPrimaryAction } = useSessionWizardActions()
  const currentStepIndex = sessionId ? steps.findIndex((step) => step.path === location.pathname) : -1
  const shouldRedirectToStep = Boolean(sessionId) && currentStepIndex === -1

  useEffect(() => {
    if (shouldRedirectToStep && steps[0]) {
      navigate(steps[0].path, { replace: true })
    }
  }, [navigate, shouldRedirectToStep, steps])

  if (!sessionId) {
    return <Navigate to={APP_ROUTES.events} replace />
  }

  if (!steps.length) {
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
                session<Text as="span" color="brand.500">wizard</Text>
              </Text>
              <Text fontSize="11px" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em" mt={1}>
                Session editing wizard
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
          Edit session
        </Heading>
        <Text mt={2} color="gray.600" fontSize={{ base: "sm", md: "md" }}>
          This wizard follows the same route-driven pattern as events. The session unique id is part of the URL.
        </Text>
        <Text mt={2} color="gray.600" fontSize="sm">
          Fields marked with * are required before you continue. Optional fields can be skipped when available.
        </Text>

        <Grid
          templateColumns={{ base: "1fr", lg: isStepsCollapsed ? "56px minmax(0, 1fr)" : "320px minmax(0, 1fr)" }}
          gap={{ base: 5, lg: 8 }}
          mt={{ base: 6, md: 8 }}
          w="full"
          alignItems="stretch"
        >
          <Box display="block" position="relative">
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
              <Button
                type="button"
                aria-label={isStepsCollapsed ? "Show steps" : "Hide steps"}
                variant="solid"
                borderRadius="full"
                h={{ base: "34px", md: "38px" }}
                w={{ base: "34px", md: "38px" }}
                minW={{ base: "34px", md: "38px" }}
                p={0}
                flexShrink={0}
                onClick={() => setIsStepsCollapsedOverride((current) => !(current ?? isMobile))}
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
                {isStepsCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={16} />}
              </Button>

              <Box position="relative" minH={isStepsCollapsed ? "48px" : "auto"}>
                {!isStepsCollapsed ? (
                  <Flex align="center" justify="space-between" gap={3} mb={2}>
                    <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.1em">
                      Steps
                    </Text>
                    <Box />
                  </Flex>
                ) : null}

                {!isStepsCollapsed ? (
                  <SessionWizardStepper
                    steps={steps}
                    activeStepIndex={activeStepIndex}
                    onStepClick={goToStep}
                  />
                ) : null}
              </Box>
            </Box>
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
                <Outlet />
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
              <Flex gap={3} justify="space-between" flexWrap="wrap">
                <Button
                  variant="outline"
                  borderRadius="14px"
                  h="44px"
                  px={6}
                  minW={{ base: "full", md: "140px" }}
                  onClick={goBack}
                  disabled={isFirstStep}
                >
                  Back
                </Button>
                <Flex gap={3} flexWrap="wrap" ml="auto">
                  <Button
                    variant="outline"
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    minW={{ base: "full", md: "140px" }}
                    onClick={() => navigate(APP_ROUTES.events)}
                  >
                    Close
                  </Button>
                  <Button
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    minW={{ base: "full", md: "140px" }}
                    onClick={async () => {
                      try {
                        await runPrimaryAction()
                        goNext()
                      } catch {
                        // Step component handles inline validation/state.
                      }
                    }}
                    disabled={isLastStep}
                    color="white"
                    style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                  >
                    Save & Continue
                  </Button>
                </Flex>
              </Flex>
            </Box>
          </Box>
        </Grid>
      </Box>
    </Flex>
  )
}
