import { Field, Skeleton, Stack, Text } from "@chakra-ui/react"
import { useEffect, useMemo } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { StyledSelect } from "@/components/common"
import { fetchEventWizardTimeZones } from "@/api/events"
import { formatUtcOffset, stripUtcPrefix } from "@/utils/timeZone"
import { StepFieldLabel } from "../components/StepFieldLabel"
import type { EventWizardValues } from "../schemas/eventWizard.schemas"
import { useQuery } from "@tanstack/react-query"

export function EventTimeZoneStepPage() {
  const { setValue, control } = useFormContext<EventWizardValues>()
  const timeZoneId = useWatch({ control, name: "timeZoneId" })

  const timeZonesQuery = useQuery({
    queryKey: ["events", "time-zones"],
    queryFn: fetchEventWizardTimeZones,
    staleTime: 1000 * 60 * 60,
  })

  const timeZoneOptions = useMemo(
    () =>
      (timeZonesQuery.data ?? []).map((timeZone) => ({
        value: String(timeZone.id),
        label: `${formatUtcOffset(timeZone.baseUtcOffsetMinutes)} ${stripUtcPrefix(timeZone.displayName)}`,
      })),
    [timeZonesQuery.data],
  )

  const selectedTimeZone = useMemo(() => {
    const availableTimeZones = timeZonesQuery.data ?? []
    return availableTimeZones.find((item) => item.id === timeZoneId) ?? null
  }, [timeZoneId, timeZonesQuery.data])

  useEffect(() => {
    if (!timeZonesQuery.data?.length) {
      return
    }

    if (timeZoneId) {
      const currentSelection = timeZonesQuery.data.find((item) => item.id === timeZoneId)
      if (currentSelection) {
        setValue("timeZone", currentSelection.displayName, { shouldDirty: false, shouldTouch: false, shouldValidate: false })
      }
      return
    }

    const browserOffsetMinutes = -new Date().getTimezoneOffset()
    const matchedTimeZone =
      timeZonesQuery.data.find((item) => item.baseUtcOffsetMinutes === browserOffsetMinutes) ?? timeZonesQuery.data[0]

    if (matchedTimeZone) {
      setValue("timeZoneId", matchedTimeZone.id, { shouldDirty: false, shouldTouch: false, shouldValidate: false })
      setValue("timeZone", matchedTimeZone.displayName, { shouldDirty: false, shouldTouch: false, shouldValidate: false })
    }
  }, [setValue, timeZoneId, timeZonesQuery.data])

  return (
    <Stack h="full" gap={4}>
      <Stack flex="1" gap={4}>
        <Field.Root invalid={timeZonesQuery.isError}>
          <StepFieldLabel label="Time zone" />

          {timeZonesQuery.isLoading ? (
            <Skeleton height="44px" borderRadius="16px" />
          ) : (
            <StyledSelect
              options={timeZoneOptions}
              value={timeZoneId ? String(timeZoneId) : ""}
              onChange={(value) => {
                const selected = (timeZonesQuery.data ?? []).find((item) => String(item.id) === value)
                setValue("timeZoneId", selected?.id, { shouldDirty: true, shouldValidate: false })
                setValue("timeZone", selected?.displayName ?? "", { shouldDirty: true, shouldValidate: false })
              }}
              placeholder="Select a time zone"
              disabled={timeZonesQuery.isLoading}
            />
          )}

          <Field.HelperText>
            Time zones come from the backend and each option shows its UTC difference.
          </Field.HelperText>
        </Field.Root>

        {selectedTimeZone ? (
          <Text fontSize="sm" color="text.secondary">
            Selected: {formatUtcOffset(selectedTimeZone.baseUtcOffsetMinutes)} {stripUtcPrefix(selectedTimeZone.displayName)}
          </Text>
        ) : (
          <Text fontSize="sm" color="text.secondary">
            We default to a matching UTC offset from your browser when possible.
          </Text>
        )}

        {timeZonesQuery.isError ? (
          <Text fontSize="sm" color="red.500">
            We could not load the available time zones.
          </Text>
        ) : null}
      </Stack>
    </Stack>
  )
}
