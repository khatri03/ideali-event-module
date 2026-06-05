import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Badge, Box, Button, Flex, SimpleGrid, Skeleton, Stack, Switch, Text } from "@chakra-ui/react"
import { CheckCircle2, PencilLine } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { format, parseISO } from "date-fns"
import { fetchOrganizerEvents, fetchOrganizerVenues } from "@/api/organizer"
import {
  fetchSessionWizardBooking,
  fetchSessionWizardDuration,
  fetchSessionWizardEvent,
  fetchSessionWizardName,
  fetchSessionWizardSchedule,
  fetchSessionWizardTickets,
  fetchSessionWizardVenue,
  markSessionWizardReadyForReview,
  updateSessionWizardSetupState,
  type SessionWizardSetupState,
} from "@/api/sessions"
import { APP_ROUTES } from "@/utils/routes"
import { extractApiError } from "@/utils/errors"
import { useSessionWizardActions } from "../hooks/useSessionWizardActions"

interface SessionReviewStepProps {
  sessionId: string
}

interface ReviewItemProps {
  label: string
  value: string | number | null | undefined
  onEdit: () => void
  editLabel: string
  isLoading?: boolean
  isBadge?: boolean
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not set"
  }

  return format(parseISO(value), "dd-MMM-yyyy hh:mm aa")
}

function formatRange(startDateTime: string | null | undefined, endDateTime: string | null | undefined) {
  if (!startDateTime && !endDateTime) {
    return "Not set"
  }

  return `${formatDateTime(startDateTime)} to ${formatDateTime(endDateTime)}`
}

function ReviewItem({ label, value, onEdit, editLabel, isLoading = false, isBadge = false }: ReviewItemProps) {
  return (
    <Box
      border="1px solid"
      borderColor="gray.200"
      borderRadius="20px"
      bg="gray.50"
      px={4}
      py={4}
      boxShadow="0 10px 24px rgba(15, 23, 42, 0.04)"
    >
      <Flex align="flex-start" justify="space-between" gap={4}>
        <Stack gap={1} minW={0} flex={1}>
          <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
            {label}
          </Text>
          {isLoading ? (
            <Skeleton h="20px" w="220px" borderRadius="8px" />
          ) : isBadge ? (
            <Badge
              alignSelf="flex-start"
              variant="subtle"
              colorPalette={String(value).toLowerCase() === "check" ? "green" : "gray"}
              borderRadius="999px"
              px={3}
              py={1}
            >
              <Flex align="center" gap={1.5}>
                <CheckCircle2 size={14} />
                <Text as="span" fontSize="xs" fontWeight="800">
                  {value}
                </Text>
              </Flex>
            </Badge>
          ) : (
            <Text fontSize="sm" fontWeight="700" color="gray.900" lineClamp={2} wordBreak="break-word">
              {value ?? "Not set"}
            </Text>
          )}
        </Stack>

        <Button
          variant="outline"
          borderRadius="full"
          h="40px"
          w="40px"
          minW="40px"
          p={0}
          aria-label={editLabel}
          onClick={onEdit}
        >
          <PencilLine size={15} />
        </Button>
      </Flex>
    </Box>
  )
}

function ReviewLoadingState() {
  return (
    <Stack gap={4}>
      <Skeleton h="96px" borderRadius="24px" />
      <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
        <Skeleton h="116px" borderRadius="20px" />
        <Skeleton h="116px" borderRadius="20px" />
        <Skeleton h="116px" borderRadius="20px" />
        <Skeleton h="116px" borderRadius="20px" />
        <Skeleton h="116px" borderRadius="20px" />
        <Skeleton h="116px" borderRadius="20px" />
        <Skeleton h="116px" borderRadius="20px" />
      </SimpleGrid>
    </Stack>
  )
}

export function SessionReviewStep({ sessionId }: SessionReviewStepProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { setPrimaryAction, setPrimaryActionReady } = useSessionWizardActions()
  const [isReadyForSale, setIsReadyForSale] = useState(false)
  const [isInitialised, setIsInitialised] = useState(false)
  const requestedSetupStateSessionIdRef = useRef<string | null>(null)

  const reviewReturnUrl = useMemo(() => `${location.pathname}${location.search}`, [location.pathname, location.search])

  const setupStateMutation = useMutation({
    mutationFn: () => markSessionWizardReadyForReview(sessionId),
    onSuccess: (data) => {
      setIsReadyForSale(data.setupState === "ReadyForSale")
      setIsInitialised(true)
      setPrimaryActionReady(true)
    },
    onError: () => {
      setIsReadyForSale(false)
      setIsInitialised(true)
      setPrimaryActionReady(true)
    },
  })

  const finishMutation = useMutation<SessionWizardSetupState, Error, "ReadyForReview" | "ReadyForSale">({
    mutationFn: (setupState) => updateSessionWizardSetupState(sessionId, { setupState }),
    onSuccess: async (data) => {
      setIsReadyForSale(data.setupState === "ReadyForSale")
      await queryClient.invalidateQueries({ queryKey: ["sessions", "wizard-progress", sessionId] })
    },
    onSettled: () => {
      setPrimaryActionReady(true)
    },
  })

  const nameQuery = useQuery({
    queryKey: ["sessions", "review", sessionId, "name"],
    queryFn: () => fetchSessionWizardName(sessionId),
    enabled: !!sessionId,
    retry: false,
  })
  const sessionEventQuery = useQuery({
    queryKey: ["sessions", "review", sessionId, "event"],
    queryFn: () => fetchSessionWizardEvent(sessionId),
    enabled: !!sessionId,
    retry: false,
  })
  const organizerEventsQuery = useQuery({
    queryKey: ["sessions", "review", sessionId, "organizer-events"],
    queryFn: fetchOrganizerEvents,
    enabled: !!sessionId,
    retry: false,
  })
  const sessionVenueQuery = useQuery({
    queryKey: ["sessions", "review", sessionId, "venue"],
    queryFn: () => fetchSessionWizardVenue(sessionId),
    enabled: !!sessionId,
    retry: false,
  })
  const organizerVenuesQuery = useQuery({
    queryKey: ["sessions", "review", sessionId, "organizer-venues"],
    queryFn: fetchOrganizerVenues,
    enabled: !!sessionId,
    retry: false,
  })
  const bookingQuery = useQuery({
    queryKey: ["sessions", "review", sessionId, "booking"],
    queryFn: () => fetchSessionWizardBooking(sessionId),
    enabled: !!sessionId,
    retry: false,
  })
  const durationQuery = useQuery({
    queryKey: ["sessions", "review", sessionId, "duration"],
    queryFn: () => fetchSessionWizardDuration(sessionId),
    enabled: !!sessionId,
    retry: false,
  })
  const schedulesQuery = useQuery({
    queryKey: ["sessions", "review", sessionId, "schedule"],
    queryFn: () => fetchSessionWizardSchedule(sessionId),
    enabled: !!sessionId,
    retry: false,
  })
  const ticketsQuery = useQuery({
    queryKey: ["sessions", "review", sessionId, "ticket"],
    queryFn: () => fetchSessionWizardTickets(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  useEffect(() => {
    if (requestedSetupStateSessionIdRef.current === sessionId) {
      return
    }

    requestedSetupStateSessionIdRef.current = sessionId
    setPrimaryActionReady(false)
    setupStateMutation.mutate()

    return () => {
      setPrimaryAction(null)
      setPrimaryActionReady(true)
    }
  }, [sessionId, setPrimaryAction, setPrimaryActionReady, setupStateMutation])

  useEffect(() => {
    if (!isInitialised) {
      return
    }

    setPrimaryAction(async () => {
      try {
        setPrimaryActionReady(false)
        await finishMutation.mutateAsync(isReadyForSale ? "ReadyForSale" : "ReadyForReview")
      } catch {
        // Finish path keeps inline state visible for the user.
      }
    })
  }, [finishMutation, isInitialised, isReadyForSale, setPrimaryAction, setPrimaryActionReady])

  const eventUniqueId = sessionEventQuery.data?.eventUniqueId ?? ""
  const venueUniqueId = sessionVenueQuery.data?.venueUniqueId ?? ""
  const eventName = organizerEventsQuery.data?.find((item) => item.uniqueId === eventUniqueId)?.name || "Not set"
  const venueName = organizerVenuesQuery.data?.find((item) => item.uniqueId === venueUniqueId)?.name || "Not set"
  const bookingWindow = formatRange(bookingQuery.data?.bookingStartDate, bookingQuery.data?.bookingEndDate)
  const sessionDateTime = formatRange(durationQuery.data?.startDate, durationQuery.data?.endDate)
  const scheduleCount = schedulesQuery.data?.length ?? 0
  const ticketsCount = ticketsQuery.data?.length ?? 0
  const summaryError =
    nameQuery.error ??
    sessionEventQuery.error ??
    organizerEventsQuery.error ??
    sessionVenueQuery.error ??
    organizerVenuesQuery.error ??
    bookingQuery.error ??
    durationQuery.error ??
    schedulesQuery.error ??
    ticketsQuery.error

  const isLoading =
    setupStateMutation.isPending ||
    nameQuery.isLoading ||
    sessionEventQuery.isLoading ||
    organizerEventsQuery.isLoading ||
    sessionVenueQuery.isLoading ||
    organizerVenuesQuery.isLoading ||
    bookingQuery.isLoading ||
    durationQuery.isLoading ||
    schedulesQuery.isLoading ||
    ticketsQuery.isLoading

  function buildEditUrl(step: "name" | "event" | "venue" | "booking" | "start-end" | "schedule" | "ticket") {
    const target = APP_ROUTES.sessionWizard.editStep(sessionId, step)
    return `${target}?returnUrl=${encodeURIComponent(reviewReturnUrl)}`
  }

  function handleEdit(step: "name" | "event" | "venue" | "booking" | "start-end" | "schedule" | "ticket") {
    navigate(buildEditUrl(step))
  }

  return (
    <Stack gap={5}>
      <Box
        border="1px solid"
        borderColor="gray.200"
        borderRadius="24px"
        bg="linear-gradient(135deg, rgba(117,81,255,0.08) 0%, rgba(66,42,251,0.04) 100%)"
        px={{ base: 4, md: 5 }}
        py={{ base: 4, md: 5 }}
        boxShadow="0 14px 32px rgba(15, 23, 42, 0.05)"
      >
        <Flex align="center" justify="space-between" gap={4} wrap="wrap">
          <Stack gap={1}>
            <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
              Review
            </Text>
            <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="800" color="gray.900">
              Ready For Sale?
            </Text>
            <Text fontSize="sm" color="gray.600">
              Decide whether this session should be released for sale or remain in review.
            </Text>
          </Stack>

          <Switch.Root
            checked={isReadyForSale}
            onCheckedChange={(details) => setIsReadyForSale(Boolean(details.checked))}
            colorPalette="brand"
            disabled={!isInitialised || finishMutation.isPending || setupStateMutation.isPending}
          >
            <Switch.HiddenInput />
            <Switch.Control />
            <Switch.Label>
              <Text fontSize="sm" fontWeight="700" color="gray.900">
                Ready For Sale?
              </Text>
            </Switch.Label>
          </Switch.Root>
        </Flex>
      </Box>

      {setupStateMutation.isError ? (
        <Text fontSize="sm" color="red.500">
          {extractApiError(setupStateMutation.error)}
        </Text>
      ) : null}

      {finishMutation.isError ? (
        <Text fontSize="sm" color="red.500">
          {extractApiError(finishMutation.error)}
        </Text>
      ) : null}

      {summaryError ? (
        <Text fontSize="sm" color="red.500">
          {extractApiError(summaryError)}
        </Text>
      ) : null}

      {isLoading ? (
        <ReviewLoadingState />
      ) : (
        <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
          <ReviewItem
            label="Name"
            value={nameQuery.data?.name || "Not set"}
            onEdit={() => handleEdit("name")}
            editLabel="Edit session name"
          />
          <ReviewItem
            label="Event Name"
            value={eventName}
            onEdit={() => handleEdit("event")}
            editLabel="Edit event"
          />
          <ReviewItem
            label="Venue Name"
            value={venueName}
            onEdit={() => handleEdit("venue")}
            editLabel="Edit venue"
          />
          <ReviewItem
            label="Booking Window"
            value={bookingWindow}
            onEdit={() => handleEdit("booking")}
            editLabel="Edit booking window"
          />
          <ReviewItem
            label="Session Date Time"
            value={sessionDateTime}
            onEdit={() => handleEdit("start-end")}
            editLabel="Edit session date time"
          />
          <ReviewItem
            label="Schedule"
            value={scheduleCount > 0 ? "Check" : "Not set"}
            onEdit={() => handleEdit("schedule")}
            editLabel="Edit schedule"
            isBadge
          />
          <ReviewItem
            label="Number of tickets defined"
            value={ticketsCount}
            onEdit={() => handleEdit("ticket")}
            editLabel="Edit tickets"
          />
        </SimpleGrid>
      )}
    </Stack>
  )
}
