import { useState } from "react"
import { Box, Flex, Text, Grid } from "@chakra-ui/react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import type { EventClickArg, DateSelectArg } from "@fullcalendar/core"
import { mockEvents } from "../data/mock"
import { EventFormModal } from "../components/events/EventFormModal"
import type { AppEvent } from "../types"

const CATEGORY_COLORS: Record<string, string> = {
  conference: "#7551FF",
  workshop: "#422AFB",
  seminar: "#FF6B35",
  networking: "#3CB371",
  webinar: "#2196F3",
  hackathon: "#E91E8C",
  concert: "#FF9800",
  sports: "#009688",
  other: "#607D8B",
}

const LEGEND = [
  { label: "Conference", color: "#7551FF" },
  { label: "Workshop", color: "#422AFB" },
  { label: "Webinar", color: "#2196F3" },
  { label: "Networking", color: "#3CB371" },
  { label: "Seminar", color: "#FF6B35" },
  { label: "Hackathon", color: "#E91E8C" },
]

export function CalendarPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [_selectedDate, setSelectedDate] = useState("")
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null)

  const calendarEvents = mockEvents.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.startDate,
    end: e.endDate,
    backgroundColor: CATEGORY_COLORS[e.category] ?? "#7551FF",
    borderColor: "transparent",
    extendedProps: { event: e },
  }))

  function handleDateSelect(info: DateSelectArg) {
    setSelectedDate(info.startStr)
    setSelectedEvent(null)
    setIsModalOpen(true)
  }

  function handleEventClick(info: EventClickArg) {
    const ev = info.event.extendedProps.event as AppEvent
    setSelectedEvent(ev)
    setIsModalOpen(true)
  }

  function handleSave(_data: Partial<AppEvent>) {
    setIsModalOpen(false)
    setSelectedEvent(null)
  }

  return (
    <Box>
      {/* Legend */}
      <Flex gap={3} mb={5} flexWrap="wrap">
        {LEGEND.map((item) => (
          <Flex
            key={item.label}
            align="center"
            gap={2}
            bg="card.bg"
            borderRadius="10px"
            px={3}
            py={1.5}
            boxShadow="0px 4px 12px rgba(112,144,176,0.08)"
          >
            <Box
              w="10px"
              h="10px"
              borderRadius="full"
              style={{ backgroundColor: item.color }}
            />
            <Text fontSize="xs" fontWeight="600" color="text.secondary">
              {item.label}
            </Text>
          </Flex>
        ))}
      </Flex>

      {/* Calendar */}
      <Box
        bg="card.bg"
        borderRadius="24px"
        boxShadow="card"
        p={6}
        overflow="hidden"
      >
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          events={calendarEvents}
          selectable
          selectMirror
          dayMaxEvents={3}
          weekends
          select={handleDateSelect}
          eventClick={handleEventClick}
          height="auto"
          buttonText={{
            today: "Today",
            month: "Month",
            week: "Week",
            day: "Day",
          }}
        />
      </Box>

      {/* Stats bar */}
      <Grid templateColumns="repeat(3, 1fr)" gap={4} mt={5}>
        {[
          { label: "This Month", value: "22 Events", color: "#7551FF" },
          { label: "Upcoming", value: "9 Events", color: "#3CB371" },
          { label: "Total Attendees", value: "4,521", color: "#2196F3" },
        ].map((stat) => (
          <Box
            key={stat.label}
            bg="card.bg"
            borderRadius="16px"
            p={4}
            boxShadow="0px 8px 24px rgba(112,144,176,0.08)"
          >
            <Text fontSize="xs" fontWeight="700" color="text.secondary" textTransform="uppercase" letterSpacing="0.05em" mb={1}>
              {stat.label}
            </Text>
            <Text fontSize="xl" fontWeight="800" color="text.primary" letterSpacing="-0.02em">
              {stat.value}
            </Text>
          </Box>
        ))}
      </Grid>

      <EventFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedEvent(null) }}
        event={selectedEvent}
        onSave={handleSave}
      />
    </Box>
  )
}
