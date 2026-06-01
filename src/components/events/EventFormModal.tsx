import { useState } from "react"
import {
  Box,
  Button,
  Dialog,
  CloseButton,
  Field,
  Grid,
  Input,
  Textarea,
  Flex,
  Text,
  Badge,
} from "@chakra-ui/react"
import { CalendarDays, MapPin, Tag, Users, DollarSign, User, Zap } from "lucide-react"
import { StyledSelect } from "../common/StyledSelect"
import type { AppEvent, EventCategory, EventStatus } from "../../types"

interface EventFormModalProps {
  isOpen: boolean
  onClose: () => void
  event?: AppEvent | null
  onSave: (data: Partial<AppEvent>) => void
}

const CATEGORY_OPTIONS: { value: EventCategory; label: string }[] = [
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

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

const COVER_COLORS = [
  "#7551FF", "#422AFB", "#3965FF", "#01B574",
  "#FFB547", "#EE5D50", "#3652BA", "#4318FF",
]

const defaultForm = {
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  location: "",
  category: "conference" as EventCategory,
  status: "draft" as EventStatus,
  capacity: 100,
  price: 0,
  currency: "USD",
  organizer: "",
  tags: "",
  coverColor: "#7551FF",
}

const FIELD_FOCUS = { borderColor: "brand.400", boxShadow: "0 0 0 3px rgba(117, 81, 255, 0.15)" }
const INPUT_BASE = {
  borderRadius: "16px",
  borderColor: "secondaryGray.100",
  bg: "app.bg",
  fontSize: "sm",
  h: "44px",
  px: 4,
  _focus: FIELD_FOCUS,
  _dark: { borderColor: "navy.600" },
}

function getFormFromEvent(event?: AppEvent | null) {
  if (!event) {
    return defaultForm
  }

  return {
    title: event.title,
    description: event.description,
    startDate: event.startDate.slice(0, 16),
    endDate: event.endDate.slice(0, 16),
    location: event.location,
    category: event.category,
    status: event.status,
    capacity: event.capacity,
    price: event.price,
    currency: event.currency,
    organizer: event.organizer,
    tags: event.tags.join(", "),
    coverColor: event.coverColor ?? "#7551FF",
  }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      fontSize="xs"
      fontWeight="800"
      color="secondaryGray.600"
      textTransform="uppercase"
      letterSpacing="0.08em"
      mb={3}
      mt={1}
    >
      {children}
    </Text>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Field.Label
      fontSize="sm"
      fontWeight="600"
      color="navy.700"
      _dark={{ color: "secondaryGray.200" }}
      mb={1.5}
    >
      {children}
    </Field.Label>
  )
}

export function EventFormModal({ isOpen, onClose, event, onSave }: EventFormModalProps) {
  const [form, setForm] = useState(() => getFormFromEvent(event))
  const isEditing = !!event

  function handleChange(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit() {
    onSave({
      ...form,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      attendees: event?.attendees ?? 0,
    })
    onClose()
  }

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(details) => {
        if (details.open) {
          setForm(getFormFromEvent(event))
          return
        }

        onClose()
      }}
      size="xl"
    >
      <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
      <Dialog.Positioner>
        <Dialog.Content
          bg="card.bg"
          boxShadow="0px 30px 80px rgba(112, 144, 176, 0.25), 0px 0px 0px 1px rgba(112, 144, 176, 0.12)"
          _dark={{ boxShadow: "0px 30px 80px rgba(0,0,0,0.5), 0px 0px 0px 1px rgba(255,255,255,0.06)" }}
          maxW={{ base: "100vw", md: "720px" }}
          maxH={{ base: "100dvh", md: "90vh" }}
          borderRadius={{ base: 0, md: "24px" }}
          m={{ base: 0, md: "auto" }}
          overflow="hidden"
          display="flex"
          flexDirection="column"
        >
          {/* Header */}
          <Box
            px={7}
            pt={7}
            pb={5}
            borderBottom="1px solid"
            borderColor="secondaryGray.100"
            _dark={{ borderColor: "navy.700" }}
            flexShrink={0}
          >
            <Flex align="flex-start" gap={4}>
              {/* Brand icon */}
              <Flex
                w="48px"
                h="48px"
                borderRadius="14px"
                align="center"
                justify="center"
                flexShrink={0}
                style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                boxShadow="0 8px 20px rgba(66, 42, 251, 0.3)"
              >
                <Zap size={22} color="white" fill="white" />
              </Flex>
              <Box flex={1} pt={0.5}>
                <Text fontSize="xl" fontWeight="800" color="navy.700" _dark={{ color: "white" }} letterSpacing="-0.02em">
                  {isEditing ? "Edit Event" : "Create New Event"}
                </Text>
                <Text fontSize="sm" color="secondaryGray.600" mt={0.5}>
                  {isEditing ? "Update the event details below." : "Fill in the details to publish your event."}
                </Text>
              </Box>
              <Dialog.CloseTrigger asChild>
                <CloseButton
                  size="sm"
                  borderRadius="10px"
                  color="secondaryGray.600"
                  _hover={{ bg: "secondaryGray.300", _dark: { bg: "navy.700" } }}
                  aria-label="Close"
                />
              </Dialog.CloseTrigger>
            </Flex>
          </Box>

          {/* Body */}
          <Dialog.Body py={6} px={7} overflowY="auto" flex={1}>
            {/* Section — Basic Info */}
            <SectionLabel>Basic Information</SectionLabel>
            <Grid gap={4} mb={6}>
              <Field.Root>
                <FieldLabel>Event Title</FieldLabel>
                <Input
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="e.g. TechSummit 2026"
                  {...INPUT_BASE}
                />
              </Field.Root>
              <Field.Root>
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Describe what attendees can expect..."
                  rows={3}
                  borderRadius="16px"
                  borderColor="secondaryGray.100"
                  bg="app.bg"
                  fontSize="sm"
                  px={4}
                  py={3}
                  resize="vertical"
                  _focus={FIELD_FOCUS}
                  _dark={{ borderColor: "navy.600" }}
                />
              </Field.Root>
            </Grid>

            {/* Divider */}
            <Box h="1px" bg="secondaryGray.100" _dark={{ bg: "navy.700" }} mb={5} />

            {/* Section — Schedule */}
            <SectionLabel>
              <Flex as="span" align="center" gap={1.5}>
                <CalendarDays size={12} />
                Schedule & Location
              </Flex>
            </SectionLabel>
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4} mb={6}>
              <Field.Root>
                <FieldLabel>Start Date & Time</FieldLabel>
                <Input type="datetime-local" value={form.startDate} onChange={(e) => handleChange("startDate", e.target.value)} {...INPUT_BASE} />
              </Field.Root>
              <Field.Root>
                <FieldLabel>End Date & Time</FieldLabel>
                <Input type="datetime-local" value={form.endDate} onChange={(e) => handleChange("endDate", e.target.value)} {...INPUT_BASE} />
              </Field.Root>
              <Field.Root gridColumn={{ md: "1 / -1" }}>
                <FieldLabel>
                  <Flex as="span" align="center" gap={1}>
                    <MapPin size={12} />
                    Location
                  </Flex>
                </FieldLabel>
                <Input
                  value={form.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  placeholder="City, venue name or Online"
                  {...INPUT_BASE}
                />
              </Field.Root>
            </Grid>

            {/* Divider */}
            <Box h="1px" bg="secondaryGray.100" _dark={{ bg: "navy.700" }} mb={5} />

            {/* Section — Details */}
            <SectionLabel>
              <Flex as="span" align="center" gap={1.5}>
                <Tag size={12} />
                Event Details
              </Flex>
            </SectionLabel>
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4} mb={6}>
              <Field.Root>
                <FieldLabel>Category</FieldLabel>
                <StyledSelect
                  options={CATEGORY_OPTIONS}
                  value={form.category}
                  onChange={(v) => handleChange("category", v)}
                  placeholder="Select category"
                />
              </Field.Root>

              <Field.Root>
                <FieldLabel>Status</FieldLabel>
                <StyledSelect
                  options={STATUS_OPTIONS}
                  value={form.status}
                  onChange={(v) => handleChange("status", v)}
                  placeholder="Select status"
                />
              </Field.Root>

              <Field.Root>
                <FieldLabel>
                  <Flex as="span" align="center" gap={1}>
                    <Users size={12} />
                    Capacity
                  </Flex>
                </FieldLabel>
                <Input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => handleChange("capacity", parseInt(e.target.value) || 0)}
                  placeholder="Max attendees"
                  {...INPUT_BASE}
                />
              </Field.Root>

              <Field.Root>
                <FieldLabel>
                  <Flex as="span" align="center" gap={1}>
                    <DollarSign size={12} />
                    Price (USD)
                  </Flex>
                </FieldLabel>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => handleChange("price", parseFloat(e.target.value) || 0)}
                  placeholder="0 for free"
                  {...INPUT_BASE}
                />
              </Field.Root>

              <Field.Root>
                <FieldLabel>
                  <Flex as="span" align="center" gap={1}>
                    <User size={12} />
                    Organizer
                  </Flex>
                </FieldLabel>
                <Input
                  value={form.organizer}
                  onChange={(e) => handleChange("organizer", e.target.value)}
                  placeholder="Organizer name or company"
                  {...INPUT_BASE}
                />
              </Field.Root>

              <Field.Root>
                <FieldLabel>
                  <Flex as="span" align="center" gap={1}>
                    <Tag size={12} />
                    Tags
                  </Flex>
                </FieldLabel>
                <Input
                  value={form.tags}
                  onChange={(e) => handleChange("tags", e.target.value)}
                  placeholder="react, ai, 2026 (comma-separated)"
                  {...INPUT_BASE}
                />
              </Field.Root>
            </Grid>

            {/* Divider */}
            <Box h="1px" bg="secondaryGray.100" _dark={{ bg: "navy.700" }} mb={5} />

            {/* Section — Cover Color */}
            <SectionLabel>Cover Color</SectionLabel>
            <Flex gap={2.5} wrap="wrap">
              {COVER_COLORS.map((color) => (
                <Box
                  key={color}
                  as="button"
                  w="32px"
                  h="32px"
                  borderRadius="10px"
                  bg={color}
                  onClick={() => handleChange("coverColor", color)}
                  boxShadow={
                    form.coverColor === color
                      ? `0 0 0 3px white, 0 0 0 5px ${color}`
                      : "0 2px 8px rgba(0,0,0,0.15)"
                  }
                  transition="all 0.15s ease"
                  _hover={{ transform: "scale(1.15)" }}
                  aria-label={`Cover color ${color}`}
                  aria-pressed={form.coverColor === color}
                />
              ))}
              <Flex align="center" ms={2}>
                <Badge
                  borderRadius="8px"
                  px={2}
                  py={1}
                  fontSize="10px"
                  fontWeight="700"
                  bg="secondaryGray.200"
                  color="secondaryGray.700"
                  _dark={{ bg: "navy.700", color: "secondaryGray.500" }}
                >
                  {form.coverColor}
                </Badge>
              </Flex>
            </Flex>
          </Dialog.Body>

          {/* Footer */}
          <Box
            px={7}
            py={5}
            borderTop="1px solid"
            borderColor="secondaryGray.100"
            _dark={{ borderColor: "navy.700" }}
            flexShrink={0}
          >
            <Flex gap={3} justify="flex-end">
              <Button
                variant="outline"
                borderRadius="14px"
                onClick={onClose}
                fontWeight="600"
                borderColor="secondaryGray.200"
                color="navy.700"
                _dark={{ borderColor: "navy.600", color: "secondaryGray.300" }}
                _hover={{ bg: "secondaryGray.300", _dark: { bg: "navy.700" } }}
                h="44px"
                px={6}
              >
                Cancel
              </Button>
              <Button
                borderRadius="14px"
                fontWeight="700"
                onClick={handleSubmit}
                disabled={!form.title.trim()}
                h="44px"
                px={7}
                color="white"
                style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                boxShadow="0 4px 15px rgba(66, 42, 251, 0.35)"
                _hover={{ opacity: 0.92, transform: "translateY(-1px)", boxShadow: "0 6px 20px rgba(66, 42, 251, 0.4)" }}
                _active={{ transform: "translateY(0)" }}
                transition="all 0.2s ease"
                _disabled={{ opacity: 0.5, cursor: "not-allowed", transform: "none" }}
              >
                {isEditing ? "Save Changes" : "Create Event"}
              </Button>
            </Flex>
          </Box>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
