import { Box, Field, Flex, Input, Stack, Text } from "@chakra-ui/react"
import { useFormContext } from "react-hook-form"
import { EventWizardActions } from "../components/EventWizardActions"
import { useEventWizardNavigation } from "../hooks/useEventWizard"
import type { EventWizardValues } from "../schemas/eventWizard.schemas"

const THEME_COLOR_PRESETS = ["#7551FF", "#422AFB", "#2196F3", "#01B574", "#FFB547", "#EE5D50"]

export function EventThemeColorStepPage() {
  const { register, setValue, watch } = useFormContext<EventWizardValues>()
  const themeColor = watch("themeColor") ?? "#7551FF"
  const { goBack, goNext } = useEventWizardNavigation()

  return (
    <Stack h="full" gap={4}>
      <Stack flex="1" gap={4}>
        <Field.Root>
          <Field.Label>Theme color</Field.Label>
          <Flex align="center" gap={4} wrap="wrap">
            <Box
              w="52px"
              h="52px"
              borderRadius="16px"
              border="1px solid"
              borderColor="border.subtle"
              bg={themeColor}
              boxShadow="sm"
            />
            <Input type="color" maxW="180px" h="52px" p={1} {...register("themeColor")} />
          </Flex>
        </Field.Root>

        <Field.Root>
          <Field.Label>Presets</Field.Label>
          <Flex gap={3} wrap="wrap">
            {THEME_COLOR_PRESETS.map((color) => (
              <Box
                key={color}
                as="button"
                w="36px"
                h="36px"
                borderRadius="12px"
                bg={color}
                border="1px solid"
                borderColor={themeColor === color ? "white" : "transparent"}
                boxShadow={themeColor === color ? `0 0 0 3px ${color}40` : "sm"}
                onClick={() => setValue("themeColor", color, { shouldValidate: true })}
                aria-label={`Use theme color ${color}`}
              />
            ))}
          </Flex>
        </Field.Root>

        <Text fontSize="sm" color="text.secondary">
          Pick the accent that will represent this event in lists, cards, and review screens.
        </Text>
      </Stack>

      <EventWizardActions
        backLabel="Back"
        nextLabel="Continue"
        onBack={goBack}
        onNext={goNext}
      />
    </Stack>
  )
}
