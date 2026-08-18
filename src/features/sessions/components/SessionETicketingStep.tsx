import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Box, Flex, Input, NativeSelect, Skeleton, Stack, Switch, Text } from "@chakra-ui/react"
import { extractApiError } from "@/utils/errors"
import { fetchSessionWizardETicketing, updateSessionWizardETicketing, type SessionWizardETicketing } from "@/api/sessions"
import { getSessionWizardStepNumber } from "../hooks/useSessionWizard"
import { useSessionWizardActions } from "../hooks/useSessionWizardActions"

interface SessionETicketingStepProps {
  sessionId: string
}

const DEFAULT_TICKETING: SessionWizardETicketing = {
  enableDigitalTicket: true,
  requiresAttendeeInfo: true,
  checkInOpensBeforeMinutes: null,
  checkInClosesAfterMinutes: null,
}

const MAX_CHECK_IN_WINDOW_MINUTES = 10080
const PLATFORM_DEFAULT_CHOICE = "default"
const CUSTOM_CHOICE = "custom"

/** The round values an organizer actually picks. Anything else is typed into the custom field. */
const OPENS_BEFORE_PRESETS = [15, 30, 60, 120, 240, 480, 1440]
const CLOSES_AFTER_PRESETS = [15, 30, 60, 120, 180, 360, 1440]

function isCheckInWindowValueValid(value: number | null) {
  return value === null || (Number.isInteger(value) && value >= 0 && value <= MAX_CHECK_IN_WINDOW_MINUTES)
}

function describeMinutes(minutes: number) {
  if (minutes % 1440 === 0) {
    const days = minutes / 1440
    return days === 1 ? "1 day" : `${days} days`
  }

  if (minutes % 60 === 0) {
    const hours = minutes / 60
    return hours === 1 ? "1 hour" : `${hours} hours`
  }

  return `${minutes} minutes`
}

function resolveWindowChoice(value: number | null, isCustom: boolean) {
  if (isCustom) {
    return CUSTOM_CHOICE
  }

  return value === null ? PLATFORM_DEFAULT_CHOICE : String(value)
}

/** A thousand-seat hall has to open its doors far earlier than a hundred-seat room. */
function CheckInWindowField({
  label,
  presets,
  defaultLabel,
  helperText,
  value,
  onValueChange,
}: {
  label: string
  presets: number[]
  defaultLabel: string
  helperText: string
  value: number | null
  onValueChange: (value: number | null) => void
}) {
  const [isCustom, setIsCustom] = useState(value !== null && !presets.includes(value))
  const isOutOfRange = !isCheckInWindowValueValid(value)

  function handleChoiceChange(choice: string) {
    setIsCustom(choice === CUSTOM_CHOICE)

    if (choice === CUSTOM_CHOICE) {
      return
    }

    onValueChange(choice === PLATFORM_DEFAULT_CHOICE ? null : Number(choice))
  }

  return (
    <Stack gap={1.5} flex="1" minW={0}>
      <Text fontSize="sm" fontWeight="700" color="gray.800">
        {label}
      </Text>

      <NativeSelect.Root>
        <NativeSelect.Field
          aria-label={label}
          value={resolveWindowChoice(value, isCustom)}
          minH="11"
          borderRadius="14px"
          ps={4}
          pe={10}
          py={2}
          cursor="pointer"
          onChange={(event) => handleChoiceChange(event.target.value)}
        >
          <option value={PLATFORM_DEFAULT_CHOICE}>{defaultLabel}</option>
          {presets.map((minutes) => (
            <option key={minutes} value={String(minutes)}>
              {describeMinutes(minutes)}
            </option>
          ))}
          <option value={CUSTOM_CHOICE}>Custom</option>
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>

      {isCustom ? (
        <Input
          type="number"
          min={0}
          max={MAX_CHECK_IN_WINDOW_MINUTES}
          value={value === null ? "" : String(value)}
          placeholder="Minutes"
          aria-label={`${label} in minutes`}
          minH="11"
          borderRadius="14px"
          px={4}
          py={2}
          onChange={(event) => {
            const raw = event.target.value.trim()
            onValueChange(raw === "" ? null : Number(raw))
          }}
        />
      ) : null}

      <Text fontSize="xs" color={isOutOfRange ? "red.500" : "gray.600"}>
        {isOutOfRange ? `Enter a whole number between 0 and ${MAX_CHECK_IN_WINDOW_MINUTES} minutes.` : helperText}
      </Text>
    </Stack>
  )
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
        stepNo: Math.max(current?.stepNo ?? 0, getSessionWizardStepNumber("e-ticketing")),
      }))
    },
    onSettled: () => {
      setPrimaryActionReady(true)
    },
  })

  const currentTicketing = draftTicketing ?? ticketingQuery.data ?? DEFAULT_TICKETING
  const isCheckInWindowValid =
    isCheckInWindowValueValid(currentTicketing.checkInOpensBeforeMinutes) &&
    isCheckInWindowValueValid(currentTicketing.checkInClosesAfterMinutes)

  useEffect(() => {
    if (!ticketingQuery.isSuccess || !ticketingQuery.data || !isCheckInWindowValid) {
      setPrimaryAction(null)
      setPrimaryActionReady(false)
      return
    }

    setPrimaryAction(async () => {
      setPrimaryActionReady(false)
      await updateMutation.mutateAsync({
        enableDigitalTicket: currentTicketing.enableDigitalTicket,
        requiresAttendeeInfo: currentTicketing.requiresAttendeeInfo,
        checkInOpensBeforeMinutes: currentTicketing.checkInOpensBeforeMinutes,
        checkInClosesAfterMinutes: currentTicketing.checkInClosesAfterMinutes,
      })
    })
    setPrimaryActionReady(true)

    return () => {
      setPrimaryAction(null)
      setPrimaryActionReady(true)
    }
  }, [
    isCheckInWindowValid,
    currentTicketing.checkInClosesAfterMinutes,
    currentTicketing.checkInOpensBeforeMinutes,
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

          <Stack
            gap={4}
            border="1px solid"
            borderColor="gray.200"
            borderRadius="18px"
            bg="white"
            boxShadow="0 10px 28px rgba(15, 23, 42, 0.05)"
            px={5}
            py={4}
          >
            <Box>
              <Text fontSize="sm" fontWeight="800" color="gray.900">
                Check-in window
              </Text>
              <Text mt={0.5} fontSize="sm" color="gray.600">
                How long the door admits either side of this session. Leave both on the platform default unless this session needs its own.
              </Text>
            </Box>

            <Stack direction={{ base: "column", md: "row" }} gap={4}>
              <CheckInWindowField
                label="Opens before start"
                presets={OPENS_BEFORE_PRESETS}
                defaultLabel="Platform default (2 hours)"
                helperText="Doors open this long before the session starts."
                value={currentTicketing.checkInOpensBeforeMinutes}
                onValueChange={(value) =>
                  setDraftTicketing((current) => ({
                    ...(current ?? currentTicketing),
                    checkInOpensBeforeMinutes: value,
                  }))
                }
              />
              <CheckInWindowField
                label="Closes after end"
                presets={CLOSES_AFTER_PRESETS}
                defaultLabel="Platform default (3 hours)"
                helperText="Doors stay open this long after the session ends."
                value={currentTicketing.checkInClosesAfterMinutes}
                onValueChange={(value) =>
                  setDraftTicketing((current) => ({
                    ...(current ?? currentTicketing),
                    checkInClosesAfterMinutes: value,
                  }))
                }
              />
            </Stack>
          </Stack>
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
