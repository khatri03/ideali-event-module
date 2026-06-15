import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Badge, Box, Button, CloseButton, Dialog, Flex, Grid, Skeleton, Stack, Switch, Text, useBreakpointValue } from "@chakra-ui/react"
import { CheckCircle2, PencilLine, X } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { format, parseISO } from "date-fns"
import { fetchOrganizerEvents, fetchOrganizerVenues } from "@/api/organizer"
import {
  fetchSessionWizardBooking,
  fetchSessionWizardDuration,
  fetchSessionWizardEvent,
  fetchSessionWizardETicketing,
  fetchSessionWizardGenres,
  fetchSessionWizardName,
  fetchSessionWizardQuestions,
  fetchSessionWizardSetupStateOptions,
  fetchSessionWizardSchedule,
  fetchSessionWizardTickets,
  fetchSessionWizardVenue,
  markSessionWizardReadyForReview,
  updateSessionWizardSetupState,
  type SessionWizardSetupState,
  type SessionWizardSetupStateOption,
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

function getSetupStateTheme(setupState: string, setupStateOptions: SessionWizardSetupStateOption[] = []) {
  const selectedState = setupStateOptions.find((option) => option.value === setupState)

  if (!selectedState) {
    return {
      colorPalette: "gray" as const,
      label: setupState ? setupState : "Loading",
    }
  }

  if (!selectedState.isSelectable) {
    return {
      colorPalette: "gray" as const,
      label: selectedState.label,
    }
  }

  if (selectedState.isFinal) {
    return {
      colorPalette: "green" as const,
      label: selectedState.label,
    }
  }

  return {
    colorPalette: "orange" as const,
    label: selectedState.label,
  }
}

interface FinishConfirmationDeferred {
  resolve: () => void
  reject: (error: Error) => void
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
  const finishDialogSize = useBreakpointValue<"full" | "sm">({ base: "full", md: "sm" }) ?? "sm"
  const [setupState, setSetupState] = useState("")
  const [finishSetupState, setFinishSetupState] = useState<string | null>(null)
  const [isInitialised, setIsInitialised] = useState(false)
  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false)
  const isOpenedFromEventWizard = useMemo(() => typeof window !== "undefined" && Boolean(window.opener), [])
  const requestedSetupStateSessionIdRef = useRef<string | null>(null)
  const finishConfirmationDeferredRef = useRef<FinishConfirmationDeferred | null>(null)

  const reviewReturnUrl = useMemo(() => `${location.pathname}${location.search}`, [location.pathname, location.search])

  const setupStateOptionsQuery = useQuery({
    queryKey: ["sessions", "setup-state-options"],
    queryFn: fetchSessionWizardSetupStateOptions,
    staleTime: 1000 * 60 * 60,
  })
  const setupStateOptions = useMemo(() => setupStateOptionsQuery.data ?? [], [setupStateOptionsQuery.data])
  const selectableSetupStates = useMemo(
    () => setupStateOptions.filter((option) => option.isSelectable),
    [setupStateOptions],
  )
  const finalSetupState = setupStateOptions.find((option) => option.isFinal)?.value ?? ""
  const setupStateTheme = getSetupStateTheme(setupState, setupStateOptions)
  const resolvedFinishSetupState =
    finishSetupState ?? selectableSetupStates.find((option) => option.isFinal)?.value ?? selectableSetupStates[0]?.value ?? ""
  const finishSetupStateLabel = setupStateOptions.find((option) => option.value === resolvedFinishSetupState)?.label ?? "Loading"

  const setupStateMutation = useMutation({
    mutationFn: () => markSessionWizardReadyForReview(sessionId),
    onSuccess: (data) => {
      setSetupState(data.setupState)
      setFinishSetupState(selectableSetupStates.find((option) => option.value === data.setupState)?.value ?? null)
      setIsInitialised(true)
      setPrimaryActionReady(true)
      queryClient.invalidateQueries({ queryKey: ["sessions", "setup-state", sessionId] })
    },
    onError: () => {
      setSetupState("")
      setFinishSetupState(null)
      setIsInitialised(true)
      setPrimaryActionReady(true)
    },
  })

  const finishMutation = useMutation<SessionWizardSetupState, Error, string>({
    mutationFn: (setupState) => updateSessionWizardSetupState(sessionId, { setupState }),
    onSuccess: async (data) => {
      setSetupState(data.setupState)
      setFinishSetupState(selectableSetupStates.find((option) => option.value === data.setupState)?.value ?? null)
      await queryClient.invalidateQueries({ queryKey: ["sessions", "wizard-progress", sessionId] })
      await queryClient.invalidateQueries({ queryKey: ["sessions", "setup-state", sessionId] })
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
  const eTicketingQuery = useQuery({
    queryKey: ["sessions", "review", sessionId, "e-ticketing"],
    queryFn: () => fetchSessionWizardETicketing(sessionId),
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
  const genreQuery = useQuery({
    queryKey: ["sessions", "review", sessionId, "genre"],
    queryFn: () => fetchSessionWizardGenres(sessionId),
    enabled: !!sessionId,
    retry: false,
  })
  const durationQuery = useQuery({
    queryKey: ["sessions", "review", sessionId, "duration"],
    queryFn: () => fetchSessionWizardDuration(sessionId),
    enabled: !!sessionId,
    retry: false,
  })
  const questionsQuery = useQuery({
    queryKey: ["sessions", "review", sessionId, "questions"],
    queryFn: () => fetchSessionWizardQuestions(sessionId),
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

  const openFinishConfirmation = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      finishConfirmationDeferredRef.current = { resolve, reject }
      setIsFinishConfirmOpen(true)
    })
  }, [])

  const closeFinishConfirmation = useCallback(() => {
    const pending = finishConfirmationDeferredRef.current
    finishConfirmationDeferredRef.current = null
    setIsFinishConfirmOpen(false)
    pending?.reject(new Error("Finish cancelled."))
  }, [])

  const handleFinishConfirmed = useCallback(async () => {
    const pending = finishConfirmationDeferredRef.current
    if (!pending) {
      return
    }

    try {
      setPrimaryActionReady(false)
      await finishMutation.mutateAsync(resolvedFinishSetupState)
      finishConfirmationDeferredRef.current = null
      setIsFinishConfirmOpen(false)
      pending.resolve()

      if (isOpenedFromEventWizard && window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: "session-wizard:finished", sessionId }, window.location.origin)
        window.close()
      }
    } catch (error) {
      pending.reject(error instanceof Error ? error : new Error("Unable to finish review."))
    }
  }, [finishMutation, isOpenedFromEventWizard, resolvedFinishSetupState, sessionId, setPrimaryActionReady])

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
      await openFinishConfirmation()
    })
  }, [isInitialised, openFinishConfirmation, setPrimaryAction])

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
    setupStateOptionsQuery.error ??
    sessionEventQuery.error ??
    eTicketingQuery.error ??
    organizerEventsQuery.error ??
    sessionVenueQuery.error ??
    organizerVenuesQuery.error ??
    bookingQuery.error ??
    genreQuery.error ??
    questionsQuery.error ??
    durationQuery.error ??
    schedulesQuery.error ??
    ticketsQuery.error

  function buildEditUrl(
    step: "name" | "genre" | "event" | "venue" | "booking" | "start-end" | "dates-time" | "schedule" | "ticket" | "e-ticketing" | "questions",
  ) {
    const target = APP_ROUTES.sessionWizard.editStep(sessionId, step)
    return `${target}?returnUrl=${encodeURIComponent(reviewReturnUrl)}`
  }

  function handleEdit(
    step: "name" | "genre" | "event" | "venue" | "booking" | "start-end" | "dates-time" | "schedule" | "ticket" | "e-ticketing" | "questions",
  ) {
    navigate(buildEditUrl(step))
  }

  const selectedGenres = genreQuery.data?.filter((genre) => genre.isSelected) ?? []
  const selectedFormCount = questionsQuery.data?.customFormUniqueIds.length ?? 0
  const customQuestionCount = questionsQuery.data?.customQuestions.length ?? 0
  const selectedQuestionsSummary = (() => {
    const formLabel = `${selectedFormCount} Custom Form${selectedFormCount === 1 ? "" : "s"}`
    const questionLabel = `${customQuestionCount} Question${customQuestionCount === 1 ? "" : "s"}`

    if (selectedFormCount > 0 && customQuestionCount > 0) {
      return `${formLabel} and ${questionLabel}`
    }

    if (selectedFormCount > 0) {
      return formLabel
    }

    if (customQuestionCount > 0) {
      return questionLabel
    }

    return "None"
  })()

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
          <Box flex="1" minW={0}>
            <Text fontSize={{ base: "sm", md: "md" }} fontWeight="800" color="gray.900">
              Ready For Sale?
            </Text>
            <Text mt={1} fontSize="sm" color="gray.600">
              Decide whether this session should be released for sale or remain in review.
            </Text>
          </Box>

          <Flex align="center" gap={3} wrap="wrap" justify={{ base: "flex-start", md: "flex-end" }} flexShrink={0}>
            <Switch.Root
              checked={resolvedFinishSetupState === finalSetupState}
              disabled={selectableSetupStates.length < 2}
              onCheckedChange={(details) =>
                setFinishSetupState(
                  details.checked ? finalSetupState : selectableSetupStates.find((option) => !option.isFinal)?.value ?? null,
                )
              }
              colorPalette="brand"
              aria-label={setupStateOptions.find((option) => option.isFinal)?.label ?? "Ready For Sale"}
            >
              <Switch.HiddenInput />
              <Box transform="scale(1.12)" transformOrigin="center">
                <Switch.Control />
              </Box>
            </Switch.Root>
          </Flex>
        </Flex>

        <ReviewItem
          label="Current Setup State"
          value={
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
          }
          editLabel="Setup state"
          isLoading={false}
        />
        <ReviewItem
          label="Name"
          value={nameQuery.data?.name || "Not set"}
          onEdit={() => handleEdit("name")}
          editLabel="Edit session name"
          isLoading={nameQuery.isLoading}
        />
        <ReviewItem
          label="Genres"
          value={
            selectedGenres.length > 0 ? (
              <Flex wrap="wrap" gap={2}>
                {selectedGenres.map((genre) => (
                  <Badge
                    key={genre.uniqueId}
                    variant="subtle"
                    colorPalette="gray"
                    borderRadius="999px"
                    px={3}
                    py={1}
                  >
                    {genre.name}
                  </Badge>
                ))}
              </Flex>
            ) : (
              <Text fontSize="sm" color="gray.600">
                Not set
              </Text>
            )
          }
          onEdit={() => handleEdit("genre")}
          editLabel="Edit genres"
          isLoading={genreQuery.isLoading}
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
          onEdit={() => handleEdit("dates-time")}
          editLabel="Edit booking window"
          isLoading={bookingQuery.isLoading}
        />
        <ReviewItem
          label="Session Start/End"
          value={sessionDateTime}
          onEdit={() => handleEdit("dates-time")}
          editLabel="Edit session start/end"
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
          label="Questions"
          value={selectedQuestionsSummary}
          onEdit={() => handleEdit("questions")}
          editLabel="Edit questions"
          isLoading={questionsQuery.isLoading}
        />
        <ReviewItem
          label="Number Of Tickets"
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
          label="e-Ticketing"
          value={
            eTicketingQuery.data?.enableDigitalTicket ? (
              <Badge variant="subtle" colorPalette="green" borderRadius="999px" px={3} py={1}>
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
          onEdit={() => handleEdit("e-ticketing")}
          editLabel="Edit e-ticketing"
          isLoading={eTicketingQuery.isLoading}
        />
      </Box>

      <Dialog.Root
        open={isFinishConfirmOpen}
        onOpenChange={(details) => {
          if (details.open) {
            setIsFinishConfirmOpen(true)
            return
          }

          if (finishConfirmationDeferredRef.current) {
            closeFinishConfirmation()
          }
        }}
        size={finishDialogSize}
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            maxW={{ base: "100vw", md: "620px" }}
            m={{ base: 0, md: "auto" }}
            overflow="hidden"
            display="flex"
            flexDirection="column"
          >
            <Box px={5} pt={5} pb={4} borderBottom="1px solid" borderColor="gray.200">
              <Flex align="flex-start" justify="space-between" gap={4}>
                <Box>
                  <Text fontSize="xl" fontWeight="900" color="gray.900" lineHeight="1.05">
                    Confirm Finish
                  </Text>
                </Box>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close finish confirmation" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={5} py={4} flex="0 0 auto">
              <Stack gap={3}>
                <Text fontSize="sm" color="gray.700" lineHeight="1.45">
                  You are about to finish the review and set the session to the selected state.
                </Text>

                <Box border="1px solid" borderColor="gray.200" bg="gray.50" borderRadius="16px" px={4} py={3}>
                  <Text fontSize="xs" fontWeight="900" color="gray.500" letterSpacing="0.18em" textTransform="uppercase">
                    Target State
                  </Text>
                  <Badge
                    mt={1.5}
                    variant="subtle"
                    colorPalette={resolvedFinishSetupState === finalSetupState ? "green" : "orange"}
                    borderRadius="999px"
                    px={3}
                    py={0.75}
                  >
                    <Flex align="center" gap={1.5}>
                      <CheckCircle2 size={14} />
                      <Text as="span" fontSize="xs" fontWeight="800">
                        {finishSetupStateLabel}
                      </Text>
                    </Flex>
                  </Badge>
                </Box>
              </Stack>
            </Dialog.Body>

            <Flex
              px={5}
              pb={4}
              pt={3}
              borderTop="1px solid"
              borderColor="gray.200"
              align="center"
              justify="flex-end"
              gap={2.5}
              flexWrap="wrap"
            >
              <Button
                variant="outline"
                colorPalette="gray"
                borderRadius="14px"
                h="38px"
                px={4.5}
                minW={{ base: "full", md: "104px" }}
                onClick={() => closeFinishConfirmation()}
              >
                Cancel
              </Button>

              <Button
                borderRadius="14px"
                h="38px"
                px={4.5}
                minW={{ base: "full", md: "122px" }}
                color="white"
                style={{
                  background:
                    resolvedFinishSetupState === finalSetupState
                      ? "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)"
                      : "linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)",
                }}
                loading={finishMutation.isPending}
                onClick={handleFinishConfirmed}
              >
                Finish
              </Button>
            </Flex>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

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
