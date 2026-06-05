import { useRef, useState } from "react"
import { Box, Flex, SimpleGrid, Text } from "@chakra-ui/react"
import { Calendar } from "lucide-react"
import { format, parseISO } from "date-fns"
import { Timepicker } from "timepicker-ui-react"
import type { ConfirmEventData } from "timepicker-ui"

function toDateInputValue(value: Date | null) {
  if (!value) return ""
  return format(value, "yyyy-MM-dd")
}

function toTimeInputValue(value: Date | null) {
  if (!value) return ""
  return format(value, "HH:mm")
}

function to12hDisplay(value: string) {
  const hours = Number(value.slice(0, 2))
  const minutes = value.slice(3, 5)
  const suffix = hours >= 12 ? "PM" : "AM"
  const normalizedHours = hours % 12 || 12
  return `${normalizedHours.toString().padStart(2, "0")}:${minutes} ${suffix}`
}

function to24hFromConfirm(hour: string, minutes: string, period: string) {
  const normalizedHour = Number.parseInt(hour, 10) % 12
  const adjustedHour = period === "PM" ? normalizedHour + 12 : normalizedHour
  return `${adjustedHour.toString().padStart(2, "0")}:${minutes.padStart(2, "0")}`
}

interface SessionUtcDateTimeFieldProps {
  value: Date | null
  minDate?: Date
  error?: string
  onChange: (value: Date | null) => void
}

export function SessionUtcDateTimeField({ value, minDate, error, onChange }: SessionUtcDateTimeFieldProps) {
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
    <Box>
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
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

      {error ? (
        <Text mt={2} fontSize="sm" color="red.500">
          {error}
        </Text>
      ) : null}
    </Box>
  )
}
