import { Field, Stack, Textarea, Text } from "@chakra-ui/react"
import { useFormContext } from "react-hook-form"
import { StepFieldLabel } from "../components/StepFieldLabel"
import type { EventWizardValues } from "../schemas/eventWizard.schemas"

export function EventDescriptionStepPage() {
  const { register } = useFormContext<EventWizardValues>()

  return (
    <Stack h="full" gap={4}>
      <Stack flex="1" gap={4}>
        <Field.Root>
          <StepFieldLabel label="Description" />
          <Textarea
            placeholder="Add a concise description for attendees, sponsors, and internal teams."
            minH="180px"
            resize="vertical"
            {...register("description")}
          />
          <Field.HelperText>Optional. Keep it helpful and focused.</Field.HelperText>
        </Field.Root>

        <Text fontSize="sm" color="text.secondary">
          This field can stay empty for now. You can come back and expand it later if you need richer copy.
        </Text>
      </Stack>
    </Stack>
  )
}
