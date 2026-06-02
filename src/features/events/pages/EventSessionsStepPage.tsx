import { Button, Field, Stack, Text } from "@chakra-ui/react"
import { Plus } from "lucide-react"
import { useFieldArray, useFormContext } from "react-hook-form"
import { EventSessionRow } from "../components/EventSessionRow"
import { StepFieldLabel } from "../components/StepFieldLabel"
import type { EventWizardSessionValues, EventWizardValues } from "../schemas/eventWizard.schemas"

export function EventSessionsStepPage() {
  const { control } = useFormContext<EventWizardValues>()
  const { fields, append, remove } = useFieldArray({
    control,
    name: "sessions",
  })

  return (
    <Stack h="full" gap={4}>
      <Stack flex="1" gap={4}>
        <Field.Root>
          <StepFieldLabel label="Sessions" isRequired />
          <Text fontSize="sm" color="text.secondary">
            Add at least one session. Each session can represent a keynote, workshop, or any other time-boxed part of the event.
          </Text>
        </Field.Root>

        <Stack gap={4}>
          {fields.map((field, index) => (
            <EventSessionRow
              key={field.id}
              index={index}
              canRemove={fields.length > 1}
              onRemove={() => remove(index)}
            />
          ))}
        </Stack>

        <Button
          variant="outline"
          borderRadius="14px"
          h="44px"
          alignSelf="flex-start"
          onClick={() =>
            append({
              title: "",
              startsAt: "",
              endsAt: "",
            } satisfies EventWizardSessionValues)
          }
        >
          <Plus size={16} />
          Add session
        </Button>
      </Stack>
    </Stack>
  )
}
