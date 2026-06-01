import { Field, Stack, Text } from "@chakra-ui/react"
import { useFormContext } from "react-hook-form"
import { StyledSelect } from "@/components/common"
import { auth } from "@/lib/auth"
import { EventWizardActions } from "../components/EventWizardActions"
import { useEventWizardNavigation } from "../hooks/useEventWizard"
import { eventWizardFieldGroups, type EventWizardValues } from "../schemas/eventWizard.schemas"

export function EventPaymentAccountStepPage() {
  const { setValue, trigger, watch } = useFormContext<EventWizardValues>()
  const { goBack, goNext } = useEventWizardNavigation()
  const organizer = auth.getOrganizer()
  const paymentAccounts = organizer?.paymentAccounts ?? []
  const paymentAccountOptions = paymentAccounts.map((account) => ({
    label: account.name,
    value: account.uniqueId,
  }))
  const paymentAccountId = watch("paymentAccountId")
  const hasPaymentAccounts = paymentAccountOptions.length > 0

  async function handleNext() {
    const isValid = await trigger(eventWizardFieldGroups.paymentAccount)
    if (isValid) {
      goNext()
    }
  }

  return (
    <Stack h="full" gap={4}>
      <Stack flex="1" gap={4}>
        <Field.Root invalid={!hasPaymentAccounts}>
          <Field.Label>Payment account</Field.Label>
          <StyledSelect
            options={paymentAccountOptions}
            value={paymentAccountId}
            onChange={(value) => setValue("paymentAccountId", value, { shouldValidate: true })}
            placeholder="Select a payment account"
            disabled={!hasPaymentAccounts}
          />
          {hasPaymentAccounts ? (
            <Field.HelperText>Select the organizer account that will receive payment details for this event.</Field.HelperText>
          ) : (
            <Field.ErrorText>No payment accounts are connected yet. Add one in your organizer settings before continuing.</Field.ErrorText>
          )}
        </Field.Root>

        <Text fontSize="sm" color="text.secondary">
          This selection stays attached to the event so every later step can reuse the same billing target.
        </Text>
      </Stack>

      <EventWizardActions
        backLabel="Back"
        nextLabel="Continue"
        isNextDisabled={!hasPaymentAccounts || !paymentAccountId}
        onBack={goBack}
        onNext={handleNext}
      />
    </Stack>
  )
}
