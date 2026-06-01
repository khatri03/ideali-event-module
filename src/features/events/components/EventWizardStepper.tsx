import { Button, Box, Flex, Stack, Text } from "@chakra-ui/react"
import type { EventWizardStep } from "../hooks/useEventWizard"

interface EventWizardStepperProps {
  activeStepIndex: number
  onStepClick?: (step: EventWizardStep["slug"]) => void
  steps: EventWizardStep[]
}

export function EventWizardStepper({ activeStepIndex, onStepClick, steps }: EventWizardStepperProps) {
  return (
    <Stack gap={2} align="stretch">
      {steps.map((step, index) => {
        const isActive = index === activeStepIndex
        const isComplete = index < activeStepIndex
        const isFutureStep = index > activeStepIndex
        const isNavigable = Boolean(onStepClick) && isComplete
        const isDisabled = isFutureStep
        const itemBg = isComplete
          ? "green.50"
          : isActive
            ? "linear-gradient(135deg, rgba(1, 181, 116, 0.36) 0%, rgba(1, 181, 116, 0.22) 100%)"
            : "gray.50"
        const itemBorderColor = isComplete ? "green.200" : isActive ? "green.600" : "gray.300"
        const itemHoverBg = isNavigable ? (isActive ? "linear-gradient(135deg, rgba(1, 181, 116, 0.42) 0%, rgba(1, 181, 116, 0.26) 100%)" : "green.50") : "gray.50"
        const itemHoverBorderColor = isNavigable ? (isActive ? "green.700" : "green.200") : "gray.200"

        return (
          <Box
            key={step.slug}
            w="full"
            cursor={isFutureStep ? "not-allowed" : isNavigable ? "pointer" : "default"}
          >
            <Button
              type="button"
              disabled={isFutureStep}
              variant="ghost"
              w="full"
              h="auto"
              minH="60px"
              px={3}
              py={3}
              borderRadius="16px"
              border="2px solid"
              borderColor={itemBorderColor}
              bg={itemBg}
              boxShadow={isActive ? "0 18px 34px rgba(1, 181, 116, 0.26)" : "none"}
              justifyContent="flex-start"
              alignItems="center"
              textAlign="left"
              onClick={isNavigable ? () => onStepClick?.(step.slug) : undefined}
              cursor="inherit"
              pointerEvents={isFutureStep ? "none" : "auto"}
              position="relative"
              overflow="hidden"
              _hover={{
                bg: itemHoverBg,
                borderColor: itemHoverBorderColor,
              }}
              _disabled={{
                opacity: 0.45,
                cursor: "inherit",
              }}
              _active={{ transform: isNavigable ? "translateY(0)" : undefined }}
            >
              {isActive ? (
                <Box
                  position="absolute"
                  left={0}
                  top={0}
                  bottom={0}
                  w="5px"
                  bg="green.700"
                  borderTopLeftRadius="14px"
                  borderBottomLeftRadius="14px"
                />
              ) : null}

              <Flex align="center" gap={3} minW={0}>
                <Flex
                  w={isActive ? "38px" : "34px"}
                  h={isActive ? "38px" : "34px"}
                  borderRadius="full"
                  align="center"
                  justify="center"
                  flexShrink={0}
                  bg={isComplete ? "green.500" : isActive ? "green.700" : "gray.200"}
                  color={isComplete || isActive ? "white" : "gray.500"}
                  border="2px solid"
                  borderColor={isComplete || isActive ? "green.700" : "gray.300"}
                  boxShadow={isActive ? "0 10px 20px rgba(1, 181, 116, 0.30)" : "none"}
                >
                  {isComplete ? "✓" : <Text fontSize="sm" fontWeight="800">{index + 1}</Text>}
                </Flex>

                <Box minW={0}>
                  <Text
                    fontSize="sm"
                    fontWeight={isActive ? "900" : "700"}
                    color={isDisabled ? "gray.500" : isActive ? "green.900" : "gray.900"}
                    lineHeight={1.15}
                    whiteSpace="nowrap"
                    overflow="hidden"
                    textOverflow="ellipsis"
                  >
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
