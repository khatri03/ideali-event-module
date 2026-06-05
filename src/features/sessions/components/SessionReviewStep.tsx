import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Badge, Box, Button, Flex, Grid, Skeleton, Stack, Switch, Text } from "@chakra-ui/react"
import { CheckCircle2, PencilLine, X } from "lucide-react"
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
  value: ReactNode
  onEdit?: () => void
  editLabel: string
  isLoading?: boolean
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

function getSetupStateTheme(setupState: SessionWizardSetupState["setupState"]) {
  if (setupState === "ReadyForSale") {
    return {
      colorPalette: "green" as const,
      label: "Ready for sale",
    }
  }

  if (setupState === "ReadyForReview") {
    return {
      colorPalette: "orange" as const,
      label: "Ready for review",
    }
  }

  return {
    colorPalette: "gray" as const,
    label: "Incomplete",
  }
}

function ReviewItem({ label, value, onEdit, editLabel, isLoading = false }: ReviewItemProps) {
  return (
    <Grid
      templateColumns={{ base: "1fr", md: "220px minmax(0, 1fr) auto" }}
      alignItems={{ base: "start", md: "stretch" }}
      gap={{ base: 3, md: 4 }}
      px={0}
      py={0}
      borderTop="1px solid"
      borderColor="gray.200"
      bg="white"
    >
      <Flex
        h="full"
        minH={{ base: "auto", md: "56px" }}
        align="center"
        bg="gray.50"
        px={{ base: 3, md: 4 }}
        py={{ base: 3, md: 0 }}
        borderRight={{ base: "none", md: "1px solid" }}
        borderRightColor={{ base: "transparent", md: "gray.200" }}
      >
        <Text fontSize="xs" fontWeight="800" color="gray.900" textTransform="none" letterSpacing="-0.01em">
          {label}
        </Text>
      </Flex>

      <Box minW={0} w="full" px={{ base: 3, md: 0 }} py={{ base: 0, md: 3.5 }}>
        {isLoading ? (
          <Skeleton h="18px" w="180px" borderRadius="8px" />
        ) : (
          <Box>{value}</Box>
        )}
      </Box>

      <Flex justify={{ base: "flex-start", md: "flex-end" }} px={{ base: 3, md: 2 }} py={{ base: 0, md: 3 }}>
        {onEdit ? (
          <Button
            variant="outline"
            borderRadius="full"
            h="34px"
            w="34px"
            minW="34px"
            p={0}
            aria-label={editLabel}
            onClick={onEdit}
          >
            <PencilLine size={14} />
          </Button>
        ) : null}
      </Flex>
    </Grid>
  )
}

export function SessionReviewStep({ sessionId }: SessionReviewStepProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { setPrimaryAction, setPrimaryActionReady } = useSessionWizardActions()
  const [setupState, setSetupState] = useState<SessionWizardSetupState["setupState"]>("Incomplete")
  const [isInitialised, setIsInitialised] = useState(false)
  const requestedSetupStateSessionIdRef = useRef<string | null>(null)

  const reviewReturnUrl = useMemo(() => `${location.pathname}${location.search}`, [location.pathname, location.search])

  const setupStateMutation = useMutation({
    mutationFn: () => markSessionWizardReadyForReview(sessionId),
    onSuccess: (data) => {
      setSetupState(data.setupState)
      setIsInitialised(true)
      setPrimaryActionReady(true)
    },
    onError: () => {
      setSetupState("Incomplete")
      setIsInitialised(true)
      setPrimaryActionReady(true)
    },
  })

  const finishMutation = useMutation<SessionWizardSetupState, Error, "ReadyForReview" | "ReadyForSale">({
    mutationFn: (setupState) => updateSessionWizardSetupState(sessionId, { setupState }),
    onSuccess: async (data) => {
      setSetupState(data.setupState)
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
        await finishMutation.mutateAsync(setupState === "ReadyForSale" ? "ReadyForSale" : "ReadyForReview")
      } catch {
        // Finish path keeps inline state visible for the user.
      }
    })
  }, [finishMutation, isInitialised, setPrimaryAction, setPrimaryActionReady, setupState])

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
        borderRadius="20px"
        overflow="hidden"
        bg="white"
        boxShadow="0 10px 24px rgba(15, 23, 42, 0.045)"
      >
        <Flex
          direction={{ base: "column", md: "row" }}
          align={{ base: "flex-start", md: "flex-start" }}
          justify="space-between"
          gap={4}
          px={{ base: 4, md: 5 }}
          py={{ base: 4, md: 4 }}
          bg="linear-gradient(135deg, rgba(117,81,255,0.08) 0%, rgba(66,42,251,0.04) 100%)"
          borderBottom="1px solid"
          borderColor="gray.200"
        >
          <Box>
            <Text fontSize={{ base: "sm", md: "md" }} fontWeight="800" color="gray.900">
              Ready For Sale?
            </Text>
            <Text mt={1} fontSize="sm" color="gray.600">
              Decide whether this session should be released for sale or remain in review.
            </Text>
          </Box>

          <Flex align="center" gap={3} wrap="wrap" justify={{ base: "flex-start", md: "flex-end" }}>
            <Switch.Root
              checked={setupState === "ReadyForSale"}
              onCheckedChange={(details) =>
                setSetupState(Boolean(details.checked) ? "ReadyForSale" : "ReadyForReview")
              }
              colorPalette="brand"
              aria-label="Ready For Sale"
            >
              <Switch.HiddenInput />
              <Box transform="scale(1.12)" transformOrigin="center">
                <Switch.Control />
              </Box>
            </Switch.Root>
          </Flex>
        </Flex>

        <ReviewItem
          label="Name"
          value={nameQuery.data?.name || "Not set"}
          onEdit={() => handleEdit("name")}
          editLabel="Edit session name"
          isLoading={nameQuery.isLoading}
        />
        <ReviewItem
          label="Event Name"
          value={eventName}
          onEdit={() => handleEdit("event")}
          editLabel="Edit event"
          isLoading={sessionEventQuery.isLoading || organizerEventsQuery.isLoading}
        />
        <ReviewItem
          label="Venue Name"
          value={venueName}
          onEdit={() => handleEdit("venue")}
          editLabel="Edit venue"
          isLoading={sessionVenueQuery.isLoading || organizerVenuesQuery.isLoading}
        />
        <ReviewItem
          label="Booking Window"
          value={bookingWindow}
          onEdit={() => handleEdit("booking")}
          editLabel="Edit booking window"
          isLoading={bookingQuery.isLoading}
        />
        <ReviewItem
          label="Session Date Time"
          value={sessionDateTime}
          onEdit={() => handleEdit("start-end")}
          editLabel="Edit session date time"
          isLoading={durationQuery.isLoading}
        />
        <ReviewItem
          label="Schedule"
          value={
            scheduleCount > 0 ? (
              <Badge
                variant="subtle"
                colorPalette="green"
                borderRadius="999px"
                px={3}
                py={1}
              >
                <Flex align="center" gap={1.5}>
                  <CheckCircle2 size={14} />
                  <Text as="span" fontSize="xs" fontWeight="800">
                    Yes
                  </Text>
                </Flex>
              </Badge>
            ) : (
              <Badge variant="subtle" colorPalette="gray" borderRadius="999px" px={3} py={1}>
                <Flex align="center" gap={1.5}>
                  <X size={14} />
                  <Text as="span" fontSize="xs" fontWeight="800">
                    No
                  </Text>
                </Flex>
              </Badge>
            )
          }
          onEdit={() => handleEdit("schedule")}
          editLabel="Edit schedule"
          isLoading={schedulesQuery.isLoading}
        />
        <ReviewItem
          label="Number of tickets defined"
          value={
            <Text fontSize="sm" fontWeight="800" color="gray.900">
              {ticketsCount}
            </Text>
          }
          onEdit={() => handleEdit("ticket")}
          editLabel="Edit tickets"
          isLoading={ticketsQuery.isLoading}
        />
        <ReviewItem
          label="Setup State"
          value={
            (() => {
              const setupStateTheme = getSetupStateTheme(setupState)

              return (
                <Badge
                  variant="subtle"
                  colorPalette={setupStateTheme.colorPalette}
                  borderRadius="999px"
                  px={3}
                  py={1}
                >
                  <Flex align="center" gap={1.5}>
                    <CheckCircle2 size={14} />
                    <Text as="span" fontSize="xs" fontWeight="800">
                      {setupStateTheme.label}
                    </Text>
                  </Flex>
                </Badge>
              )
            })()
          }
          editLabel="Setup state"
          isLoading={false}
        />
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
    </Stack>
  )
}
