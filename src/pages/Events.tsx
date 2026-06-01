import { useState, useMemo } from "react"
import {
  Box,
  Button,
  Flex,
  Grid,
  Input,
  InputGroup,
  Text,
  Badge,
} from "@chakra-ui/react"
import { useNavigate } from "react-router-dom"
import { Plus, Search, LayoutGrid, List, Filter } from "lucide-react"
import { EventCard } from "../components/events/EventCard"
import { EventFormModal } from "../components/events/EventFormModal"
import { StyledSelect } from "../components/common/StyledSelect"
import { mockEvents } from "../data/mock"
import type { AppEvent } from "../types"
import { APP_ROUTES } from "@/utils/routes"

const CATEGORIES: { value: string; label: string }[] = [
  { value: "", label: "All Categories" },
  { value: "conference", label: "Conference" },
  { value: "workshop", label: "Workshop" },
  { value: "seminar", label: "Seminar" },
  { value: "networking", label: "Networking" },
  { value: "webinar", label: "Webinar" },
  { value: "hackathon", label: "Hackathon" },
  { value: "concert", label: "Concert" },
  { value: "sports", label: "Sports" },
  { value: "other", label: "Other" },
]

const STATUSES: { value: string; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]


export function Events() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<AppEvent[]>(mockEvents)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchSearch =
        !search ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.location.toLowerCase().includes(search.toLowerCase()) ||
        e.organizer.toLowerCase().includes(search.toLowerCase())
      const matchCategory = !category || e.category === category
      const matchStatus = !status || e.status === status
      return matchSearch && matchCategory && matchStatus
    })
  }, [events, search, category, status])

  function handleSave(data: Partial<AppEvent>) {
    if (editingEvent) {
      setEvents((prev) =>
        prev.map((e) => (e.id === editingEvent.id ? { ...e, ...data } : e))
      )
    } else {
      const newEvent: AppEvent = {
        ...(data as AppEvent),
        id: `e${Date.now()}`,
        attendees: 0,
        coverColor: ["#7551FF", "#422AFB", "#2196F3", "#3CB371", "#FF6B35", "#E91E8C"][
          Math.floor(Math.random() * 6)
        ],
      }
      setEvents((prev) => [newEvent, ...prev])
    }
    setEditingEvent(null)
  }

  function handleEdit(event: AppEvent) {
    setEditingEvent(event)
    setIsModalOpen(true)
  }

  const activeFilterCount = [category, status].filter(Boolean).length

  return (
    <Box>
      {/* Header */}
      <Flex align="flex-start" justify="space-between" mb={6}>
        <Box>
          <Text fontSize="2xl" fontWeight="800" color="text.primary" letterSpacing="-0.02em">
            Events
          </Text>
          <Text fontSize="sm" color="text.secondary" mt={0.5}>
            {filtered.length} events{filtered.length !== events.length ? ` of ${events.length}` : ""}
          </Text>
        </Box>
        <Button
          borderRadius="12px"
          fontWeight="700"
          fontSize="sm"
          h="42px"
          px={5}
          onClick={() => navigate(APP_ROUTES.eventWizard.createBase)}
          style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)", color: "white" }}
          _hover={{ opacity: 0.9, transform: "translateY(-1px)" }}
          transition="all 0.2s ease"
        >
          <Plus size={16} />
          Create Event
        </Button>
      </Flex>

      {/* Filter bar */}
      <Flex
        gap={3}
        mb={6}
        align="center"
        flexWrap="wrap"
        p={4}
        bg="card.bg"
        borderRadius="16px"
        boxShadow="card"
      >
        <InputGroup startElement={<Search size={15} color="#718096" />} flex={1} minW="200px">
          <Input
            placeholder="Search events, locations, organizers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            borderRadius="12px"
            borderColor="border.subtle"
            bg="app.bg"
            fontSize="sm"
            pl="2.5rem"
            _focus={{ borderColor: "brand.500", boxShadow: "0 0 0 1px #7551FF" }}
          />
        </InputGroup>

        <Flex align="center" gap={2}>
          <Box color="text.secondary"><Filter size={15} /></Box>
          <Text fontSize="xs" fontWeight="700" color="text.secondary">Filters</Text>
          {activeFilterCount > 0 && (
            <Badge colorPalette="brand" variant="solid" borderRadius="full" fontSize="10px" px={1.5}>
              {activeFilterCount}
            </Badge>
          )}
        </Flex>

        <StyledSelect
          options={CATEGORIES}
          value={category}
          onChange={setCategory}
          placeholder="All Categories"
          size="sm"
          minW="160px"
        />

        <StyledSelect
          options={STATUSES}
          value={status}
          onChange={setStatus}
          placeholder="All Statuses"
          size="sm"
          minW="150px"
        />

        {/* View toggle */}
        <Flex
          border="1px solid"
          borderColor="border.subtle"
          borderRadius="12px"
          overflow="hidden"
          bg="app.bg"
        >
          <Box
            as="button"
            p={2}
            bg={viewMode === "grid" ? "brand.500" : "transparent"}
            color={viewMode === "grid" ? "white" : "text.secondary"}
            onClick={() => setViewMode("grid")}
            transition="all 0.15s"
            _hover={viewMode !== "grid" ? { bg: "gray.100", _dark: { bg: "navy.700" } } : {}}
          >
            <LayoutGrid size={16} />
          </Box>
          <Box
            as="button"
            p={2}
            bg={viewMode === "list" ? "brand.500" : "transparent"}
            color={viewMode === "list" ? "white" : "text.secondary"}
            onClick={() => setViewMode("list")}
            transition="all 0.15s"
            _hover={viewMode !== "list" ? { bg: "gray.100", _dark: { bg: "navy.700" } } : {}}
          >
            <List size={16} />
          </Box>
        </Flex>
      </Flex>

      {/* Events grid */}
      {filtered.length === 0 ? (
        <Flex
          direction="column"
          align="center"
          justify="center"
          bg="card.bg"
          borderRadius="20px"
          boxShadow="card"
          py={16}
          gap={3}
        >
          <Flex
            w="64px"
            h="64px"
            borderRadius="20px"
            align="center"
            justify="center"
            bg="brand.50"
            _dark={{ bg: "navy.700" }}
          >
            <Search size={28} color="#7551FF" />
          </Flex>
          <Text fontSize="lg" fontWeight="700" color="text.primary">No events found</Text>
          <Text fontSize="sm" color="text.secondary">
            Try adjusting your search or filter criteria
          </Text>
          <Button
            size="sm"
            borderRadius="10px"
            variant="outline"
            fontWeight="600"
            onClick={() => { setSearch(""); setCategory(""); setStatus("") }}
          >
            Clear filters
          </Button>
        </Flex>
      ) : (
        <Grid
          templateColumns={
            viewMode === "grid"
              ? "repeat(auto-fill, minmax(300px, 1fr))"
              : "1fr"
          }
          gap={5}
        >
          {filtered.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onEdit={handleEdit}
            />
          ))}
        </Grid>
      )}

      <EventFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingEvent(null) }}
        event={editingEvent}
        onSave={handleSave}
      />
    </Box>
  )
}
