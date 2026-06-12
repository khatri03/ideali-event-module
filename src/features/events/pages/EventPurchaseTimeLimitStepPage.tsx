import { Controller, useFormContext, useWatch } from "react-hook-form"
import { Field, Input, Stack, Text } from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { fetchEventWizardVisibilityOptions } from "@/api/events"
import { StyledSelect } from "@/components/common"
import { StepFieldLabel } from "../components/StepFieldLabel"
import type { EventWizardValues } from "../schemas/eventWizard.schemas"

export function EventPurchaseTimeLimitStepPage() {
  const { control, register } = useFormContext<EventWizardValues>()
  const visibilityValue = useWatch({ control, name: "visibility" })
  const visibilityQuery = useQuery({
    queryKey: ["events", "visibility-options"],
    queryFn: fetchEventWizardVisibilityOptions,
    retry: false,
  })
  const visibilityOptions = visibilityQuery.data ?? []
  const selectedVisibility = visibilityOptions.find((option) => option.value === visibilityValue)

  return (
    <Stack h="full" gap={6}>
      <Stack flex="1" gap={6}>
        <Field.Root>
          <StepFieldLabel label="Visibility" />
          <Stack gap={4}>
            <Controller
              control={control}
              name="visibility"
              render={({ field }) => (
                <StyledSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={visibilityOptions}
                  placeholder={visibilityQuery.isLoading ? "Loading visibility options..." : "Select visibility"}
                  disabled={visibilityQuery.isLoading}
                />
              )}
            />
            <Field.HelperText>
              Choose who can discover and register for the event. The backend returns both the raw enum value and a readable label.
            </Field.HelperText>
            {selectedVisibility ? (
              <Text fontSize="sm" color="text.secondary">
                {selectedVisibility.description}
              </Text>
            ) : null}
          </Stack>
        </Field.Root>

        <Field.Root>
          <StepFieldLabel label="Purchase time limit" />
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
