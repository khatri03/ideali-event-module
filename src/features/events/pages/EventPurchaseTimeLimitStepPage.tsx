import { Controller, useFormContext, useWatch } from "react-hook-form"
import { Field, Stack, Text } from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import {
  fetchEventWizardPurchaseTimeLimitOptions,
  fetchEventWizardVisibilityOptions,
} from "@/api/events"
import { StyledSelect } from "@/components/common"
import { StepFieldLabel } from "../components/StepFieldLabel"
import type { EventWizardValues } from "../schemas/eventWizard.schemas"

export function EventPurchaseTimeLimitStepPage() {
  const { control } = useFormContext<EventWizardValues>()
  const visibilityValue = useWatch({ control, name: "visibility" })
  const purchaseTimeLimitValue = useWatch({ control, name: "purchaseTimeLimitMinutes" })

  const visibilityQuery = useQuery({
    queryKey: ["events", "visibility-options"],
    queryFn: fetchEventWizardVisibilityOptions,
    retry: false,
  })

  const purchaseTimeLimitQuery = useQuery({
    queryKey: ["events", "purchase-time-limit-options"],
    queryFn: fetchEventWizardPurchaseTimeLimitOptions,
    retry: false,
  })

  const visibilityOptions = visibilityQuery.data ?? []
  const purchaseTimeLimitOptions = purchaseTimeLimitQuery.data ?? []
  const selectedVisibility = visibilityOptions.find((option) => option.value === visibilityValue)
  const selectedPurchaseTimeLimit = purchaseTimeLimitOptions.find((option) => option.value === String(purchaseTimeLimitValue ?? ""))

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
          <StepFieldLabel label="Purchase time limit (minutes)" />
          <Stack gap={4}>
            <Controller
              control={control}
              name="purchaseTimeLimitMinutes"
              render={({ field }) => (
                <StyledSelect
                  value={field.value ? String(field.value) : ""}
                  onChange={(value) => field.onChange(value ? Number(value) : undefined)}
                  options={purchaseTimeLimitOptions}
                  placeholder={purchaseTimeLimitQuery.isLoading ? "Loading purchase time limits..." : "Select purchase time limit"}
                  disabled={purchaseTimeLimitQuery.isLoading}
                />
              )}
            />
            <Field.HelperText>
              Choose when sales should close before the event starts. The available values come from the backend in 5-minute increments.
            </Field.HelperText>
            {selectedPurchaseTimeLimit ? (
              <Text fontSize="sm" color="text.secondary">
                {selectedPurchaseTimeLimit.description}
              </Text>
            ) : null}
          </Stack>
        </Field.Root>
      </Stack>
    </Stack>
  )
}
