import { Badge, Box, Field, Flex, Stack, Text } from "@chakra-ui/react"
import { useMutation } from "@tanstack/react-query"
import { format } from "date-fns"
import { useNavigate } from "react-router-dom"
import type { ReactNode } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { createEvent } from "@/api/events"
import { auth } from "@/lib/auth"
import { queryClient } from "@/lib/queryClient"
import { APP_ROUTES } from "@/utils/routes"
import { EventWizardActions } from "../components/EventWizardActions"
import { buildCreateEventPayload, useEventWizardNavigation } from "../hooks/useEventWizard"
import { defaultEventWizardValues, type EventWizardValues } from "../schemas/eventWizard.schemas"

export function EventReviewStepPage() {
  const navigate = useNavigate()
  const { handleSubmit } = useFormContext<EventWizardValues>()
  const values = useWatch({ defaultValue: defaultEventWizardValues }) as EventWizardValues
  const { goBack } = useEventWizardNavigation()
  const organizer = auth.getOrganizer()
  const paymentAccount = organizer?.paymentAccounts?.find((account) => account.uniqueId === values.paymentAccountId)

  const createEventMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      navigate(APP_ROUTES.events, { replace: true })
    },
    onError: () => {
      // handled inline for the user on this screen
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] })
    },
  })

  async function handleCreate(formValues: EventWizardValues) {
    await createEventMutation.mutateAsync(buildCreateEventPayload(formValues))
  }

  return (
    <Stack h="full" gap={5}>
      <Stack flex="1" gap={5}>
        <Text fontSize="sm" color="text.secondary">
          Review the setup before creating the event. Hidden defaults will be applied to the remaining platform fields for now.
        </Text>

        <Stack gap={4}>
          <ReviewRow label="Name" value={values.name} />
          <ReviewRow label="Description" value={values.description || "No description provided"} />
          <ReviewRow label="Theme color" value={<ColorPill color={values.themeColor} />} />
          <ReviewRow label="Payment account" value={paymentAccount?.name || "Not selected"} />
          <ReviewRow
            label="Advanced settings"
            value={values.purchaseTimeLimitHours ? `${values.purchaseTimeLimitHours} hours before start` : "Not set"}
          />
          <ReviewRow label="Time zone" value={values.timeZone} />
          <ReviewRow
            label="Sessions"
            value={
              <Stack gap={2}>
                {values.sessions.map((session, index) => (
                  <Box key={`${session.title}-${index}`} p={3} borderRadius="16px" bg="app.bg" border="1px solid" borderColor="border.subtle">
                    <Text fontSize="sm" fontWeight="700" color="text.primary">
                      {session.title || `Session ${index + 1}`}
                    </Text>
                    <Text fontSize="sm" color="text.secondary">
                      {session.startsAt ? format(new Date(session.startsAt), "PPpp") : "Start time not set"} -{" "}
                      {session.endsAt ? format(new Date(session.endsAt), "PPpp") : "End time not set"}
                    </Text>
                  </Box>
                ))}
              </Stack>
            }
          />
        </Stack>

        {createEventMutation.isError && (
          <Field.Root invalid>
            <Field.ErrorText>We could not create the event. Please try again.</Field.ErrorText>
          </Field.Root>
        )}
      </Stack>

      <EventWizardActions
        backLabel="Back"
        nextLabel="Create Event"
        isLoading={createEventMutation.isPending}
        onBack={goBack}
        onNext={handleSubmit(handleCreate)}
      />
    </Stack>
  )
}

function ReviewRow({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <Flex
      direction={{ base: "column", md: "row" }}
      gap={3}
      p={4}
      borderRadius="18px"
      border="1px solid"
      borderColor="border.subtle"
      bg="app.bg"
      align={{ md: "center" }}
      justify="space-between"
    >
      <Text fontSize="sm" fontWeight="700" color="text.primary" minW={{ md: "180px" }}>
        {label}
      </Text>
      <Box flex={1} textAlign={{ md: "right" }}>
        {value}
      </Box>
    </Flex>
  )
}

function ColorPill({ color }: { color: string }) {
  return (
    <Badge
      borderRadius="999px"
      px={3}
      py={1}
      fontSize="sm"
      fontWeight="700"
      color="white"
      style={{ background: color }}
    >
      {color}
    </Badge>
  )
}
