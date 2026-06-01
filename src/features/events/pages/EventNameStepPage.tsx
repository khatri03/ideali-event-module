import { Field, Input, Stack, Text } from "@chakra-ui/react"
import { useFormContext } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { APP_ROUTES } from "@/utils/routes"
import { EventWizardActions } from "../components/EventWizardActions"
import { eventWizardFieldGroups, type EventWizardValues } from "../schemas/eventWizard.schemas"
import { useEventWizardNavigation } from "../hooks/useEventWizard"

export function EventNameStepPage() {
  const { register, trigger, formState: { errors } } = useFormContext<EventWizardValues>()
  const navigate = useNavigate()
  const { goNext } = useEventWizardNavigation()

  async function handleNext() {
    const isValid = await trigger(eventWizardFieldGroups.identity)
    if (isValid) {
      goNext()
    }
  }

  return (
    <Stack h="full" gap={4}>
      <Stack flex="1" gap={4}>
        <Field.Root invalid={!!errors.name}>
          <Field.Label>Event name</Field.Label>
          <Input placeholder="e.g. Ideali Summit 2026" {...register("name")} />
          <Field.ErrorText>{errors.name?.message}</Field.ErrorText>
        </Field.Root>

        <Text fontSize="sm" color="text.secondary">
          Keep it short and specific so attendees can identify the event quickly.
        </Text>
      </Stack>

      <EventWizardActions
        backLabel="Cancel"
        nextLabel="Continue"
        onBack={() => navigate(APP_ROUTES.events)}
        onNext={handleNext}
      />
    </Stack>
  )
}
