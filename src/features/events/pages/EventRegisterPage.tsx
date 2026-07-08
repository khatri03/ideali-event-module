import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  AspectRatio,
  Heading,
  HStack,
  Image,
  SimpleGrid,
  Skeleton,
  SkeletonText,
  Stack,
  Text,
} from "@chakra-ui/react"
import { AlertTriangle, ArrowLeft, CalendarDays, Clock3, ExternalLink, MapPin, ShieldCheck } from "lucide-react"
import { format } from "date-fns"
import { useNavigate, useParams } from "react-router-dom"
import { client } from "@/api/client"
import { fetchEventRegistration } from "@/api/events"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import type { EventRegistrationResponse, EventRegistrationSession } from "@/api/events"

interface EventRegistrationViewModel {
  title: string
  bannerUrl: string | null
  themeColor: string | null
  timeZone: string | null
  startDate: string | null
  endDate: string | null
  bookingStartDate: string | null
  bookingEndDate: string | null
  visibility: string
  location: string
  locationMapUrl: string | null
  organizer: string
  capacity: number
  attendees: number
  price: number
  currency: string
  purchaseTimeLimitMinutes: number | null
  status: string
  coverColor: string
  canRegister: boolean
  registrationBlockedReason: string | null
  sessions: EventRegistrationSession[]
}

function parseUtcDateTime(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const hasTimeZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value)
  const normalizedValue = hasTimeZone ? value : `${value}Z`
  const date = new Date(normalizedValue)

  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateTimeForTimeZone(value: string | null | undefined, timeZone: string | null | undefined) {
  const date = parseUtcDateTime(value)

  if (!date) {
    return "Date not set"
  }

  const resolvedTimeZone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone

  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: resolvedTimeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date)
  } catch {
    return format(date, "EEE, MMM d, yyyy 'at' h:mm a")
  }
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
    locationMapUrl: registration.venueMapUrl,
    organizer: registration.organizerName ?? registration.timeZone ?? "Event registration",
    timeZone: registration.timeZone,
    capacity: Math.max(availableQuantity, ticketsSold),
    attendees: ticketsSold,
    price: lowestTicketPrice,
    currency: "USD",
    purchaseTimeLimitMinutes: null,
    status: registration.registrationStatus,
    coverColor: registration.themeColor ?? "#7551FF",
    canRegister: registration.canRegister,
    registrationBlockedReason: registration.registrationBlockedReason ?? null,
    sessions: registration.sessions,
  }
}

function EnterpriseRegistrationLayout({
  event,
  formAccent,
}: {
  event: EventRegistrationViewModel
  formAccent: string
}) {
  const accentBackground = hexToRgba(formAccent, 0.22)
  const accentSurface = hexToRgba(formAccent, 0.1)
  const accentBorder = hexToRgba(formAccent, 0.18)

  return (
    <Box minH="100dvh" bg={accentBackground} color="gray.900">
      <Flex minH="100dvh" align="center" justify="center" px={{ base: 4, md: 8, lg: 10 }} py={{ base: 6, md: 10 }}>
        <Stack gap={{ base: 5, md: 6 }} maxW="8xl" w="full" align="center">
          <Box bg="rgba(255,255,255,0.98)" borderWidth="1px" borderColor={accentBorder} borderRadius="12px" overflow="hidden" w="full">
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
                      <Box borderWidth="1px" borderColor="gray.200" borderRadius="18px" bg="gray.50" overflow="hidden">
                        <HStack gap={3} align="start" px={4} py={3} borderBottomWidth="1px" borderBottomColor="gray.200">
                          <Box color="gray.500" mt={0.5}>
                            <CalendarDays size={18} />
                          </Box>
                          <Box>
                            <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
                              Starts At
                            </Text>
                            <Text mt={1} fontSize="sm" fontWeight="700" color="gray.900">
                              {formatDateTimeForTimeZone(event.startDate, event.timeZone)}
                            </Text>
                          </Box>
                        </HStack>
                        <HStack gap={3} align="start" px={4} py={3} borderBottomWidth="1px" borderBottomColor="gray.200">
                          <Box color="gray.500" mt={0.5}>
                            <Clock3 size={18} />
                          </Box>
                          <Box>
                            <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
                              Ends At
                            </Text>
                            <Text mt={1} fontSize="sm" fontWeight="700" color="gray.900">
                              {formatDateTimeForTimeZone(event.endDate, event.timeZone)}
                            </Text>
                          </Box>
                        </HStack>
                        <HStack gap={3} align="start" px={4} py={3}>
                          <Box color="gray.500" mt={0.5}>
                            <MapPin size={18} />
                          </Box>
                          <Box>
                            <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
                              Venue
                            </Text>
                            {event.locationMapUrl ? (
                              <Box
                                as="a"
                                href={event.locationMapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open venue map in a new tab"
                                mt={1}
                                display="inline-flex"
                                alignItems="center"
                                gap={1.5}
                                fontSize="sm"
                                fontWeight="700"
                                color="blue.700"
                                textDecoration="underline"
                                textUnderlineOffset="3px"
                                cursor="pointer"
                              >
                                {event.location}
                                <ExternalLink size={14} />
                              </Box>
                            ) : (
                              <Text mt={1} fontSize="sm" fontWeight="700" color="gray.900">
                                {event.location}
                              </Text>
                            )}
                          </Box>
                        </HStack>
                      </Box>
                    </Stack>
                  </Stack>
                </Box>
              </Box>

            </Stack>
          </Box>

        </Stack>
      </Flex>
    </Box>
  )
}

export function EventRegisterPage() {
  const navigate = useNavigate()
  const { eventUniqueId = "" } = useParams<{ eventUniqueId?: string }>()
  const eventQuery = useQuery({
    queryKey: ["event-registration", eventUniqueId],
    queryFn: () => fetchEventRegistration(eventUniqueId),
    enabled: Boolean(eventUniqueId),
    retry: 1,
  })

  const registration = eventQuery.data ?? null
  const event = useMemo(() => (registration ? mapRegistrationToViewModel(registration) : null), [registration])
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

  if (eventQuery.isError || !event) {
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

  if (!event.canRegister) {
    return (
      <EventRegisterUnavailableState
        message={event.registrationBlockedReason ?? "Registration is currently unavailable for this event."}
        onBack={handleBackToEvents}
      />
    )
  }

  return (
    <EnterpriseRegistrationLayout
      event={event}
      formAccent={formAccent}
    />
  )

}






