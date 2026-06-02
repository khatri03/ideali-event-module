import { Field, Stack, Text } from "@chakra-ui/react"
import { useFormContext } from "react-hook-form"
import { StepFieldLabel } from "../components/StepFieldLabel"
import { EventDescriptionEditor } from "../components/EventDescriptionEditor"
import type { EventWizardValues } from "../schemas/eventWizard.schemas"

export function EventDescriptionStepPage() {
  const { setValue, watch } = useFormContext<EventWizardValues>()
  const description = watch("description")

  return (
    <Stack h="full" gap={4}>
      <Stack flex="1" gap={4}>
        <Field.Root>
          <StepFieldLabel label="Description" />
          <EventDescriptionEditor
            value={description}
            onChange={(value) => setValue("description", value, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
          />
          <Field.HelperText>Optional. Keep it helpful and focused.</Field.HelperText>
        </Field.Root>

        <Text fontSize="sm" color="text.secondary">
          This field can stay empty for now. You can come back and expand it later with formatting, lists, and callouts.
        </Text>
      </Stack>
    </Stack>
  )
}
