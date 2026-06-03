import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react"
import type { SessionWizardStep } from "../hooks/useSessionWizard"

interface SessionWizardStepperProps {
  activeStepIndex: number
  completedStepCount?: number
  maxUnlockedStepIndex?: number
  onStepClick?: (step: SessionWizardStep["slug"]) => void
  steps: SessionWizardStep[]
}

export function SessionWizardStepper({
  activeStepIndex,
  completedStepCount = activeStepIndex,
  maxUnlockedStepIndex = activeStepIndex,
  onStepClick,
  steps,
}: SessionWizardStepperProps) {
  return (
    <Stack gap={1.5} align="stretch">
      {steps.map((step, index) => {
        const isActive = index === activeStepIndex
        const isComplete = index < completedStepCount
        const isFutureStep = index > maxUnlockedStepIndex
        const isNavigable = Boolean(onStepClick) && index <= maxUnlockedStepIndex && index !== activeStepIndex

        return (
          <Box key={step.slug} w="full" cursor={isFutureStep ? "not-allowed" : isNavigable ? "pointer" : "default"}>
            <Button
              type="button"
              disabled={isFutureStep}
              variant="ghost"
              w="full"
              h="auto"
              minH="48px"
              px={2.5}
              py={2}
              borderRadius="14px"
              border="2px solid"
              borderColor={isActive ? "green.700" : isComplete ? "green.300" : isFutureStep ? "gray.300" : "gray.200"}
              bg={isActive ? "green.50" : isComplete ? "green.100" : isFutureStep ? "gray.50" : "white"}
              boxShadow={isActive ? "0 0 0 2px rgba(1, 181, 116, 0.22), 0 18px 34px rgba(1, 181, 116, 0.18)" : "none"}
              justifyContent="flex-start"
              alignItems="center"
              textAlign="left"
              onClick={isNavigable ? () => onStepClick?.(step.slug) : undefined}
              cursor="inherit"
              pointerEvents={isFutureStep ? "none" : "auto"}
              position="relative"
              overflow="hidden"
              _hover={{
                bg: isActive ? "green.50" : isComplete ? "green.50" : isFutureStep ? "gray.50" : "gray.50",
              }}
              _disabled={{ opacity: 0.45, cursor: "inherit" }}
            >
              {isActive ? (
                <Box position="absolute" left={0} top={0} bottom={0} w="4px" bg="green.700" borderTopLeftRadius="12px" borderBottomLeftRadius="12px" />
              ) : null}
              <Flex align="center" gap={2.5} minW={0}>
                <Flex
                  w={isActive ? "34px" : "30px"}
                  h={isActive ? "34px" : "30px"}
                  borderRadius="full"
                  align="center"
                  justify="center"
                  flexShrink={0}
                  bg={isActive ? "green.600" : isComplete ? "green.800" : isFutureStep ? "gray.200" : "white"}
                  color={isActive || isComplete ? "white" : isFutureStep ? "gray.500" : "green.700"}
                  border="2px solid"
                  borderColor={isActive ? "green.900" : isComplete ? "green.800" : isFutureStep ? "gray.300" : "green.200"}
                >
                  {isComplete ? "✓" : <Text fontSize="sm" fontWeight="800">{index + 1}</Text>}
                </Flex>
                <Box minW={0}>
                  <Text fontSize="sm" fontWeight={isActive ? "900" : "700"} color={isFutureStep ? "gray.500" : "gray.900"} lineHeight={1.1}>
                    {step.label}
                  </Text>
                </Box>
              </Flex>
            </Button>
          </Box>
        )
      })}
    </Stack>
  )
}
