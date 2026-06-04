import { useEffect, useRef, useState, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Badge,
  Box,
  Button,
  CloseButton,
  Dialog,
  Flex,
  Input,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Tooltip,
} from "@chakra-ui/react"
import { Calendar, Plus } from "lucide-react"
import { useParams } from "react-router-dom"
import { format, parseISO } from "date-fns"
import { Timepicker } from "timepicker-ui-react"
import type { ConfirmEventData } from "timepicker-ui"
import { EventDescriptionEditor } from "@/features/events"
import {
  createOrganizerVenue,
  fetchOrganizerEvents,
  fetchOrganizerVenues,
  type OrganizerEventOption,
  type OrganizerVenueOption,
} from "@/api/organizer"
import {
  fetchSessionWizardDescription,
  fetchSessionWizardBooking,
  fetchSessionWizardEvent,
  fetchSessionWizardName,
  fetchSessionWizardVenue,
  updateSessionWizardDescription,
  updateSessionWizardBooking,
  updateSessionWizardEvent,
  updateSessionWizardName,
  updateSessionWizardVenue,
} from "@/api/sessions"
import { StyledSelect } from "@/components/common/StyledSelect"
import { extractApiError } from "@/utils/errors"
import { getSessionWizardStepNumber, useSessionWizardNavigation } from "../hooks/useSessionWizard"
import { useSessionWizardActions } from "../hooks/useSessionWizardActions"

export function SessionWizardStepPage() {
  const { activeStep } = useSessionWizardNavigation()
  const { sessionId } = useParams<{ sessionId?: string }>()

  if (!sessionId) {
    return <SessionStepPlaceholder label={activeStep?.label ?? "Session step"} />
  }

  if (activeStep?.slug === "description") {
    return <SessionDescriptionStep sessionId={sessionId} />
  }

  if (activeStep?.slug === "event") {
    return <SessionEventStep sessionId={sessionId} />
  }

  if (activeStep?.slug === "venue") {
    return <SessionVenueStep sessionId={sessionId} />
  }

  if (activeStep?.slug === "booking") {
    return <SessionBookingStep sessionId={sessionId} />
  }

  if (activeStep?.slug === "name" || !activeStep) {
    return <SessionNameStep sessionId={sessionId} />
  }

  return <SessionStepPlaceholder label={activeStep.label} />
}

function SessionStepShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={4}>
      <Badge borderRadius="999px" px={3} py={1} colorPalette="green" variant="subtle" alignSelf="flex-start">
        {label}
      </Badge>
      {children}
    </Stack>
  )
}

function SessionStepPlaceholder({ label }: { label: string }) {
  return (
    <SessionStepShell label={label}>
      <Text fontSize="lg" fontWeight="800" color="gray.900">
        {label}
      </Text>
      <Text fontSize="sm" color="gray.600">
        This step is scaffolded for now.
      </Text>
    </SessionStepShell>
  )
}

function LoadingState({ label }: { label: string }) {
  return (
    <Stack gap={4}>
      <Skeleton h="18px" w="120px" />
      <Skeleton h="52px" w="full" maxW="560px" borderRadius="12px" />
      <Skeleton h="18px" w="320px" />
      <Text fontSize="sm" color="gray.500">
        {label}
      </Text>
    </Stack>
  )
}

function toDateTimeInputValue(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function toBookingDateString(value: Date | null) {
  if (!value) {
    return null
  }

  return format(value, "yyyy-MM-dd'T'HH:mm:ss")
}

function toDateInputValue(value: Date | null) {
  if (!value) {
    return ""
  }

  return format(value, "yyyy-MM-dd")
}

function toTimeInputValue(value: Date | null) {
  if (!value) {
    return ""
  }

  return format(value, "HH:mm")
}

function to24hFromConfirm(hour: string, minutes: string, type: string): string {
  let h = parseInt(hour, 10)
  const m = minutes.padStart(2, "0")
  if (type === "AM" && h === 12) h = 0
  if (type === "PM" && h !== 12) h += 12
  return `${String(h).padStart(2, "0")}:${m}`
}

function to12hDisplay(time24h: string): string {
  const [hStr, mStr] = time24h.split(":")
  let h = parseInt(hStr, 10)
  const ampm = h >= 12 ? "PM" : "AM"
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${String(h).padStart(2, "0")}:${mStr} ${ampm}`
}

function SessionNameStep({ sessionId }: { sessionId: string }) {
  return <SessionNameEditor sessionId={sessionId} />
}

function SessionNameEditor({ sessionId }: { sessionId: string }) {
  const { setPrimaryAction } = useSessionWizardActions()
  const queryClient = useQueryClient()
  const [error, setError] = useState("")
  const [draftName, setDraftName] = useState<string | null>(null)
  const [loadedName, setLoadedName] = useState("")
  const [loadError, setLoadError] = useState("")
  const displayedName = draftName ?? loadedName
  const isLoading = !loadedName && !loadError

  useEffect(() => {
    let isActive = true

    fetchSessionWizardName(sessionId)
      .then((result) => {
        if (!isActive) {
          return
        }

        setLoadedName(result.name)
      })
      .catch((fetchError: unknown) => {
        if (!isActive) {
          return
        }

        setLoadError(extractApiError(fetchError))
      })

    return () => {
      isActive = false
    }
  }, [sessionId])

  useEffect(() => {
    setPrimaryAction(async () => {
      const trimmedName = displayedName.trim()
      if (!trimmedName) {
        setError("Session name is required.")
        throw new Error("Session name is required.")
      }

      setError("")
      try {
        const stepNo = getSessionWizardStepNumber("name")
        const result = await updateSessionWizardName(sessionId, { name: trimmedName }, stepNo)
        setDraftName(result.name)
        queryClient.setQueryData(["sessions", "wizard-progress", sessionId], { stepNo })
      } catch (saveError: unknown) {
        setError(extractApiError(saveError))
        throw saveError
      }
    })

    return () => setPrimaryAction(null)
  }, [displayedName, queryClient, sessionId, setPrimaryAction])

  if (isLoading) {
    return <LoadingState label="Loading the session name..." />
  }

  if (loadError) {
    return (
      <SessionStepShell label="Name">
        <Text fontSize="lg" fontWeight="800" color="gray.900">
          Name
        </Text>
        <Text fontSize="sm" color="red.500">
          {loadError}
        </Text>
      </SessionStepShell>
    )
  }

  return (
    <SessionStepShell label="Name">
      <Text fontSize="lg" fontWeight="800" color="gray.900">
        Name *
      </Text>
      <Box>
        <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
          Session name
        </Text>
        <Input
          value={displayedName}
          onChange={(event) => {
            setDraftName(event.target.value)
            if (error) {
              setError("")
            }
          }}
          placeholder="Keynote, workshop, networking..."
          border="1px solid"
          borderColor="secondaryGray.100"
          borderRadius="14px"
          h="44px"
          px={4}
          w="full"
          maxW="560px"
          autoFocus
          _focusVisible={{
            borderColor: "brand.400",
            boxShadow: "0 0 0 3px rgba(117, 81, 255, 0.15)",
            outline: "none",
          }}
        />
        {error ? (
          <Text mt={2} fontSize="sm" color="red.500">
            {error}
          </Text>
        ) : null}
      </Box>
      <Text fontSize="sm" color="text.secondary">
        Keep it short and specific so the session is easy to recognize.
      </Text>
    </SessionStepShell>
  )
}

function SessionDescriptionStep({ sessionId }: { sessionId: string }) {
  const query = useQuery({
    queryKey: ["sessions", { sessionId, step: "description" }],
    queryFn: () => fetchSessionWizardDescription(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  if (query.isLoading) {
    return <LoadingState label="Loading the session description..." />
  }

  if (query.isError) {
    return (
      <SessionStepShell label="Description">
        <Text fontSize="lg" fontWeight="800" color="gray.900">
          Description
        </Text>
        <Text fontSize="sm" color="red.500">
          {extractApiError(query.error)}
        </Text>
      </SessionStepShell>
    )
  }

  return (
    <SessionDescriptionEditor
      key={`${sessionId}:${query.data?.description ?? ""}`}
      sessionId={sessionId}
      initialDescription={query.data?.description ?? ""}
    />
  )
}

function SessionDescriptionEditor({ sessionId, initialDescription }: { sessionId: string; initialDescription: string }) {
  const { setPrimaryAction } = useSessionWizardActions()
  const queryClient = useQueryClient()
  const [description, setDescription] = useState(initialDescription)
  const [error, setError] = useState("")

  useEffect(() => {
    setPrimaryAction(async () => {
      setError("")
      try {
        const stepNo = getSessionWizardStepNumber("description")
        const result = await updateSessionWizardDescription(sessionId, {
          description: description.trim() ? description.trim() : null,
        }, stepNo)
        setDescription(result.description ?? "")
        queryClient.setQueryData(["sessions", "wizard-progress", sessionId], { stepNo })
      } catch (saveError: unknown) {
        setError(extractApiError(saveError))
        throw saveError
      }
    })

    return () => setPrimaryAction(null)
  }, [description, queryClient, sessionId, setPrimaryAction])

  return (
    <SessionStepShell label="Description">
      <Text fontSize="lg" fontWeight="800" color="gray.900">
        Description
      </Text>
      <Box maxW="720px">
        <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
          Session description
        </Text>
        <EventDescriptionEditor
          value={description}
          onChange={(value) => {
            setDescription(value)
            if (error) {
              setError("")
            }
          }}
        />
        {error ? (
          <Text mt={2} fontSize="sm" color="red.500">
            {error}
          </Text>
        ) : null}
      </Box>
      <Text fontSize="sm" color="text.secondary">
        Optional. Keep it helpful and focused.
      </Text>
    </SessionStepShell>
  )
}

function SessionEventStep({ sessionId }: { sessionId: string }) {
  const sessionEventQuery = useQuery({
    queryKey: ["sessions", { sessionId, step: "event" }],
    queryFn: () => fetchSessionWizardEvent(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  const eventsQuery = useQuery({
    queryKey: ["events", { scope: "organizer", step: "list" }],
    queryFn: fetchOrganizerEvents,
    retry: false,
  })

  if (sessionEventQuery.isLoading || eventsQuery.isLoading) {
    return <LoadingState label="Loading the session event..." />
  }

  if (sessionEventQuery.isError) {
    return (
      <SessionStepShell label="Event">
        <Text fontSize="lg" fontWeight="800" color="gray.900">
          Event
        </Text>
        <Text fontSize="sm" color="red.500">
          {extractApiError(sessionEventQuery.error)}
        </Text>
      </SessionStepShell>
    )
  }

  if (eventsQuery.isError) {
    return (
      <SessionStepShell label="Event">
        <Text fontSize="lg" fontWeight="800" color="gray.900">
          Event
        </Text>
        <Text fontSize="sm" color="red.500">
          {extractApiError(eventsQuery.error)}
        </Text>
      </SessionStepShell>
    )
  }

  return (
    <SessionEventEditor
      key={`${sessionId}:${sessionEventQuery.data?.eventUniqueId ?? ""}`}
      sessionId={sessionId}
      initialEventUniqueId={sessionEventQuery.data?.eventUniqueId ?? ""}
      events={eventsQuery.data ?? []}
    />
  )
}

function SessionEventEditor({
  sessionId,
  initialEventUniqueId,
  events,
}: {
  sessionId: string
  initialEventUniqueId: string
  events: OrganizerEventOption[]
}) {
  const { setPrimaryAction } = useSessionWizardActions()
  const queryClient = useQueryClient()
  const [selectedEventUniqueId, setSelectedEventUniqueId] = useState(initialEventUniqueId)
  const [eventError, setEventError] = useState("")

  useEffect(() => {
    setPrimaryAction(async () => {
      if (!selectedEventUniqueId) {
        setEventError("Event is required.")
        throw new Error("Event is required.")
      }

      setEventError("")
      try {
        const stepNo = getSessionWizardStepNumber("event")
        const result = await updateSessionWizardEvent(sessionId, { eventUniqueId: selectedEventUniqueId }, stepNo)
        queryClient.setQueryData(["sessions", { sessionId, step: "event" }], { ...result, stepNo })
        queryClient.setQueryData(["sessions", "wizard-progress", sessionId], { stepNo })
        setSelectedEventUniqueId(result.eventUniqueId)
      } catch (saveError: unknown) {
        setEventError(extractApiError(saveError))
        throw saveError
      }
    })

    return () => setPrimaryAction(null)
  }, [queryClient, selectedEventUniqueId, sessionId, setPrimaryAction])

  return (
    <SessionStepShell label="Event">
      <Text fontSize="lg" fontWeight="800" color="gray.900">
        Event *
      </Text>
      <Stack gap={2} maxW="720px">
        <Text fontSize="sm" fontWeight="600" color="navy.700">
          Session event
        </Text>

        <StyledSelect
          options={events.map((event) => ({
            label: event.name,
            value: event.uniqueId,
          }))}
          value={selectedEventUniqueId}
          onChange={(value) => {
            setSelectedEventUniqueId(value)
            if (eventError) {
              setEventError("")
            }
          }}
          placeholder="Select event"
          disabled={false}
        />
      </Stack>

      {eventError ? (
        <Text fontSize="sm" color="red.500">
          {eventError}
        </Text>
      ) : null}

      {events.length === 0 ? (
        <Text fontSize="sm" color="gray.600">
          No events found for the current organizer.
        </Text>
      ) : null}

      <Text fontSize="sm" color="text.secondary">
        Pick the event this session belongs to.
      </Text>
    </SessionStepShell>
  )
}

function SessionVenueStep({ sessionId }: { sessionId: string }) {
  const sessionVenueQuery = useQuery({
    queryKey: ["sessions", { sessionId, step: "venue" }],
    queryFn: () => fetchSessionWizardVenue(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  const venuesQuery = useQuery({
    queryKey: ["venues", { scope: "organizer" }],
    queryFn: fetchOrganizerVenues,
    retry: false,
  })

  if (sessionVenueQuery.isLoading || venuesQuery.isLoading) {
    return <LoadingState label="Loading the session venue..." />
  }

  if (sessionVenueQuery.isError) {
    return (
      <SessionStepShell label="Venue">
        <Text fontSize="lg" fontWeight="800" color="gray.900">
          Venue
        </Text>
        <Text fontSize="sm" color="red.500">
          {extractApiError(sessionVenueQuery.error)}
        </Text>
      </SessionStepShell>
    )
  }

  return (
    <SessionVenueEditor
      key={`${sessionId}:${sessionVenueQuery.data?.venueUniqueId ?? ""}`}
      sessionId={sessionId}
      initialVenueUniqueId={sessionVenueQuery.data?.venueUniqueId ?? ""}
      venues={venuesQuery.data ?? []}
      refetchVenues={venuesQuery.refetch}
      venuesError={venuesQuery.isError ? extractApiError(venuesQuery.error) : ""}
    />
  )
}

function SessionBookingStep({ sessionId }: { sessionId: string }) {
  const bookingQuery = useQuery({
    queryKey: ["sessions", { sessionId, step: "booking" }],
    queryFn: () => fetchSessionWizardBooking(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  if (bookingQuery.isLoading) {
    return <LoadingState label="Loading the booking tenure..." />
  }

  if (bookingQuery.isError) {
    return (
      <SessionStepShell label="Booking Tenure">
        <Text fontSize="lg" fontWeight="800" color="gray.900">
          Booking Tenure
        </Text>
        <Text fontSize="sm" color="red.500">
          {extractApiError(bookingQuery.error)}
        </Text>
      </SessionStepShell>
    )
  }

  return (
    <SessionBookingEditor
      key={`${sessionId}:${bookingQuery.data?.bookingStartDate ?? ""}:${bookingQuery.data?.bookingEndDate ?? ""}`}
      sessionId={sessionId}
      initialBookingStartDate={bookingQuery.data?.bookingStartDate ?? null}
      initialBookingEndDate={bookingQuery.data?.bookingEndDate ?? null}
    />
  )
}

function SessionBookingEditor({
  sessionId,
  initialBookingStartDate,
  initialBookingEndDate,
}: {
  sessionId: string
  initialBookingStartDate: string | null
  initialBookingEndDate: string | null
}) {
  const { setPrimaryAction } = useSessionWizardActions()
  const queryClient = useQueryClient()
  const [bookingStartDate, setBookingStartDate] = useState<Date | null>(toDateTimeInputValue(initialBookingStartDate))
  const [bookingEndDate, setBookingEndDate] = useState<Date | null>(toDateTimeInputValue(initialBookingEndDate))
  const [error, setError] = useState("")

  useEffect(() => {
    setPrimaryAction(async () => {
      if (!bookingStartDate || !bookingEndDate) {
        const missingFields = [
          !bookingStartDate ? "Booking start date/time is required." : null,
          !bookingEndDate ? "Booking end date/time is required." : null,
        ].filter(Boolean)
        const message = missingFields.join(" ")
        setError(message)
        throw new Error(message)
      }

      if (bookingEndDate <= bookingStartDate) {
        setError("Booking end date/time must be after the start date/time.")
        throw new Error("Booking end date/time must be after the start date/time.")
      }

      setError("")
      try {
        const stepNo = getSessionWizardStepNumber("booking")
        const result = await updateSessionWizardBooking(
          sessionId,
          {
            bookingStartDate: toBookingDateString(bookingStartDate),
            bookingEndDate: toBookingDateString(bookingEndDate),
          },
          stepNo,
        )
        setBookingStartDate(toDateTimeInputValue(result.bookingStartDate))
        setBookingEndDate(toDateTimeInputValue(result.bookingEndDate))
        queryClient.setQueryData(["sessions", "wizard-progress", sessionId], { stepNo })
      } catch (saveError: unknown) {
        setError(extractApiError(saveError))
        throw saveError
      }
    })

    return () => setPrimaryAction(null)
  }, [bookingEndDate, bookingStartDate, queryClient, sessionId, setPrimaryAction])

  return (
    <SessionStepShell label="Booking Tenure">
      <Text fontSize="lg" fontWeight="800" color="gray.900">
        Booking Tenure
      </Text>

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={5} maxW="760px">
        <Box bg="secondaryGray.300" borderRadius="16px" p={5}>
          <Badge colorPalette="green" variant="subtle" borderRadius="999px" px={3} py={1} mb={4}>
            Booking Opens
          </Badge>
          <BookingDateTimeField
            key={`booking-start-${bookingStartDate?.toISOString() ?? "empty"}`}
            value={bookingStartDate}
            error={error.includes("Booking start date/time is required.") ? "Booking start date/time is required." : ""}
            onChange={(nextStart) => {
              setBookingStartDate(nextStart)
              if (bookingEndDate && nextStart && bookingEndDate <= nextStart) {
                setBookingEndDate(null)
              }
              if (error) setError("")
            }}
          />
        </Box>

        <Box bg="secondaryGray.300" borderRadius="16px" p={5}>
          <Badge colorPalette="orange" variant="subtle" borderRadius="999px" px={3} py={1} mb={4}>
            Booking Closes
          </Badge>
          <BookingDateTimeField
            key={`booking-end-${bookingEndDate?.toISOString() ?? "empty"}-${bookingStartDate?.toISOString() ?? "nostart"}`}
            value={bookingEndDate}
            minDate={bookingStartDate ?? undefined}
            error={error.includes("Booking end date/time is required.") ? "Booking end date/time is required." : ""}
            onChange={(value) => {
              setBookingEndDate(value)
              if (error) setError("")
            }}
          />
        </Box>
      </SimpleGrid>

      {error ? (
        <Text fontSize="sm" color="red.500" maxW="760px">
          {error}
        </Text>
      ) : null}

      <Text fontSize="sm" color="text.secondary">
        Choose when booking opens and closes for this session. Enter both date and time in UTC.
      </Text>
    </SessionStepShell>
  )
}

function BookingDateTimeField({
  value,
  minDate,
  error,
  onChange,
}: {
  value: Date | null
  minDate?: Date
  error?: string
  onChange: (value: Date | null) => void
}) {
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(value))
  const [selectedTime, setSelectedTime] = useState(toTimeInputValue(value))
  const dateInputRef = useRef<HTMLInputElement>(null)
  const minDateValue = minDate ? toDateInputValue(minDate) : undefined
  const minTimeValue = minDateValue && selectedDate === minDateValue ? toTimeInputValue(minDate ?? null) : ""
  const displayDate = selectedDate ? format(parseISO(selectedDate), "dd-MMM-yyyy") : ""

  function handleDateClick() {
    dateInputRef.current?.showPicker?.()
  }

  function handleTimeConfirm(data: ConfirmEventData) {
    if (!data.hour || !data.minutes) return

    const time24h = data.type
      ? to24hFromConfirm(data.hour, data.minutes, data.type)
      : `${data.hour.padStart(2, "0")}:${data.minutes.padStart(2, "0")}`

    setSelectedTime(time24h)

    if (!selectedDate) {
      onChange(null)
      return
    }

    if (minTimeValue && selectedDate === minDateValue && time24h < minTimeValue) {
      onChange(null)
      return
    }

    const next = new Date(`${selectedDate}T${time24h}:00`)
    onChange(Number.isNaN(next.getTime()) ? null : next)
  }

  return (
    <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
      <Box>
        <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
          Date (UTC)
        </Text>
        <Box position="relative">
          <Flex
            align="center"
            justify="space-between"
            border="1px solid"
            borderColor="secondaryGray.100"
            borderRadius="14px"
            h="44px"
            px={4}
            cursor="pointer"
            _hover={{ borderColor: "brand.400" }}
            onClick={handleDateClick}
          >
            <Text fontSize="sm" color={displayDate ? "navy.700" : "secondaryGray.500"}>
              {displayDate || "DD-MMM-YYYY"}
            </Text>
            <Calendar size={16} color="#8F9BBA" />
          </Flex>
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            min={minDateValue}
            onChange={(event) => {
              const dateStr = event.target.value
              setSelectedDate(dateStr)

              if (!dateStr) {
                onChange(null)
                return
              }

              if (selectedTime) {
                const next = new Date(`${dateStr}T${selectedTime}:00`)
                onChange(Number.isNaN(next.getTime()) ? null : next)
                return
              }

              onChange(null)
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "1px",
              height: "1px",
              opacity: 0,
              pointerEvents: "none",
            }}
          />
        </Box>
        {error ? (
          <Text mt={2} fontSize="sm" color="red.500">
            {error}
          </Text>
        ) : null}
      </Box>

      <Box>
        <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
          Time (UTC)
        </Text>
        <Timepicker
          value={selectedTime ? to12hDisplay(selectedTime) : undefined}
          options={{ clock: { type: "12h", autoSwitchToMinutes: true } }}
          onConfirm={handleTimeConfirm}
          disabled={!selectedDate}
          placeholder="Select time"
          style={{
            border: "1px solid #E0E5F2",
            borderRadius: "14px",
            height: "44px",
            padding: "0 16px",
            width: "100%",
            fontSize: "14px",
            fontFamily: "'DM Sans', sans-serif",
            cursor: selectedDate ? "pointer" : "not-allowed",
            background: "transparent",
            outline: "none",
            color: selectedDate ? "#1B254B" : "#8F9BBA",
          }}
        />
      </Box>
    </SimpleGrid>
  )
}

function SessionVenueEditor({
  sessionId,
  initialVenueUniqueId,
  venues,
  refetchVenues,
  venuesError,
}: {
  sessionId: string
  initialVenueUniqueId: string
  venues: OrganizerVenueOption[]
  refetchVenues: () => Promise<unknown>
  venuesError: string
}) {
  const { setPrimaryAction } = useSessionWizardActions()
  const queryClient = useQueryClient()
  const [selectedVenueUniqueId, setSelectedVenueUniqueId] = useState(initialVenueUniqueId)
  const [isOpen, setIsOpen] = useState(false)
  const [venueName, setVenueName] = useState("")
  const [venueNameError, setVenueNameError] = useState("")
  const [venueError, setVenueError] = useState("")

  const createVenueMutation = useMutation({
    mutationFn: createOrganizerVenue,
  })

  useEffect(() => {
    setPrimaryAction(async () => {
      setVenueError("")
      try {
        const stepNo = getSessionWizardStepNumber("venue")
        const result = await updateSessionWizardVenue(sessionId, { venueUniqueId: selectedVenueUniqueId }, stepNo)
        queryClient.setQueryData(["sessions", "wizard-progress", sessionId], { stepNo })
        setSelectedVenueUniqueId(result.venueUniqueId)
      } catch (saveError: unknown) {
        setVenueError(extractApiError(saveError))
        throw saveError
      }
    })

    return () => setPrimaryAction(null)
  }, [queryClient, selectedVenueUniqueId, sessionId, setPrimaryAction])

  async function handleCreateVenue() {
    const trimmedName = venueName.trim()
    if (!trimmedName) {
      setVenueNameError("Venue name is required.")
      return
    }

    setVenueNameError("")
    try {
      const createdVenue = await createVenueMutation.mutateAsync({ name: trimmedName })
      await refetchVenues()
      setSelectedVenueUniqueId(createdVenue.uniqueId)
      setVenueName("")
      setIsOpen(false)
    } catch (createError: unknown) {
      setVenueNameError(extractApiError(createError))
    }
  }

  return (
    <SessionStepShell label="Venue">
      <Text fontSize="lg" fontWeight="800" color="gray.900">
        Venue
      </Text>
      <Stack gap={2} maxW="720px">
        <Flex align="center" justify="space-between" gap={3}>
          <Text fontSize="sm" fontWeight="600" color="navy.700">
            Session venue
          </Text>
          <Tooltip.Root openDelay={300} closeDelay={100}>
            <Tooltip.Trigger asChild>
              <Button
                variant="outline"
                aria-label="Add venue"
                borderRadius="999px"
                h="44px"
                w="44px"
                minW="44px"
                p={0}
                onClick={() => setIsOpen(true)}
              >
                <Plus size={18} />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content>Quick add venue</Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>
        </Flex>

        <StyledSelect
          options={venues.map((venue) => ({
            label: venue.name,
            value: venue.uniqueId,
          }))}
          value={selectedVenueUniqueId}
          onChange={(value) => {
            setSelectedVenueUniqueId(value)
            if (venueError) {
              setVenueError("")
            }
          }}
          placeholder="Select venue"
          disabled={false}
        />
      </Stack>

      {venueError ? (
        <Text fontSize="sm" color="red.500">
          {venueError}
        </Text>
      ) : null}

      {venuesError ? (
        <Text fontSize="sm" color="red.500">
          {venuesError}
        </Text>
      ) : null}

      <Dialog.Root
        open={isOpen}
        onOpenChange={(details) => {
          setIsOpen(details.open)
          if (!details.open) {
            setVenueName("")
            setVenueNameError("")
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
                    Add venue
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Choose from your saved venues.
                  </Text>
                </Box>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close venue modal" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={6} py={6} overflowY="auto">
              <Stack gap={4}>
                <Stack gap={2}>
                  <Text fontSize="sm" fontWeight="600" color="navy.700">
                    Venue
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Enter a venue name to add it to the list.
                  </Text>
                </Stack>

                <Box>
                  <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
                    Venue name
                  </Text>
                  <Input
                    value={venueName}
                    onChange={(event) => {
                      setVenueName(event.target.value)
                      if (venueNameError) {
                        setVenueNameError("")
                      }
                    }}
                    placeholder="Main hall, rooftop, venue name..."
                    border="1px solid"
                    borderColor="secondaryGray.100"
                    borderRadius="14px"
                    h="44px"
                    px={4}
                    w="full"
                    autoFocus
                    _focusVisible={{
                      borderColor: "brand.400",
                      boxShadow: "0 0 0 3px rgba(117, 81, 255, 0.15)",
                      outline: "none",
                    }}
                  />
                  {venueNameError ? (
                    <Text mt={2} fontSize="sm" color="red.500">
                      {venueNameError}
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
                    _hover={{ bg: "gray.50", borderColor: "gray.300" }}
                    onClick={() => setIsOpen(false)}
                  >
                    Close
                  </Button>

                  <Button
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    minW={{ base: "full", md: "140px" }}
                    onClick={handleCreateVenue}
                    color="white"
                    style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                    loading={createVenueMutation.isPending}
                  >
                    Save
                  </Button>
                </Flex>
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </SessionStepShell>
  )
}
