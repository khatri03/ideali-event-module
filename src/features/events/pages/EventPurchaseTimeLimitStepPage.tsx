import { Field, Input, Stack, Text } from "@chakra-ui/react"
import { useFormContext } from "react-hook-form"
import { EventWizardActions } from "../components/EventWizardActions"
import { useEventWizardNavigation } from "../hooks/useEventWizard"
import type { EventWizardValues } from "../schemas/eventWizard.schemas"

export function EventPurchaseTimeLimitStepPage() {
  const { register } = useFormContext<EventWizardValues>()
  const { goBack, goNext } = useEventWizardNavigation()

  return (
    <Stack h="full" gap={4}>
      <Stack flex="1" gap={4}>
        <Field.Root>
          <Field.Label>Advanced settings</Field.Label>
          <Input
            type="number"
            placeholder="e.g. 24"
            min={1}
            max={8760}
            {...register("purchaseTimeLimitHours", {
              setValueAs: (value) => {
                if (value === "" || value === null || value === undefined) {
                  return undefined
                }

                const parsed = Number(value)
                return Number.isNaN(parsed) ? undefined : parsed
              },
            })}
          />
          <Field.HelperText>Optional. Enter the number of hours before the event when purchases close.</Field.HelperText>
        </Field.Root>

        <Text fontSize="sm" color="text.secondary">
          Leave this blank if you want sales to stay open until the event rules are defined later.
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
