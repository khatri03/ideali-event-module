import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Flex,
  Input,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Text,
  Tooltip,
} from "@chakra-ui/react"
import { Plus } from "lucide-react"
import { fetchOrganizerVenues } from "@/api/organizer"
import {
  createSessionSeatsIoEvent,
  fetchSeatsIoChartEvents,
  fetchSeatsIoVenueCharts,
  saveSeatsIoSeatingLayout,
} from "@/api/seatsio"
import { fetchSessionWizardName, fetchSessionWizardSeatSelection, fetchSessionWizardVenue, updateSessionWizardSeatSelection } from "@/api/sessions"
import { StyledSelect } from "@/components/common/StyledSelect"
import { extractApiError } from "@/utils/errors"
import { useSessionWizardActions } from "../hooks/useSessionWizardActions"

interface SessionSeatSelectionStepProps {
  sessionId: string
}

function SessionSeatSelectionSkeleton() {
  return (
    <Stack gap={4}>
      <Skeleton height="84px" borderRadius="20px" />
      <Skeleton height="64px" borderRadius="18px" />
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        <Skeleton height="74px" borderRadius="18px" />
        <Skeleton height="74px" borderRadius="18px" />
      </SimpleGrid>
      <Skeleton height="140px" borderRadius="18px" />
    </Stack>
  )
}

export function SessionSeatSelectionStep({ sessionId }: SessionSeatSelectionStepProps) {
  const queryClient = useQueryClient()
  const { setPrimaryAction, setPrimaryActionReady } = useSessionWizardActions()
  const [draftOfferPickingSeats, setDraftOfferPickingSeats] = useState(false)
  const [draftSeatsIoEventUniqueId, setDraftSeatsIoEventUniqueId] = useState<string | null>(null)
  const [draftSeatsIoChartUniqueId, setDraftSeatsIoChartUniqueId] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false)
  const [isCreateChartOpen, setIsCreateChartOpen] = useState(false)
  const [chartName, setChartName] = useState("")
  const [chartNameError, setChartNameError] = useState("")
  const [eventName, setEventName] = useState("")
  const [eventNameError, setEventNameError] = useState("")
  const [seatSelectionError, setSeatSelectionError] = useState("")

  const seatSelectionQuery = useQuery({
    queryKey: ["sessions", { sessionId, step: "seat-selection" }],
    queryFn: () => fetchSessionWizardSeatSelection(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  const sessionNameQuery = useQuery({
    queryKey: ["sessions", { sessionId, step: "name" }],
    queryFn: () => fetchSessionWizardName(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  const sessionVenueQuery = useQuery({
    queryKey: ["sessions", { sessionId, step: "venue" }],
    queryFn: () => fetchSessionWizardVenue(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  const organizerVenuesQuery = useQuery({
    queryKey: ["organizer", "venues"],
    queryFn: fetchOrganizerVenues,
    enabled: !!sessionId,
    retry: false,
  })

  const currentVenueUniqueId = sessionVenueQuery.data?.venueUniqueId ?? ""
  const currentVenue = useMemo(
    () => organizerVenuesQuery.data?.find((venue) => venue.uniqueId === currentVenueUniqueId) ?? null,
    [currentVenueUniqueId, organizerVenuesQuery.data],
  )

  const suggestedEventName = useMemo(() => {
    const sessionName = sessionNameQuery.data?.name.trim()
    if (!sessionName) {
      return ""
    }

    return `${sessionName} ${new Date().getFullYear()}`
  }, [sessionNameQuery.data?.name])

  const venueChartsQuery = useQuery({
    queryKey: ["seatsio", { venueUniqueId: currentVenueUniqueId, step: "charts" }],
    queryFn: () => fetchSeatsIoVenueCharts(currentVenueUniqueId),
    enabled: Boolean(currentVenueUniqueId && draftOfferPickingSeats),
    retry: false,
  })

  const selectedChart = useMemo(
    () => venueChartsQuery.data?.find((chart) => chart.uniqueId === draftSeatsIoChartUniqueId) ?? null,
    [draftSeatsIoChartUniqueId, venueChartsQuery.data],
  )

  const chartEventsQuery = useQuery({
    queryKey: ["seatsio", { chartUniqueId: draftSeatsIoChartUniqueId, step: "events" }],
    queryFn: () => fetchSeatsIoChartEvents(draftSeatsIoChartUniqueId ?? ""),
    enabled: Boolean(draftOfferPickingSeats && draftSeatsIoChartUniqueId),
    retry: false,
  })

  const createEventMutation = useMutation({
    mutationFn: (payload: { chartUniqueId: string; label: string }) => createSessionSeatsIoEvent(sessionId, payload),
    onSuccess: async (createdEvent) => {
      setDraftSeatsIoEventUniqueId(createdEvent.uniqueId)
      setDraftSeatsIoChartUniqueId(createdEvent.chartUniqueId)
      setEventName("")
      setEventNameError("")
      setIsCreateEventOpen(false)
      await queryClient.invalidateQueries({ queryKey: ["seatsio", { chartUniqueId: createdEvent.chartUniqueId, step: "events" }] })
      await queryClient.invalidateQueries({ queryKey: ["sessions", { sessionId, step: "seat-selection" }] })
      await queryClient.invalidateQueries({ queryKey: ["sessions", "review", sessionId] })
    },
  })

  const createChartMutation = useMutation({
    mutationFn: (payload: { name: string; venueUniqueId: string }) =>
      saveSeatsIoSeatingLayout({
        name: payload.name,
        venueUniqueId: payload.venueUniqueId,
      }),
    onSuccess: async (createdChart) => {
      await venueChartsQuery.refetch()
      setDraftSeatsIoChartUniqueId(createdChart.uniqueId)
      setDraftSeatsIoEventUniqueId(null)
      setChartName("")
      setChartNameError("")
      setIsCreateChartOpen(false)
      await queryClient.invalidateQueries({ queryKey: ["seatsio", { venueUniqueId: currentVenueUniqueId, step: "charts" }] })
      await queryClient.invalidateQueries({ queryKey: ["seatsio", "seating-layouts"] })
      await queryClient.invalidateQueries({ queryKey: ["sessions", { sessionId, step: "seat-selection" }] })
      await queryClient.invalidateQueries({ queryKey: ["sessions", "review", sessionId] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { offerPickingSeats: boolean; seatsIoEventUniqueId: string | null }) =>
      updateSessionWizardSeatSelection(sessionId, payload),
    onSuccess: async (data) => {
      queryClient.setQueryData(["sessions", { sessionId, step: "seat-selection" }], data)
      setDraftOfferPickingSeats(data.offerPickingSeats)
      setDraftSeatsIoEventUniqueId(data.seatsIoEventUniqueId)
      setDraftSeatsIoChartUniqueId(data.seatsIoChartUniqueId)
      setSeatSelectionError("")
      await queryClient.invalidateQueries({ queryKey: ["sessions", "review", sessionId] })
    },
    onError: (error) => {
      setSeatSelectionError(extractApiError(error))
    },
    onSettled: () => {
      setPrimaryActionReady(true)
    },
  })

  useEffect(() => {
    if (!seatSelectionQuery.isSuccess || !seatSelectionQuery.data || isHydrated) {
      return
    }

    setDraftOfferPickingSeats(seatSelectionQuery.data.offerPickingSeats)
    setDraftSeatsIoEventUniqueId(seatSelectionQuery.data.seatsIoEventUniqueId)
    setDraftSeatsIoChartUniqueId(seatSelectionQuery.data.seatsIoChartUniqueId)
    setIsHydrated(true)
  }, [isHydrated, seatSelectionQuery.data, seatSelectionQuery.isSuccess])

  useEffect(() => {
    if (!isHydrated || !draftSeatsIoChartUniqueId || !venueChartsQuery.isSuccess) {
      return
    }

    const chartStillBelongsToVenue = (venueChartsQuery.data ?? []).some((chart) => chart.uniqueId === draftSeatsIoChartUniqueId)
    if (!chartStillBelongsToVenue) {
      setDraftSeatsIoChartUniqueId(null)
      setDraftSeatsIoEventUniqueId(null)
    }
  }, [draftSeatsIoChartUniqueId, isHydrated, venueChartsQuery.data, venueChartsQuery.isSuccess])

  useEffect(() => {
    if (!seatSelectionQuery.isSuccess || !isHydrated || venueChartsQuery.isFetching || chartEventsQuery.isFetching) {
      setPrimaryAction(null)
      setPrimaryActionReady(false)
      return
    }

    setPrimaryAction(async () => {
      setPrimaryActionReady(false)
      if (draftOfferPickingSeats && !draftSeatsIoChartUniqueId) {
        const message = "Select a chart before saving seat selection."
        setSeatSelectionError(message)
        throw new Error(message)
      }

      if (draftOfferPickingSeats && !draftSeatsIoEventUniqueId) {
        const message = "Select a Seats.io event before saving seat selection."
        setSeatSelectionError(message)
        throw new Error(message)
      }

      setSeatSelectionError("")
      await updateMutation.mutateAsync({
        offerPickingSeats: draftOfferPickingSeats,
        seatsIoEventUniqueId: draftSeatsIoEventUniqueId,
      })
    })
    setPrimaryActionReady(!draftOfferPickingSeats || Boolean(draftSeatsIoChartUniqueId && draftSeatsIoEventUniqueId))

    return () => {
      setPrimaryAction(null)
      setPrimaryActionReady(true)
    }
  }, [
    draftOfferPickingSeats,
    draftSeatsIoChartUniqueId,
    draftSeatsIoEventUniqueId,
    isHydrated,
    chartEventsQuery.isFetching,
    venueChartsQuery.isFetching,
    seatSelectionQuery.isSuccess,
    setPrimaryAction,
    setPrimaryActionReady,
    updateMutation,
  ])

  const chartOptions = useMemo(
    () =>
      (venueChartsQuery.data ?? []).map((chart) => ({
        label: chart.name,
        value: chart.uniqueId,
      })),
    [venueChartsQuery.data],
  )

  const hasVenueCharts = Boolean(venueChartsQuery.isSuccess && chartOptions.length > 0)
  const hasNoVenueCharts = Boolean(venueChartsQuery.isSuccess && chartOptions.length === 0)

  const eventOptions = useMemo(
    () =>
      (chartEventsQuery.data ?? []).map((event) => ({
        label: event.label,
        value: event.uniqueId,
        description: event.seatsIoEventKey ?? undefined,
      })),
    [chartEventsQuery.data],
  )

  const hasChartEvents = Boolean(chartEventsQuery.isSuccess && eventOptions.length > 0)
  const hasNoChartEvents = Boolean(chartEventsQuery.isSuccess && eventOptions.length === 0)

  const isBusy = seatSelectionQuery.isLoading || sessionVenueQuery.isLoading || organizerVenuesQuery.isLoading
  const isSelectionEnabled = draftOfferPickingSeats
  const isFetchingChoices = venueChartsQuery.isFetching || chartEventsQuery.isFetching
  const isChartDisabled = !isSelectionEnabled || isFetchingChoices || !currentVenueUniqueId
  const isEventDisabled = !isSelectionEnabled || isFetchingChoices || !draftSeatsIoChartUniqueId

  async function handleCreateEvent() {
    const trimmedName = eventName.trim()
    if (!trimmedName) {
      setEventNameError("Event name is required.")
      return
    }

    if (!draftSeatsIoChartUniqueId) {
      setEventNameError("Select a chart first.")
      return
    }

    setEventNameError("")
    await createEventMutation.mutateAsync({
      chartUniqueId: draftSeatsIoChartUniqueId,
      label: trimmedName,
    })
  }

  async function handleCreateChart() {
    const trimmedName = chartName.trim()
    if (!trimmedName) {
      setChartNameError("Chart name is required.")
      return
    }

    if (!currentVenueUniqueId) {
      setChartNameError("Select a venue first.")
      return
    }

    setChartNameError("")
    await createChartMutation.mutateAsync({
      name: trimmedName,
      venueUniqueId: currentVenueUniqueId,
    })
  }

  return (
    <Stack gap={5}>
      <Box
        border="1px solid"
        borderColor="gray.200"
        borderRadius="20px"
        bg="linear-gradient(135deg, rgba(117,81,255,0.05) 0%, rgba(66,42,251,0.03) 100%)"
        p={{ base: 4, md: 5 }}
      >
        <Flex align="flex-start" justify="space-between" gap={4} wrap="wrap">
          <Box minW={0}>
            <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
              Seat Selection
            </Text>
            <Text mt={2} fontSize={{ base: "sm", md: "md" }} fontWeight="700" color="gray.800">
              Enable Seats.io seat selection for this session, then choose one of the events mapped to the selected chart.
            </Text>
          </Box>

          <Switch.Root
            checked={draftOfferPickingSeats}
            disabled={seatSelectionQuery.isLoading || isFetchingChoices}
            onCheckedChange={(details) => {
              setDraftOfferPickingSeats(Boolean(details.checked))
              if (!details.checked) {
                setSeatSelectionError("")
              }
            }}
            colorPalette="brand"
            aria-label="Enable Seat Selection"
          >
            <Switch.HiddenInput />
            <Box transform="scale(1.08)" transformOrigin="center">
              <Switch.Control />
            </Box>
          </Switch.Root>
        </Flex>
      </Box>

      {isBusy ? (
        <SessionSeatSelectionSkeleton />
      ) : (
        <Stack gap={5}>
          <Box
            border="1px solid"
            borderColor="gray.200"
            borderRadius="18px"
            bg="white"
            boxShadow="0 10px 24px rgba(15, 23, 42, 0.045)"
            px={5}
            py={4}
          >
            <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
              Venue
            </Text>
            <Text mt={2} fontSize="sm" fontWeight="700" color="gray.800">
              {currentVenue?.name ?? "Not set"}
            </Text>
          </Box>

          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
            <Box>
              <Flex align="center" justify="space-between" gap={3} mb={2} minW={0}>
                <Text fontSize="sm" fontWeight="700" color="gray.700">
                  Chart <Text as="span" color="red.500">*</Text>
                </Text>
                <Tooltip.Root openDelay={300} closeDelay={100}>
                  <Tooltip.Trigger asChild>
                    <Button
                      variant="outline"
                      aria-label="Add chart"
                      borderRadius="999px"
                      h="44px"
                      w="44px"
                      minW="44px"
                      p={0}
                      disabled={!isSelectionEnabled || !currentVenueUniqueId || isFetchingChoices}
                      onClick={() => setIsCreateChartOpen(true)}
                    >
                      <Plus size={18} />
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Positioner>
                    <Tooltip.Content>Quick add chart</Tooltip.Content>
                  </Tooltip.Positioner>
                </Tooltip.Root>
              </Flex>
              <StyledSelect
                options={chartOptions}
                value={draftSeatsIoChartUniqueId ?? ""}
                onChange={(value) => {
                  setDraftSeatsIoChartUniqueId(value || null)
                  setDraftSeatsIoEventUniqueId(null)
                  if (seatSelectionError) {
                    setSeatSelectionError("")
                  }
                }}
                placeholder={!currentVenueUniqueId ? "No venue selected" : hasVenueCharts ? "Select chart" : "No Chart Found"}
                disabled={isChartDisabled}
                minW="0"
              />
              {isSelectionEnabled && currentVenueUniqueId && hasNoVenueCharts && !venueChartsQuery.isLoading ? (
                <Text mt={2} fontSize="sm" color="gray.600">
                  No charts are mapped to this venue yet.
                </Text>
              ) : null}
            </Box>

            <Box>
              <Flex align="center" justify="space-between" gap={3} mb={2} minW={0}>
                <Text fontSize="sm" fontWeight="700" color="gray.700">
                  Event <Text as="span" color="red.500">*</Text>
                </Text>
                <Tooltip.Root openDelay={300} closeDelay={100}>
                  <Tooltip.Trigger asChild>
                    <Button
                      variant="outline"
                      aria-label="Add Seats.io event"
                      borderRadius="999px"
                      h="44px"
                      w="44px"
                      minW="44px"
                      p={0}
                      disabled={!isSelectionEnabled || !draftSeatsIoChartUniqueId || isFetchingChoices}
                      onClick={() => {
                        setEventName(suggestedEventName)
                        setEventNameError("")
                        setIsCreateEventOpen(true)
                      }}
                    >
                      <Plus size={18} />
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Positioner>
                    <Tooltip.Content>Quick add event</Tooltip.Content>
                    </Tooltip.Positioner>
                  </Tooltip.Root>
              </Flex>
              <StyledSelect
                options={eventOptions}
                value={draftSeatsIoEventUniqueId ?? ""}
                onChange={(value) => {
                  setDraftSeatsIoEventUniqueId(value || null)
                  if (seatSelectionError) {
                    setSeatSelectionError("")
                  }
                }}
                placeholder={!draftSeatsIoChartUniqueId ? "Select chart first" : hasChartEvents ? "Select event" : "No Event Found"}
                disabled={isEventDisabled}
                minW="0"
              />
              {isSelectionEnabled && draftSeatsIoChartUniqueId && hasNoChartEvents && !chartEventsQuery.isLoading ? (
                <Text mt={2} fontSize="sm" color="gray.600">
                  No events exist for this chart yet.
                </Text>
              ) : null}
            </Box>
          </SimpleGrid>

          {selectedChart?.name ? (
            <Text fontSize="sm" color="gray.600">
              Currently filtered by chart {selectedChart.name}.
            </Text>
          ) : null}

          {seatSelectionError ? (
            <Text fontSize="sm" color="red.500">
              {seatSelectionError}
            </Text>
          ) : null}

          {seatSelectionQuery.isError ? (
            <Text fontSize="sm" color="red.500">
              {extractApiError(seatSelectionQuery.error)}
            </Text>
          ) : null}

          {sessionVenueQuery.isError ? (
            <Text fontSize="sm" color="red.500">
              {extractApiError(sessionVenueQuery.error)}
            </Text>
          ) : null}

          {organizerVenuesQuery.isError ? (
            <Text fontSize="sm" color="red.500">
              {extractApiError(organizerVenuesQuery.error)}
            </Text>
          ) : null}

          {venueChartsQuery.isError ? (
            <Text fontSize="sm" color="red.500">
              {extractApiError(venueChartsQuery.error)}
            </Text>
          ) : null}

          {chartEventsQuery.isError ? (
            <Text fontSize="sm" color="red.500">
              {extractApiError(chartEventsQuery.error)}
            </Text>
          ) : null}
        </Stack>
      )}

      <Dialog.Root
        open={isCreateEventOpen}
        onOpenChange={(details) => {
          setIsCreateEventOpen(details.open)
          if (!details.open) {
            setEventName("")
            setEventNameError("")
            createEventMutation.reset()
          } else {
            createEventMutation.reset()
            if (!eventName) {
              setEventName(suggestedEventName)
            }
          }
        }}
        size="lg"
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            maxW={{ base: "100vw", md: "560px" }}
            maxH={{ base: "100dvh", md: "90vh" }}
            m={{ base: 0, md: "auto" }}
            overflow="hidden"
            display="flex"
            flexDirection="column"
          >
            <Box px={6} pt={6} pb={4} borderBottom="1px solid" borderColor="gray.200">
              <Flex align="flex-start" justify="space-between" gap={4}>
                <Box>
                  <Text fontSize="lg" fontWeight="800" color="gray.900">
                    Add event
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    The new Seats.io event will be created in the selected chart and assigned to this session.
                  </Text>
                </Box>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close event modal" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={6} py={6} overflowY="auto">
              <Stack gap={4}>
                {createEventMutation.isError ? (
                  <Box border="1px solid" borderColor="red.200" bg="red.50" borderRadius="16px" px={4} py={3}>
                    <Text fontSize="sm" fontWeight="700" color="red.700">
                      {extractApiError(createEventMutation.error)}
                    </Text>
                  </Box>
                ) : null}

                <Box>
                  <Text fontSize="sm" fontWeight="700" color="gray.700" mb={2}>
                    Name <Text as="span" color="red.500">*</Text>
                  </Text>
                  <Input
                    value={eventName}
                    onChange={(event) => {
                      setEventName(event.target.value)
                      if (eventNameError) {
                        setEventNameError("")
                      }
                    }}
                    placeholder="Main hall opening"
                    border="1px solid"
                    borderColor="secondaryGray.100"
                    borderRadius="14px"
                    h="44px"
                    px={4}
                    w="full"
                    autoFocus
                  />
                  {eventNameError ? (
                    <Text mt={2} fontSize="sm" color="red.500">
                      {eventNameError}
                    </Text>
                  ) : null}
                </Box>

                <Flex
                  pt={5}
                  borderTop="1px solid"
                  borderColor="gray.200"
                  align="center"
                  justify="space-between"
                  gap={3}
                  flexWrap="wrap"
                >
                  <Button
                    variant="outline"
                    colorPalette="gray"
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    minW={{ base: "full", md: "140px" }}
                    onClick={() => setIsCreateEventOpen(false)}
                  >
                    Close
                  </Button>

                  <Button
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    minW={{ base: "full", md: "140px" }}
                    onClick={handleCreateEvent}
                    color="white"
                    style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                    loading={createEventMutation.isPending}
                  >
                    Create
                  </Button>
                </Flex>
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <Dialog.Root
        open={isCreateChartOpen}
        onOpenChange={(details) => {
          setIsCreateChartOpen(details.open)
          if (!details.open) {
            setChartName("")
            setChartNameError("")
            createChartMutation.reset()
          }
        }}
        size="lg"
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            maxW={{ base: "100vw", md: "560px" }}
            maxH={{ base: "100dvh", md: "90vh" }}
            m={{ base: 0, md: "auto" }}
            overflow="hidden"
            display="flex"
            flexDirection="column"
          >
            <Box px={6} pt={6} pb={4} borderBottom="1px solid" borderColor="gray.200">
              <Flex align="flex-start" justify="space-between" gap={4}>
                <Box>
                  <Text fontSize="lg" fontWeight="800" color="gray.900">
                    Add chart
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Create a new Seats.io chart for the selected venue and auto-select it.
                  </Text>
                </Box>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close chart modal" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={6} py={6} overflowY="auto">
              <Stack gap={4}>
                <Box border="1px solid" borderColor="gray.200" borderRadius="16px" bg="gray.50" px={4} py={3}>
                  <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
                    Venue
                  </Text>
                  <Text mt={1} fontSize="sm" fontWeight="700" color="gray.800">
                    {currentVenue?.name ?? "Not set"}
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="700" color="gray.700" mb={2}>
                    Name <Text as="span" color="red.500">*</Text>
                  </Text>
                  <Input
                    value={chartName}
                    onChange={(event) => {
                      setChartName(event.target.value)
                      if (chartNameError) {
                        setChartNameError("")
                      }
                    }}
                    placeholder="Main hall seating plan"
                    border="1px solid"
                    borderColor="secondaryGray.100"
                    borderRadius="14px"
                    h="44px"
                    px={4}
                    w="full"
                    autoFocus
                  />
                  {chartNameError ? (
                    <Text mt={2} fontSize="sm" color="red.500">
                      {chartNameError}
                    </Text>
                  ) : null}
                </Box>

                <Flex
                  pt={5}
                  borderTop="1px solid"
                  borderColor="gray.200"
                  align="center"
                  justify="space-between"
                  gap={3}
                  flexWrap="wrap"
                >
                  <Button
                    variant="outline"
                    colorPalette="gray"
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    minW={{ base: "full", md: "140px" }}
                    onClick={() => setIsCreateChartOpen(false)}
                  >
                    Close
                  </Button>

                  <Button
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    minW={{ base: "full", md: "140px" }}
                    onClick={handleCreateChart}
                    color="white"
                    style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                    loading={createChartMutation.isPending}
                  >
                    Create
                  </Button>
                </Flex>

                {createChartMutation.isError ? (
                  <Text fontSize="sm" color="red.500">
                    {extractApiError(createChartMutation.error)}
                  </Text>
                ) : null}
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Stack>
  )
}
