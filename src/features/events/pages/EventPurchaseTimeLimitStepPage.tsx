import { Field, Input, Stack, Text } from "@chakra-ui/react"
import { useFormContext } from "react-hook-form"
import { StepFieldLabel } from "../components/StepFieldLabel"
import type { EventWizardValues } from "../schemas/eventWizard.schemas"

export function EventPurchaseTimeLimitStepPage() {
  const { register } = useFormContext<EventWizardValues>()

  return (
    <Stack h="full" gap={4}>
      <Stack flex="1" gap={4}>
        <Field.Root>
          <StepFieldLabel label="Advanced settings" />
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
    </Stack>
  )
}
