import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Box, Flex, Skeleton, Stack, Switch, Text } from "@chakra-ui/react"
import { extractApiError } from "@/utils/errors"
import { fetchSessionWizardETicketing, updateSessionWizardETicketing, type SessionWizardETicketing } from "@/api/sessions"
import { useSessionWizardActions } from "../hooks/useSessionWizardActions"

interface SessionETicketingStepProps {
  sessionId: string
}

function ETicketingOptionCard({
  title,
  description,
  checked,
  disabled = false,
  onCheckedChange,
}: {
  title: string
  description: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <Flex
      direction="column"
      gap={2}
      border="1px solid"
      borderColor="gray.200"
      borderRadius="18px"
      bg="white"
      boxShadow="0 10px 28px rgba(15, 23, 42, 0.05)"
      px={5}
      py={4}
    >
      <Flex align="center" justify="space-between" gap={4}>
        <Box minW={0}>
          <Text fontSize="sm" fontWeight="800" color="gray.900">
            {title}
          </Text>
          <Text mt={0.5} fontSize="sm" color="gray.600">
            {description}
          </Text>
        </Box>

        <Switch.Root
          checked={checked}
          disabled={disabled}
          onCheckedChange={(details) => {
            if (disabled) {
              return
            }

            onCheckedChange(Boolean(details.checked))
          }}
          colorPalette="brand"
        >
          <Switch.HiddenInput />
          <Switch.Control />
        </Switch.Root>
      </Flex>
    </Flex>
  )
}

function SessionETicketingSkeleton() {
  return (
    <Stack gap={5}>
      <Skeleton height="18px" width="180px" borderRadius="999px" />
      <Skeleton height="44px" width="320px" borderRadius="16px" />
      <Skeleton height="44px" width="280px" borderRadius="16px" />
      <Skeleton height="180px" borderRadius="18px" />
    </Stack>
  )
}

export function SessionETicketingStep({ sessionId }: SessionETicketingStepProps) {
  const queryClient = useQueryClient()
  const { setPrimaryAction, setPrimaryActionReady } = useSessionWizardActions()
  const [draftTicketing, setDraftTicketing] = useState<SessionWizardETicketing | null>(null)

  const ticketingQuery = useQuery({
    queryKey: ["sessions", "review", sessionId, "e-ticketing"],
    queryFn: () => fetchSessionWizardETicketing(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: SessionWizardETicketing) => updateSessionWizardETicketing(sessionId, payload),
    onSuccess: async (data) => {
      setDraftTicketing(null)
      queryClient.setQueryData(["sessions", "review", sessionId, "e-ticketing"], data)
      queryClient.setQueryData(["sessions", "wizard-progress", sessionId], (current: { stepNo?: number } | undefined) => ({
        stepNo: Math.max(current?.stepNo ?? 0, 9),
      }))
    },
    onSettled: () => {
      setPrimaryActionReady(true)
    },
  })

  const currentTicketing = draftTicketing ?? ticketingQuery.data ?? {
    enableDigitalTicket: false,
    requiresAttendeeInfo: false,
  }

  useEffect(() => {
    if (!ticketingQuery.isSuccess || !ticketingQuery.data) {
      setPrimaryAction(null)
      setPrimaryActionReady(false)
      return
    }

    setPrimaryAction(async () => {
      setPrimaryActionReady(false)
      await updateMutation.mutateAsync({
        enableDigitalTicket: currentTicketing.enableDigitalTicket,
        requiresAttendeeInfo: currentTicketing.requiresAttendeeInfo,
      })
    })
    setPrimaryActionReady(true)

    return () => {
      setPrimaryAction(null)
      setPrimaryActionReady(true)
    }
  }, [
    currentTicketing.enableDigitalTicket,
    currentTicketing.requiresAttendeeInfo,
    setPrimaryAction,
    setPrimaryActionReady,
    ticketingQuery.data,
    ticketingQuery.isSuccess,
    updateMutation,
    updateMutation.mutateAsync,
  ])

  return (
    <Stack gap={5}>
      <Box
        border="1px solid"
        borderColor="gray.200"
        borderRadius="20px"
        bg="linear-gradient(135deg, rgba(117,81,255,0.05) 0%, rgba(66,42,251,0.03) 100%)"
        p={{ base: 4, md: 5 }}
      >
        <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
          e-Ticketing
        </Text>
        <Text mt={2} fontSize={{ base: "sm", md: "md" }} fontWeight="700" color="gray.800">
          Control whether this session uses digital tickets and whether attendee details are required.
        </Text>
      </Box>

      {ticketingQuery.isLoading ? (
        <SessionETicketingSkeleton />
      ) : (
        <Stack gap={4}>
          <ETicketingOptionCard
            title="Enable digital ticket"
            description="Allow the session to issue digital tickets for attendees."
            checked={currentTicketing.enableDigitalTicket}
            onCheckedChange={(checked) =>
              setDraftTicketing((current) => ({
                ...(current ?? currentTicketing),
                enableDigitalTicket: checked,
                requiresAttendeeInfo: current?.requiresAttendeeInfo ?? currentTicketing.requiresAttendeeInfo,
              }))
            }
          />
          <ETicketingOptionCard
            title="Require attendee info"
            description="Collect attendee information while issuing e-tickets."
            checked={currentTicketing.requiresAttendeeInfo}
            disabled={!currentTicketing.enableDigitalTicket}
            onCheckedChange={(checked) =>
              setDraftTicketing((current) => ({
                ...(current ?? currentTicketing),
                requiresAttendeeInfo: checked,
              }))
            }
          />
        </Stack>
      )}

      {ticketingQuery.isError ? (
        <Text fontSize="sm" color="red.500">
          {extractApiError(ticketingQuery.error)}
        </Text>
      ) : null}

      {updateMutation.isError ? (
        <Text fontSize="sm" color="red.500">
          {extractApiError(updateMutation.error)}
        </Text>
      ) : null}
    </Stack>
  )
}
