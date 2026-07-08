import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Badge,
  Box,
  Button,
  Container,
  Field,
  Flex,
  AspectRatio,
  Heading,
  HStack,
  Input,
  InputGroup,
  Image,
  SimpleGrid,
  Skeleton,
  SkeletonText,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react"
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Ticket,
} from "lucide-react"
import { format } from "date-fns"
import { useNavigate, useParams } from "react-router-dom"
import { client } from "@/api/client"
import { fetchEventRegistration } from "@/api/events"
import { StyledSelect } from "@/components/common/StyledSelect"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import type { EventRegistrationResponse, EventRegistrationSession } from "@/api/events"

const DEFAULT_FORM_VALUES = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  quantity: "1",
  notes: "",
  communicationPreference: "Email",
}

const MAX_VISIBLE_QUANTITY = 6

type RegistrationStateKind = "open" | "countdown" | "restricted" | "closed"

interface RegistrationState {
  kind: RegistrationStateKind
  tone: "green" | "orange" | "red" | "purple" | "gray"
  badge: string
  title: string
  description: string
  countdownTarget?: Date
  countdownLabel?: string
}

interface EventRegistrationViewModel {
  title: string
  bannerUrl: string | null
  themeColor: string | null
  startDate: string | null
  endDate: string | null
  bookingStartDate: string | null
  bookingEndDate: string | null
  visibility: string
  location: string
  organizer: string
  capacity: number
  attendees: number
  price: number
  currency: string
  purchaseTimeLimitMinutes: number | null
  status: string
  coverColor: string
  canRegister: boolean
  sessions: EventRegistrationSession[]
}

function SummaryRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <Flex justify="space-between" gap={4} fontSize="sm" align="start">
      <Text color={accent ? "gray.800" : "gray.500"} fontWeight={accent ? "700" : "500"}>
        {label}
      </Text>
      <Text fontWeight="800" color="gray.900" textAlign="right">
        {value}
      </Text>
    </Flex>
  )
}

function RequiredLabel({ children }: { children: string }) {
  return (
    <Text as="span" fontSize="sm" fontWeight="700" color="gray.800">
      {children} <Text as="span" color="red.500">*</Text>
    </Text>
  )
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount)
  } catch {
    return `$${amount.toFixed(Number.isInteger(amount) ? 0 : 2)}`
  }
}

function formatDateTime(value: string | null | undefined) {
  return value ? format(new Date(value), "EEE, MMM d, yyyy 'at' h:mm a") : "Date not set"
}

function getCountdownUnits(target: Date, nowMs: number) {
  const remainingSeconds = Math.max(0, Math.floor((target.getTime() - nowMs) / 1000))
  const days = Math.floor(remainingSeconds / 86400)
  const hours = Math.floor((remainingSeconds % 86400) / 3600)
  const minutes = Math.floor((remainingSeconds % 3600) / 60)
  const seconds = remainingSeconds % 60

  return [
    { label: "Days", value: String(days).padStart(2, "0") },
    { label: "Hours", value: String(hours).padStart(2, "0") },
    { label: "Mins", value: String(minutes).padStart(2, "0") },
    { label: "Secs", value: String(seconds).padStart(2, "0") },
  ]
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "").trim()

  if (normalized.length !== 6) {
    return hex
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)

  if ([red, green, blue].some((channel) => Number.isNaN(channel))) {
    return hex
  }

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function resolveAssetUrl(value: string | null | undefined) {
  if (!value) {
    return null
  }

  try {
    return new URL(value, client.defaults.baseURL).toString()
  } catch {
    return value
  }
}

function CountdownTile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Stack
      gap={1.5}
      align="center"
      justify="center"
      px={3}
      py={4}
      borderRadius="20px"
      borderWidth="1px"
      borderColor={`${tone}.200`}
      bg="white"
      minH="92px"
    >
      <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="900" letterSpacing="-0.04em" color="gray.900" lineHeight="1">
        {value}
      </Text>
      <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="0.16em" color="gray.500">
        {label}
      </Text>
    </Stack>
  )
}

function EventRegisterPageSkeleton() {
  return (
      <Box minH="100dvh" bg="gray.50" color="gray.900">
      <Container maxW="7xl" py={{ base: 4, md: 8 }}>
        <Flex justify="space-between" align={{ base: "stretch", md: "center" }} direction={{ base: "column", md: "row" }} gap={4} mb={6}>
          <Skeleton h="42px" w="120px" borderRadius="999px" />
          <Skeleton h="32px" w="160px" borderRadius="999px" />
        </Flex>

        <SimpleGrid columns={{ base: 1, xl: 12 }} gap={6} alignItems="start">
          <Stack gap={6} gridColumn={{ xl: "span 8" }}>
            <Skeleton h={{ base: "220px", md: "260px" }} borderRadius="28px" />
            <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="28px" p={{ base: 5, md: 8 }}>
              <SkeletonText noOfLines={7} />
            </Box>
          </Stack>
          <Stack gap={6} gridColumn={{ xl: "span 4" }}>
            <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="28px" p={{ base: 5, md: 6 }}>
              <SkeletonText noOfLines={8} />
            </Box>
            <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="28px" p={{ base: 5, md: 6 }}>
              <SkeletonText noOfLines={6} />
            </Box>
          </Stack>
        </SimpleGrid>
      </Container>
    </Box>
  )
}

function EventRegisterErrorState({
  message,
  onBack,
  onRetry,
}: {
  message: string
  onBack: () => void
  onRetry?: () => void
}) {
  return (
      <Box minH="100dvh" bg="gray.50" color="gray.900">
      <Container maxW="4xl" py={{ base: 8, md: 16 }}>
        <Stack gap={6} align="center" textAlign="center" bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="32px" p={{ base: 6, md: 10 }} boxShadow="0 24px 60px rgba(15, 23, 42, 0.08)">
          <Box w="72px" h="72px" borderRadius="24px" display="grid" placeItems="center" bg="red.50" color="red.600">
            <AlertTriangle size={30} />
          </Box>
          <Stack gap={2} maxW="2xl">
            <Heading fontSize={{ base: "2xl", md: "3xl" }} letterSpacing="-0.04em">
              Registration could not be loaded
            </Heading>
            <Text color="gray.600" lineHeight="1.7">
              {message}
            </Text>
          </Stack>
          <HStack gap={3} flexWrap="wrap" justify="center">
            <Button minH="12" borderRadius="16px" variant="outline" onClick={onBack}>
              <HStack gap={2}>
                <ArrowLeft size={16} />
                <Text as="span">Go back</Text>
              </HStack>
            </Button>
            {onRetry ? (
              <Button minH="12" borderRadius="16px" color="white" bg="gray.900" onClick={onRetry}>
                Retry
              </Button>
            ) : null}
          </HStack>
        </Stack>
      </Container>
    </Box>
  )
}

function EventRegisterUnavailableState({
  message,
  onBack,
  onRetry,
}: {
  message: string
  onBack: () => void
  onRetry?: () => void
}) {
  return (
      <Box minH="100dvh" bg="gray.50" color="gray.900">
      <Container maxW="4xl" py={{ base: 8, md: 16 }}>
        <Stack gap={6} align="center" textAlign="center" bg="white" borderWidth="1px" borderColor="amber.200" borderRadius="32px" p={{ base: 6, md: 10 }} boxShadow="0 24px 60px rgba(15, 23, 42, 0.08)">
          <Box w="72px" h="72px" borderRadius="24px" display="grid" placeItems="center" bg="amber.50" color="amber.600">
            <ShieldCheck size={30} />
          </Box>
          <Stack gap={2} maxW="2xl">
            <Heading fontSize={{ base: "2xl", md: "3xl" }} letterSpacing="-0.04em">
              Registration is not available yet
            </Heading>
            <Text color="gray.600" lineHeight="1.7">
              {message}
            </Text>
          </Stack>
          <HStack gap={3} flexWrap="wrap" justify="center">
            <Button minH="12" borderRadius="16px" variant="outline" onClick={onBack}>
              <HStack gap={2}>
                <ArrowLeft size={16} />
                <Text as="span">Go back</Text>
              </HStack>
            </Button>
            {onRetry ? (
              <Button minH="12" borderRadius="16px" color="white" bg="gray.900" onClick={onRetry}>
                Retry
              </Button>
            ) : null}
          </HStack>
        </Stack>
      </Container>
    </Box>
  )
}

function RegistrationStateCard({ state, nowMs }: { state: RegistrationState; nowMs: number }) {
  const countdownUnits = state.countdownTarget ? getCountdownUnits(state.countdownTarget, nowMs) : []

  return (
    <Box borderWidth="1px" borderColor={`${state.tone}.100`} bg="white" borderRadius="28px" p={{ base: 5, md: 6 }} boxShadow="0 18px 50px rgba(15, 23, 42, 0.06)">
      <Stack gap={4}>
        <HStack gap={3} align="start">
          <Box color={`${state.tone}.600`} mt={0.5}>
            {state.kind === "countdown" ? <Clock3 size={20} /> : state.kind === "restricted" ? <ShieldCheck size={20} /> : <CheckCircle2 size={20} />}
          </Box>
          <Box>
            <Badge colorPalette={state.tone} variant="subtle" borderRadius="full" px={3} py={1}>
              {state.badge}
            </Badge>
            <Text mt={3} fontSize="xl" fontWeight="900" color="gray.900" lineHeight="1.1">
              {state.title}
            </Text>
            <Text mt={2} fontSize="sm" color="gray.700" lineHeight="1.7">
              {state.description}
            </Text>
          </Box>
        </HStack>

        {state.kind === "countdown" && state.countdownTarget ? (
          <Stack gap={3}>
            <Text fontSize="xs" fontWeight="800" color={`${state.tone}.700`} textTransform="uppercase" letterSpacing="0.18em">
              {state.countdownLabel ?? "Opens in"}
            </Text>
            <SimpleGrid columns={{ base: 2, md: 4 }} gap={3}>
              {countdownUnits.map((item) => (
                <CountdownTile key={item.label} label={item.label} value={item.value} tone={state.tone} />
              ))}
            </SimpleGrid>
          </Stack>
        ) : null}

      </Stack>
    </Box>
  )
}

function deriveRegistrationState(event: EventRegistrationViewModel, nowMs: number): RegistrationState {
  const status = event.status.toLowerCase()
  const bookingStart = event.bookingStartDate ? new Date(event.bookingStartDate) : null
  const bookingEnd = event.bookingEndDate ? new Date(event.bookingEndDate) : null
  const seatsRemaining = Math.max(event.capacity - event.attendees, 0)
  const isSoldOut = seatsRemaining <= 0
  const isBeforeOpen = bookingStart ? nowMs < bookingStart.getTime() : false
  const isAfterClose = bookingEnd ? nowMs > bookingEnd.getTime() : false
  const isUpcoming = status === "upcoming"
  const isClosed = status === "closed"
  const isUnavailable = status === "unavailable"

  if (isUnavailable) {
    return {
      kind: "restricted",
      tone: "orange",
      badge: "Unavailable",
      title: "Registration is not available",
      description: "The event does not currently meet the backend checks required to open registration.",
    }
  }

  if (isSoldOut) {
    return {
      kind: "closed",
      tone: "red",
      badge: "Sold out",
      title: "This event is sold out",
      description: "All available seats are currently reserved. We are no longer showing the registration form.",
    }
  }

  if (isClosed || isAfterClose) {
    return {
      kind: "closed",
      tone: "red",
      badge: "Closed",
      title: "Registration has ended",
      description: "The booking window closed for this event, so new registrations cannot be accepted.",
    }
  }

  if ((isUpcoming || bookingStart) && isBeforeOpen) {
    return {
      kind: "countdown",
      tone: "purple",
      badge: "Opens soon",
      title: "Registration opens soon",
      description: "Everything is ready. We will unlock the form automatically when the booking window starts.",
      countdownTarget: bookingStart ?? undefined,
      countdownLabel: "Opens in",
    }
  }

  return {
    kind: "open",
    tone: "green",
    badge: "Open now",
    title: "Registration is live",
    description: "The checks are clear. Use the form below to capture attendee details and finalize the registration.",
  }
}

function buildQuantityOptions(availableSeats: number) {
  const maxQuantity = Math.min(Math.max(availableSeats, 1), MAX_VISIBLE_QUANTITY)

  return Array.from({ length: maxQuantity }, (_, index) => {
    const quantity = index + 1
    return {
      value: String(quantity),
      label: quantity === 1 ? "1 attendee" : `${quantity} attendees`,
    }
  })
}
function mapRegistrationToViewModel(registration: EventRegistrationResponse): EventRegistrationViewModel {
  const ticketTypes = registration.sessions.flatMap((session) => session.ticketTypes)
  const ticketsSold = ticketTypes.reduce((sum, ticket) => sum + (ticket.ticketsSold ?? 0), 0)
  const availableQuantity = ticketTypes.reduce((sum, ticket) => {
    if (ticket.totalQuantity !== null && ticket.totalQuantity !== undefined) {
      return sum + ticket.totalQuantity
    }

    if (ticket.availableForSale !== null && ticket.availableForSale !== undefined) {
      return sum + ticket.availableForSale + (ticket.ticketsSold ?? 0)
    }

    return sum
  }, 0)
  const lowestTicketPrice = ticketTypes
    .map((ticket) => ticket.fullPrice)
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b)[0] ?? 0

  return {
    title: registration.name,
    bannerUrl: resolveAssetUrl(registration.bannerUrl),
    themeColor: registration.themeColor,
    startDate: registration.startDate,
    endDate: registration.endDate,
    bookingStartDate: registration.bookingStartDate,
    bookingEndDate: registration.bookingEndDate,
    visibility: registration.registrationStatus,
    location: registration.venueName ?? "Venue not set",
    organizer: registration.organizerName ?? registration.timeZone ?? "Event registration",
    capacity: Math.max(availableQuantity, ticketsSold),
    attendees: ticketsSold,
    price: lowestTicketPrice,
    currency: "USD",
    purchaseTimeLimitMinutes: null,
    status: registration.registrationStatus,
    coverColor: registration.themeColor ?? "#7551FF",
    canRegister: registration.canRegister,
    sessions: registration.sessions,
  }
}

function EnterpriseRegistrationLayout({
  event,
  registrationState,
  nowMs,
  availableSeats,
  quantityOptions,
  selectedQuantity,
  currencyLabel,
  grandTotal,
  shouldShowForm,
  formAccent,
  formValues,
  setFormValues,
  onBack,
}: {
  event: EventRegistrationViewModel
  registrationState: RegistrationState
  nowMs: number
  availableSeats: number
  quantityOptions: Array<{ value: string; label: string }>
  selectedQuantity: number
  currencyLabel: string
  grandTotal: string
  shouldShowForm: boolean
  formAccent: string
  formValues: typeof DEFAULT_FORM_VALUES
  setFormValues: Dispatch<SetStateAction<typeof DEFAULT_FORM_VALUES>>
  onBack: () => void
}) {
  const ticketTypeCount = event.sessions.reduce((sum, session) => sum + session.ticketTypes.length, 0)
  const accentBackground = hexToRgba(formAccent, 0.05)
  const accentSurface = hexToRgba(formAccent, 0.1)
  const accentBorder = hexToRgba(formAccent, 0.18)
  const accentButton = formAccent

  return (
    <Box minH="100dvh" bg={accentBackground} color="gray.900">
      <Flex minH="100dvh" align="center" justify="center" px={{ base: 4, md: 8, lg: 10 }} py={{ base: 6, md: 10 }}>
        <Stack gap={{ base: 5, md: 6 }} maxW="8xl" w="full" align="center">
          <Box bg="white" borderWidth="1px" borderColor={accentBorder} borderRadius="12px" overflow="hidden" w="full">
            <Box h="6px" bg={formAccent} />
            <Stack gap={5} p={{ base: 5, md: 7 }}>
              <Box display="grid" gap={5} gridTemplateColumns={{ base: "1fr", lg: "6fr 4fr" }} alignItems="stretch">
                <Box
                  borderWidth="1px"
                  borderColor={accentBorder}
                  borderRadius="24px"
                  overflow="hidden"
                  bg={event.bannerUrl ? "gray.900" : accentSurface}
                  minH={{ base: "220px", md: "280px" }}
                >
                  {event.bannerUrl ? (
                    <AspectRatio ratio={16 / 9}>
                      <Image
                        src={event.bannerUrl}
                        alt=""
                        w="full"
                        h="full"
                        objectFit="cover"
                        objectPosition="center"
                        display="block"
                      />
                    </AspectRatio>
                  ) : (
                    <Flex minH={{ base: "220px", md: "280px" }} align="center" justify="center" px={6} textAlign="center">
                      <Text fontSize="sm" fontWeight="700" color="gray.600">
                        Banner not available
                      </Text>
                    </Flex>
                  )}
                </Box>

                <Box
                  borderWidth="1px"
                  borderColor={accentBorder}
                  borderRadius="24px"
                  bg="white"
                  p={{ base: 5, md: 7 }}
                  display="flex"
                  alignItems="flex-start"
                >
                  <Stack gap={5} maxW="sm" w="full">
                    <Heading fontSize={{ base: "2xl", md: "4xl", lg: "3xl" }} fontWeight="900" lineHeight="1.05" letterSpacing="0.02em" color="gray.900">
                      {event.title}
                    </Heading>
                    <Text fontSize={{ base: "sm", md: "md" }} color="gray.700" lineHeight="1.7">
                      <Text as="span" fontWeight="400">
                        By:
                      </Text>{" "}
                      <Text as="span" fontWeight="700">
                        {event.organizer}
                      </Text>
                    </Text>
                    <Stack gap={3} pt={1}>
                      <HStack gap={3} align="start">
                        <Box color="gray.500" mt={0.5}>
                          <CalendarDays size={18} />
                        </Box>
                        <Box>
                          <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
                            Starts At
                          </Text>
                          <Text mt={1} fontSize="sm" fontWeight="700" color="gray.900">
                            {formatDateTime(event.startDate)}
                          </Text>
                        </Box>
                      </HStack>
                      <HStack gap={3} align="start">
                        <Box color="gray.500" mt={0.5}>
                          <Clock3 size={18} />
                        </Box>
                        <Box>
                          <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
                            Ends At
                          </Text>
                          <Text mt={1} fontSize="sm" fontWeight="700" color="gray.900">
                            {formatDateTime(event.endDate)}
                          </Text>
                        </Box>
                      </HStack>
                      <HStack gap={3} align="start">
                        <Box color="gray.500" mt={0.5}>
                          <MapPin size={18} />
                        </Box>
                        <Box>
                          <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
                            Venue
                          </Text>
                          <Text mt={1} fontSize="sm" fontWeight="700" color="gray.900">
                            {event.location}
                          </Text>
                        </Box>
                      </HStack>
                    </Stack>
                  </Stack>
                </Box>
              </Box>

              <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                <Box borderWidth="1px" borderColor={accentBorder} borderRadius="10px" p={4}>
                  <HStack gap={3} align="start">
                    <Box color="gray.500" mt={0.5}>
                      <Ticket size={18} />
                    </Box>
                    <Box>
                      <Text fontSize="xs" fontWeight="700" color="gray.500">
                        Ticket types
                      </Text>
                      <Text mt={1} fontSize="sm" fontWeight="700">
                        {ticketTypeCount.toLocaleString()} available types
                      </Text>
                    </Box>
                  </HStack>
                </Box>
                <Box borderWidth="1px" borderColor={accentBorder} borderRadius="10px" p={4}>
                  <HStack gap={3} align="start">
                    <Box color="gray.500" mt={0.5}>
                      <ShieldCheck size={18} />
                    </Box>
                    <Box>
                      <Text fontSize="xs" fontWeight="700" color="gray.500">
                        Capacity
                      </Text>
                      <Text mt={1} fontSize="sm" fontWeight="700">
                        {availableSeats.toLocaleString()} seats remaining
                      </Text>
                    </Box>
                  </HStack>
                </Box>
              </SimpleGrid>
            </Stack>
          </Box>

          <Stack gap={5} w="full">
            <Stack gap={5} w="full">
              {shouldShowForm ? (
                <Box as="form" bg="white" borderWidth="1px" borderColor={accentBorder} borderRadius="12px" p={{ base: 5, md: 7 }}>
                  <Stack gap={7}>
                    <Stack gap={1}>
                      <Heading fontSize="xl" fontWeight="800">
                        Attendee details
                      </Heading>
                      <Text fontSize="sm" color="gray.600">
                        Required fields are marked with an asterisk.
                      </Text>
                    </Stack>

                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                      <Field.Root required>
                        <Field.Label>
                          <RequiredLabel>First name</RequiredLabel>
                        </Field.Label>
                        <Input
                          h="12"
                          borderRadius="8px"
                          placeholder="Jordan"
                          value={formValues.firstName}
                          onChange={(event) => setFormValues((current) => ({ ...current, firstName: event.target.value }))}
                        />
                      </Field.Root>
                      <Field.Root required>
                        <Field.Label>
                          <RequiredLabel>Last name</RequiredLabel>
                        </Field.Label>
                        <Input
                          h="12"
                          borderRadius="8px"
                          placeholder="Carter"
                          value={formValues.lastName}
                          onChange={(event) => setFormValues((current) => ({ ...current, lastName: event.target.value }))}
                        />
                      </Field.Root>
                      <Field.Root required>
                        <Field.Label>
                          <RequiredLabel>Email address</RequiredLabel>
                        </Field.Label>
                        <InputGroup startElement={<Mail size={16} color="#64748B" />}>
                          <Input
                            h="12"
                            borderRadius="8px"
                            placeholder="jordan@company.com"
                            value={formValues.email}
                            onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
                          />
                        </InputGroup>
                      </Field.Root>
                      <Field.Root required>
                        <Field.Label>
                          <RequiredLabel>Phone number</RequiredLabel>
                        </Field.Label>
                        <InputGroup startElement={<Phone size={16} color="#64748B" />}>
                          <Input
                            h="12"
                            borderRadius="8px"
                            placeholder="+1 (555) 000-0000"
                            value={formValues.phone}
                            onChange={(event) => setFormValues((current) => ({ ...current, phone: event.target.value }))}
                          />
                        </InputGroup>
                      </Field.Root>
                    </SimpleGrid>

                    <Box h="1px" bg={accentBorder} />

                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                      <Field.Root>
                        <Field.Label fontSize="sm" fontWeight="700">
                          Company / organization
                        </Field.Label>
                        <InputGroup startElement={<Building2 size={16} color="#64748B" />}>
                          <Input
                            h="12"
                            borderRadius="8px"
                            placeholder="Acme Corp"
                            value={formValues.company}
                            onChange={(event) => setFormValues((current) => ({ ...current, company: event.target.value }))}
                          />
                        </InputGroup>
                      </Field.Root>
                      <Field.Root>
                        <Field.Label fontSize="sm" fontWeight="700">
                          Ticket quantity
                        </Field.Label>
                        <StyledSelect
                          options={quantityOptions}
                          value={formValues.quantity}
                          onChange={(value) => setFormValues((current) => ({ ...current, quantity: value || "1" }))}
                          placeholder="Select quantity"
                        />
                      </Field.Root>
                    </SimpleGrid>

                    <Field.Root>
                      <Field.Label fontSize="sm" fontWeight="700">
                        Communication preference
                      </Field.Label>
                      <HStack gap={2} flexWrap="wrap">
                        {[{ label: "Email", icon: Mail }, { label: "SMS", icon: Phone }, { label: "Both", icon: Sparkles }].map((item) => {
                          const isSelected = formValues.communicationPreference === item.label
                          const Icon = item.icon

                          return (
                            <Button
                              key={item.label}
                              type="button"
                              variant={isSelected ? "solid" : "outline"}
                              bg={isSelected ? accentButton : "white"}
                              color={isSelected ? "white" : "gray.700"}
                              borderColor={isSelected ? accentButton : "gray.200"}
                              borderRadius="8px"
                              h="10"
                              onClick={() => setFormValues((current) => ({ ...current, communicationPreference: item.label }))}
                            >
                              <HStack gap={2}>
                                <Icon size={14} />
                                <Text as="span">{item.label}</Text>
                              </HStack>
                            </Button>
                          )
                        })}
                      </HStack>
                    </Field.Root>

                    <Field.Root>
                      <Field.Label fontSize="sm" fontWeight="700">
                        Special requirements
                      </Field.Label>
                      <Textarea
                        borderRadius="8px"
                        minH="120px"
                        placeholder="Dietary restrictions, accessibility needs, or anything the team should know."
                        value={formValues.notes}
                        onChange={(event) => setFormValues((current) => ({ ...current, notes: event.target.value }))}
                      />
                    </Field.Root>
                  </Stack>
                </Box>
              ) : (
                <RegistrationStateCard state={registrationState} nowMs={nowMs} />
              )}
            </Stack>

            {shouldShowForm ? (
              <Stack gap={5} w="full">
                <Box bg="white" borderWidth="1px" borderColor={accentBorder} borderRadius="12px" p={{ base: 5, md: 6 }}>
                  <Stack gap={5}>
                    <Stack gap={1} textAlign="center">
                      <Heading fontSize="lg" fontWeight="800">
                        Registration summary
                      </Heading>
                      <Text fontSize="sm" color="gray.600">
                        Review the event and attendee count before continuing.
                      </Text>
                    </Stack>

                    <Stack gap={3} bg={accentBackground} borderWidth="1px" borderColor={accentBorder} borderRadius="10px" p={4}>
                      <SummaryRow label="Event" value={event.title} />
                      <SummaryRow label="Start" value={formatDateTime(event.startDate)} />
                      <SummaryRow label="Venue" value={event.location} />
                      <SummaryRow label="Ticket price" value={currencyLabel} accent />
                      <SummaryRow label="Quantity" value={selectedQuantity.toLocaleString()} accent />
                      <Box h="1px" bg={accentBorder} />
                      <SummaryRow label="Estimated total" value={grandTotal} accent />
                    </Stack>

                    <Box borderWidth="1px" borderColor={`${registrationState.tone}.200`} bg={`${registrationState.tone}.50`} borderRadius="10px" p={4}>
                      <HStack gap={3} align="start">
                        <Box color={`${registrationState.tone}.700`} mt={0.5}>
                          <CheckCircle2 size={18} />
                        </Box>
                        <Box>
                          <Text fontSize="sm" fontWeight="800" color="gray.900">
                            {registrationState.title}
                          </Text>
                          <Text mt={1} fontSize="sm" color="gray.700" lineHeight="1.6">
                            {registrationState.description}
                          </Text>
                        </Box>
                      </HStack>
                    </Box>

                    <Stack gap={3}>
                      <Button minH="12" borderRadius="8px" color="white" bg={accentButton} _hover={{ bg: "gray.800" }}>
                        <HStack gap={2}>
                          <BadgeCheck size={16} />
                          <Text as="span">Review registration</Text>
                        </HStack>
                      </Button>
                      <Button minH="12" variant="outline" borderRadius="8px" onClick={onBack}>
                        Cancel
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              </Stack>
            ) : null}
          </Stack>
        </Stack>
      </Flex>
    </Box>
  )
}

export function EventRegisterPage() {
  const navigate = useNavigate()
  const { eventUniqueId = "" } = useParams<{ eventUniqueId?: string }>()
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [formValues, setFormValues] = useState(DEFAULT_FORM_VALUES)

  const eventQuery = useQuery({
    queryKey: ["event-registration", eventUniqueId],
    queryFn: () => fetchEventRegistration(eventUniqueId),
    enabled: Boolean(eventUniqueId),
    retry: 1,
  })

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    setFormValues(DEFAULT_FORM_VALUES)
  }, [eventUniqueId])

  const registration = eventQuery.data ?? null
  const event = useMemo(() => (registration ? mapRegistrationToViewModel(registration) : null), [registration])
  const availableSeats = event ? Math.max(event.capacity - event.attendees, 0) : 0
  const registrationState = useMemo(() => (event ? deriveRegistrationState(event, nowMs) : null), [event, nowMs])
  const quantityOptions = useMemo(() => buildQuantityOptions(Math.max(availableSeats, 1)), [availableSeats])
  const selectedQuantity = Number(formValues.quantity)
  const subtotal = event ? event.price * selectedQuantity : 0
  const currencyLabel = event ? formatCurrency(event.price, event.currency) : "$0"
  const grandTotal = event ? formatCurrency(subtotal, event.currency) : "$0"
  const shouldShowForm = registrationState?.kind === "open"
  const formAccent = event?.coverColor ?? "#7551FF"
  const loadErrorMessage = eventQuery.isError ? extractApiError(eventQuery.error) : ""
  const isUnavailableLoadError =
    eventQuery.isError &&
    /not available|unavailable/i.test(loadErrorMessage)

  function handleBackToEvents() {
    navigate(APP_ROUTES.events)
  }

  if (!eventUniqueId) {
    return <EventRegisterErrorState message="The registration link is missing an event identifier." onBack={handleBackToEvents} />
  }

  if (eventQuery.isLoading) {
    return <EventRegisterPageSkeleton />
  }

  if (eventQuery.isError || !event || !registrationState) {
    if (isUnavailableLoadError) {
      return (
      <EventRegisterUnavailableState
          message={loadErrorMessage}
          onBack={handleBackToEvents}
          onRetry={eventQuery.refetch}
        />
      )
    }

    return (
      <EventRegisterErrorState
        message={loadErrorMessage || "The event could not be loaded."}
        onBack={handleBackToEvents}
        onRetry={eventQuery.refetch}
      />
    )
  }

  return (
    <EnterpriseRegistrationLayout
      event={event}
      registrationState={registrationState}
      nowMs={nowMs}
      availableSeats={availableSeats}
      quantityOptions={quantityOptions}
      selectedQuantity={selectedQuantity}
      currencyLabel={currencyLabel}
      grandTotal={grandTotal}
      shouldShowForm={shouldShowForm}
      formAccent={formAccent}
      formValues={formValues}
      setFormValues={setFormValues}
      onBack={handleBackToEvents}
    />
  )

}






