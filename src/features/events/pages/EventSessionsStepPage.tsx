import { Button, Stack, Text } from "@chakra-ui/react"
import { Plus } from "lucide-react"
import { useFieldArray, useFormContext } from "react-hook-form"
import { EventSessionRow } from "../components/EventSessionRow"
import { EventWizardActions } from "../components/EventWizardActions"
import { useEventWizardNavigation } from "../hooks/useEventWizard"
import type { EventWizardSessionValues, EventWizardValues } from "../schemas/eventWizard.schemas"

export function EventSessionsStepPage() {
  const { control, trigger } = useFormContext<EventWizardValues>()
  const { fields, append, remove } = useFieldArray({
    control,
    name: "sessions",
  })
  const { goBack, goNext } = useEventWizardNavigation()

  async function handleNext() {
    const isValid = await trigger("sessions")
    if (isValid) {
      goNext()
    }
  }

  return (
    <Stack h="full" gap={4}>
      <Stack flex="1" gap={4}>
        <Text fontSize="sm" color="text.secondary">
          Add at least one session. Each session can represent a keynote, workshop, or any other time-boxed part of the event.
        </Text>

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

      <EventWizardActions
        backLabel="Back"
        nextLabel="Continue"
        onBack={goBack}
        onNext={handleNext}
      />
    </Stack>
  )
}
