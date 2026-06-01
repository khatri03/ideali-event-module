import { Field, Stack, Text } from "@chakra-ui/react"
import { useFormContext } from "react-hook-form"
import { StyledSelect } from "@/components/common"
import { StepFieldLabel } from "../components/StepFieldLabel"
import type { EventWizardValues } from "../schemas/eventWizard.schemas"

const TIME_ZONE_OPTIONS = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "America/New York" },
  { value: "America/Chicago", label: "America/Chicago" },
  { value: "America/Denver", label: "America/Denver" },
  { value: "America/Los_Angeles", label: "America/Los Angeles" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "Europe/Paris", label: "Europe/Paris" },
  { value: "Europe/Berlin", label: "Europe/Berlin" },
  { value: "Asia/Dubai", label: "Asia/Dubai" },
  { value: "Asia/Karachi", label: "Asia/Karachi" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata" },
  { value: "Asia/Singapore", label: "Asia/Singapore" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo" },
  { value: "Australia/Sydney", label: "Australia/Sydney" },
]

export function EventTimeZoneStepPage() {
  const { setValue, watch } = useFormContext<EventWizardValues>()
  const timeZone = watch("timeZone")

  return (
    <Stack h="full" gap={4}>
      <Stack flex="1" gap={4}>
        <Field.Root>
          <StepFieldLabel label="Time zone" isRequired />
          <StyledSelect
            options={TIME_ZONE_OPTIONS}
            value={timeZone}
            onChange={(value) => setValue("timeZone", value, { shouldValidate: true })}
            placeholder="Select a time zone"
          />
          <Field.HelperText>This will anchor your schedule and review steps to a single regional context.</Field.HelperText>
        </Field.Root>

        <Text fontSize="sm" color="text.secondary">
          We prefill your browser time zone at first load so you do not need to choose it manually every time.
        </Text>
      </Stack>
    </Stack>
  )
}
