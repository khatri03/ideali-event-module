import { Field, Input, Stack, Text } from "@chakra-ui/react"
import { useFormContext } from "react-hook-form"
import { StepFieldLabel } from "../components/StepFieldLabel"
import { type EventWizardValues } from "../schemas/eventWizard.schemas"

export function EventNameStepPage() {
  const { register, formState: { errors } } = useFormContext<EventWizardValues>()

  return (
    <Stack h="full" gap={4}>
      <Stack flex="1" gap={4}>
        <Field.Root invalid={!!errors.name}>
          <StepFieldLabel label="Event name" isRequired />
          <Input placeholder="e.g. Ideali Summit 2026" {...register("name")} />
          <Field.ErrorText>{errors.name?.message}</Field.ErrorText>
        </Field.Root>

        <Text fontSize="sm" color="text.secondary">
          Keep it short and specific so attendees can identify the event quickly.
        </Text>
      </Stack>
    </Stack>
  )
}
