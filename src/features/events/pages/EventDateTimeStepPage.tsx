import { useEffect, useRef, useState } from "react"
import { Box, Flex, SimpleGrid, Skeleton, Stack, Text } from "@chakra-ui/react"
import { useFormContext } from "react-hook-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Calendar } from "lucide-react"
import { Timepicker } from "timepicker-ui-react"
import type { ConfirmEventData } from "timepicker-ui"
import { useParams } from "react-router-dom"
import { format, parseISO } from "date-fns"
import { extractApiError } from "@/utils/errors"
import { fetchEventWizardDateTime, updateEventWizardDateTime } from "@/api/events"
import { useEventWizardActions } from "../hooks/useEventWizardActions"
import { type EventWizardValues } from "../schemas/eventWizard.schemas"

function toDateInputValue(value: Date | null) {
  if (!value || Number.isNaN(value.getTime())) {
    return ""
  }

  return format(value, "yyyy-MM-dd")
}

function toTimeInputValue(value: Date | null) {
  if (!value || Number.isNaN(value.getTime())) {
    return ""
  }

  return format(value, "HH:mm")
}

function toDateTimeValue(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function to12hDisplay(value: string) {
  const [hoursPart, minutesPart] = value.split(":")
  const hours = Number(hoursPart)
  if (Number.isNaN(hours) || !minutesPart) {
    return value
  }

  const period = hours >= 12 ? "PM" : "AM"
  const normalizedHours = hours % 12 || 12
  return `${String(normalizedHours).padStart(2, "0")}:${minutesPart} ${period}`
}

function to24hFromConfirm(hour: string, minutes: string, period: string) {
  const numericHour = Number(hour)
  if (Number.isNaN(numericHour)) {
    return `${hour.padStart(2, "0")}:${minutes.padStart(2, "0")}`
  }

  let normalizedHour = numericHour % 12
  if (period === "PM") {
    normalizedHour += 12
  }

  return `${String(normalizedHour).padStart(2, "0")}:${minutes.padStart(2, "0")}`
}

function toDateTimeString(value: Date | null) {
  return value ? format(value, "yyyy-MM-dd'T'HH:mm:ss") : null
}

function LoadingState({ label }: { label: string }) {
  return (
    <Stack gap={4}>
      <Skeleton height="28px" width="220px" borderRadius="full" />
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={5} maxW="760px">
        <Skeleton height="260px" borderRadius="24px" />
        <Skeleton height="260px" borderRadius="24px" />
      </SimpleGrid>
      <Skeleton height="20px" width="320px" borderRadius="full" />
      <Text fontSize="sm" color="gray.500">
        {label}
      </Text>
    </Stack>
  )
}

function EventDateTimeField({
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
    if (!data.hour || !data.minutes) {
      return
    }

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
          Date
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
          Time
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

function EventDateTimeEditor({
  initialStartDate,
  initialEndDate,
}: {
  initialStartDate: string | null
  initialEndDate: string | null
}) {
  const { eventId } = useParams<{ eventId?: string }>()
  const currentEventId = eventId ?? ""
  const queryClient = useQueryClient()
  const { setValue } = useFormContext<EventWizardValues>()
  const { setPrimaryAction, setPrimaryActionReady, setPrimaryActionEnabled } = useEventWizardActions()
  const [eventStartDate, setEventStartDate] = useState<Date | null>(toDateTimeValue(initialStartDate))
  const [eventEndDate, setEventEndDate] = useState<Date | null>(toDateTimeValue(initialEndDate))
  const [error, setError] = useState("")

  const saveMutation = useMutation({
    mutationFn: async (payload: { startDate: string | null; endDate: string | null }) => {
      if (!currentEventId) {
        throw new Error("Event id is required.")
      }

      return updateEventWizardDateTime(currentEventId, payload, 10)
    },
    onSuccess: (result) => {
      if (!currentEventId) {
        return
      }

      setValue("startDate", result.startDate ?? "", { shouldDirty: false, shouldTouch: false, shouldValidate: false })
      setValue("endDate", result.endDate ?? "", { shouldDirty: false, shouldTouch: false, shouldValidate: false })
      queryClient.setQueryData(["events", "wizard-draft", currentEventId, "date-time"], result)
      queryClient.setQueryData(["events", "wizard-progress", currentEventId], (current: { stepNo?: number } | undefined) => ({
        stepNo: Math.max(current?.stepNo ?? 0, result.stepNo ?? 10),
      }))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] })
    },
  })

  useEffect(() => {
    if (!currentEventId) {
      setPrimaryAction(null)
      setPrimaryActionReady(false)
      setPrimaryActionEnabled(false)
      return
    }

    setPrimaryActionEnabled(true)
    setPrimaryAction(async () => {
      if (!eventStartDate || !eventEndDate) {
        const message = [
          !eventStartDate ? "Event start date/time is required." : null,
          !eventEndDate ? "Event end date/time is required." : null,
        ]
          .filter(Boolean)
          .join(" ")

        setError(message)
        throw new Error(message)
      }

      if (eventEndDate <= eventStartDate) {
        const message = "Event end date/time must be after the start date/time."
        setError(message)
        throw new Error(message)
      }

      setError("")
      setPrimaryActionReady(false)

      try {
        await saveMutation.mutateAsync({
          startDate: toDateTimeString(eventStartDate),
          endDate: toDateTimeString(eventEndDate),
        })
      } finally {
        setPrimaryActionReady(true)
      }
    })

    setPrimaryActionReady(true)

    return () => {
      setPrimaryAction(null)
      setPrimaryActionReady(false)
      setPrimaryActionEnabled(false)
    }
  }, [
    currentEventId,
    eventEndDate,
    eventStartDate,
    saveMutation,
    setPrimaryAction,
    setPrimaryActionEnabled,
    setPrimaryActionReady,
  ])

  return (
    <Stack h="full" gap={4}>
      <Stack flex="1" gap={4}>
        <Text fontSize="sm" fontWeight="700" color="text.primary">
          Event Date/Time
        </Text>
        <Text fontSize="sm" color="text.secondary">
          Choose when the event starts and ends. UTC Date/Time recommended.
        </Text>

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={5} maxW="760px">
          <Stack gap={3}>
            <Text fontSize="sm" fontWeight="700" color="gray.900">
              Event Starts <Text as="span" color="red.500">*</Text>
            </Text>
            <Box bg="secondaryGray.300" borderRadius="16px" p={5}>
              <EventDateTimeField
                key={`event-start-${eventStartDate?.toISOString() ?? "empty"}`}
                value={eventStartDate}
                error={error.includes("Event start date/time is required.") ? "Event start date/time is required." : ""}
                onChange={(nextStart) => {
                  setEventStartDate(nextStart)
                  if (eventEndDate && nextStart && eventEndDate <= nextStart) {
                    setEventEndDate(null)
                  }
                  if (error) {
                    setError("")
                  }
                }}
              />
            </Box>
          </Stack>

          <Stack gap={3}>
            <Text fontSize="sm" fontWeight="700" color="gray.900">
              Event Ends <Text as="span" color="red.500">*</Text>
            </Text>
            <Box bg="secondaryGray.300" borderRadius="16px" p={5}>
              <EventDateTimeField
                key={`event-end-${eventEndDate?.toISOString() ?? "empty"}-${eventStartDate?.toISOString() ?? "nostart"}`}
                value={eventEndDate}
                minDate={eventStartDate ?? undefined}
                error={error.includes("Event end date/time is required.") ? "Event end date/time is required." : ""}
                onChange={(value) => {
                  setEventEndDate(value)
                  if (error) {
                    setError("")
                  }
                }}
              />
            </Box>
          </Stack>
        </SimpleGrid>

        {error ? (
          <Text fontSize="sm" color="red.500" maxW="760px">
            {error}
          </Text>
        ) : null}
      </Stack>
    </Stack>
  )
}

export function EventDateTimeStepPage() {
  const { eventId } = useParams<{ eventId?: string }>()
  const currentEventId = eventId ?? ""

  const dateTimeQuery = useQuery({
    queryKey: ["events", "wizard-draft", currentEventId, "date-time"],
    queryFn: () => {
      if (!currentEventId) {
        throw new Error("Event id is required.")
      }

      return fetchEventWizardDateTime(currentEventId)
    },
    enabled: !!currentEventId,
    retry: false,
  })

  if (dateTimeQuery.isLoading) {
    return <LoadingState label="Loading the event date/time..." />
  }

  if (dateTimeQuery.isError) {
    return (
      <Stack gap={4}>
        <Text fontSize="lg" fontWeight="800" color="gray.900">
          Event Date/Time
        </Text>
        <Text fontSize="sm" color="red.500">
          {extractApiError(dateTimeQuery.error)}
        </Text>
      </Stack>
    )
  }

  return (
    <EventDateTimeEditor
      key={`${currentEventId}:${dateTimeQuery.data?.startDate ?? ""}:${dateTimeQuery.data?.endDate ?? ""}`}
      initialStartDate={dateTimeQuery.data?.startDate ?? null}
      initialEndDate={dateTimeQuery.data?.endDate ?? null}
    />
  )
}
