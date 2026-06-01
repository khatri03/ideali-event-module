import { Button, Box, Flex, Stack, Text } from "@chakra-ui/react"
import type { EventWizardStep } from "../hooks/useEventWizard"

interface EventWizardStepperProps {
  activeStepIndex: number
  onStepClick?: (step: EventWizardStep["slug"]) => void
  steps: EventWizardStep[]
}

export function EventWizardStepper({ activeStepIndex, onStepClick, steps }: EventWizardStepperProps) {
  return (
    <Stack gap={3} align="stretch">
      {steps.map((step, index) => {
        const isActive = index === activeStepIndex
        const isComplete = index < activeStepIndex
        const statusLabel = isComplete ? "DONE" : isActive ? "CURRENT" : "NEXT"
        const isClickable = Boolean(onStepClick)

        return (
          <Button
            type="button"
            key={step.slug}
            variant="ghost"
            w="full"
            h="auto"
            minH="72px"
            px={4}
            py={4}
            borderRadius="20px"
            border="1px solid"
            borderColor={isActive ? "green.200" : isComplete ? "green.100" : "gray.200"}
            bg={isActive ? "green.100" : isComplete ? "green.50" : "white"}
            boxShadow={isActive ? "0 12px 28px rgba(1, 181, 116, 0.10)" : "none"}
            justifyContent="space-between"
            alignItems="center"
            textAlign="left"
            onClick={onStepClick ? () => onStepClick(step.slug) : undefined}
            cursor={isClickable ? "pointer" : "default"}
            _hover={{
              bg: isActive ? "green.100" : isComplete ? "green.50" : "gray.50",
              borderColor: isActive ? "green.300" : "green.200",
            }}
            _active={{ transform: isClickable ? "translateY(0)" : undefined }}
          >
            <Flex align="center" gap={4} minW={0}>
              <Flex
                w="42px"
                h="42px"
                borderRadius="full"
                align="center"
                justify="center"
                flexShrink={0}
                bg={isComplete || isActive ? "green.500" : "green.50"}
                color={isComplete || isActive ? "white" : "green.700"}
                border="1px solid"
                borderColor={isComplete || isActive ? "green.500" : "green.200"}
                boxShadow={isActive ? "0 8px 18px rgba(1, 181, 116, 0.18)" : "none"}
              >
                {isComplete ? "✓" : <Text fontSize="sm" fontWeight="800">{index + 1}</Text>}
              </Flex>

              <Box minW={0}>
                <Text
                  fontSize="sm"
                  fontWeight={isActive ? "800" : "700"}
                  color="gray.900"
                  lineHeight={1.2}
                  whiteSpace="nowrap"
                  overflow="hidden"
                  textOverflow="ellipsis"
                >
                  {step.label}
                </Text>
              </Box>
            </Flex>

            <Box
              flexShrink={0}
              px={4}
              py={1.5}
              borderRadius="999px"
              bg={isActive || isComplete ? "green.500" : "gray.200"}
              color={isActive || isComplete ? "white" : "gray.600"}
              fontSize="xs"
              fontWeight="800"
              letterSpacing="0.08em"
              textTransform="uppercase"
            >
              {statusLabel}
            </Box>
          </Button>
        )
      })}
    </Stack>
  )
}
