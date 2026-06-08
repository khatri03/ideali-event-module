import { Field, Stack, Text } from "@chakra-ui/react"
import { useFormContext } from "react-hook-form"
import { EventDescriptionEditor } from "../components/EventDescriptionEditor"
import { StepFieldLabel } from "../components/StepFieldLabel"
import type { EventWizardValues } from "../schemas/eventWizard.schemas"

export function EventTermsConditionsStepPage() {
  const { setValue, watch } = useFormContext<EventWizardValues>()
  const termsConditions = watch("termsConditions")

  return (
    <Stack h="full" gap={4}>
      <Stack flex="1" gap={4}>
        <Field.Root>
          <StepFieldLabel label="Terms & Conditions" />
          <EventDescriptionEditor
            value={termsConditions}
            placeholder="Write the rules, refund policy, and attendee expectations..."
            onChange={(value) =>
              setValue("termsConditions", value, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
            }
          />
          <Field.HelperText>Optional. You can skip this step and add the terms later.</Field.HelperText>
        </Field.Root>

        <Text fontSize="sm" color="text.secondary">
          Use this space for participation rules, refund policy, attendee expectations, and any legal or operational
          notes your team needs to keep visible.
        </Text>
      </Stack>
    </Stack>
  )
}
