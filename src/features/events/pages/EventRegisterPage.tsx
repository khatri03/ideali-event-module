import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge, Box, Button, Container, Flex, Heading, HStack, Image, Skeleton, SkeletonText, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { AlertTriangle, ArrowLeft, CalendarDays, MapPin, ShieldCheck, Users } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { client } from '@/api/client'
import { fetchEventRegistrationBootstrap } from '@/api/events'
import type { EventRegistrationPaymentMethod, EventRegistrationResponse, EventRegistrationSession } from '@/api/events'
import { extractApiError } from '@/utils/errors'
import { APP_ROUTES } from '@/utils/routes'
import { EventRegisterWizard } from './EventRegisterWizard'

interface EventRegistrationViewModel {
  uniqueId: string
  title: string
  bannerUrl: string | null
  themeColor: string | null
  timeZone: string | null
  startDate: string | null
  endDate: string | null
  bookingStartDate: string | null
  bookingEndDate: string | null
  purchaseTimeLimitMinutes: number
  location: string
  locationMapUrl: string | null
  organizer: string
  registrationStatus: string
  registrationBlockedReason: string | null
  canRegister: boolean
  description: string | null
  summary: string | null
  termsConditions: string | null
  isOrganizer: boolean
  paymentAccountCurrency: string | null
  paymentAccountUniqueId: string | null
  paymentMethods: EventRegistrationPaymentMethod[]
  sessions: EventRegistrationSession[]
  visibleTabs: string[]
  coverColor: string
}

interface CountdownParts {
  days: string
  hours: string
  minutes: string
  seconds: string
}

function resolveAssetUrl(value: string | null | undefined) {
  if (!value) return null
  try {
    return new URL(value, client.defaults.baseURL).toString()
  } catch {
    return value
  }
}

function parseUtcDateTime(value: string | null | undefined) {
  if (!value) return null
  const hasTimeZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value)
  const normalized = hasTimeZone ? value : `${value}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatLocalDateTime(value: string | null | undefined) {
  const date = parseUtcDateTime(value)
  if (!date) return 'Date not set'

  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return date.toLocaleString()
  }
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '').trim()
  if (normalized.length !== 6) return hex
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  if ([red, green, blue].some((channel) => Number.isNaN(channel))) return hex
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function formatCountdownParts(milliseconds: number): CountdownParts {
  const safeMilliseconds = Math.max(milliseconds, 0)
  const totalSeconds = Math.floor(safeMilliseconds / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return {
    days: days.toString(),
    hours: hours.toString().padStart(2, '0'),
    minutes: minutes.toString().padStart(2, '0'),
    seconds: seconds.toString().padStart(2, '0'),
  }
}

function CountdownTile({ label, value, accentColor }: { label: string; value: string; accentColor: string }) {
  return (
    <Box
      borderWidth='1px'
      borderColor={hexToRgba(accentColor, 0.2)}
      borderRadius='20px'
      bg={`linear-gradient(180deg, ${hexToRgba(accentColor, 0.06)}, #FFFFFF 72%)`}
      px={4}
      py={3.5}
      boxShadow={`0 14px 32px ${hexToRgba(accentColor, 0.12)}`}
    >
      <Stack gap={0.5} align='center' textAlign='center'>
        <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight='800' color={accentColor} lineHeight='1'>
          {value}
        </Text>
        <Text fontSize='xs' fontWeight='700' textTransform='uppercase' letterSpacing='0.12em' color='gray.500'>
          {label}
        </Text>
      </Stack>
    </Box>
  )
}

function BookingCountdownCard({ event, remainingMs, accentColor }: { event: EventRegistrationViewModel; remainingMs: number; accentColor: string }) {
  const countdownParts = formatCountdownParts(remainingMs)
  const accentTint = hexToRgba(accentColor, 0.08)
  const accentGlow = hexToRgba(accentColor, 0.18)
  const bookingOpensAt = formatLocalDateTime(event.bookingStartDate)

  return (
    <Box minH='100dvh' bg={`radial-gradient(circle at top, ${accentTint} 0%, rgba(255,255,255,0) 42%), linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)`} color='gray.900'>
      <Flex minH='100dvh' align='center' justify='center' px={{ base: 3, md: 6 }} py={{ base: 5, md: 8 }}>
        <Container maxW='6xl' p={0}>
          <Stack gap={5}>
            <Box
              borderWidth='1px'
              borderColor={hexToRgba(accentColor, 0.16)}
              borderRadius='32px'
              overflow='hidden'
              bg='white'
              boxShadow={`0 26px 70px ${hexToRgba(accentColor, 0.14)}`}
            >
              <Box h='6px' bg={accentColor} />
              <SimpleGrid columns={{ base: 1, lg: 12 }} gap={0}>
                <Box gridColumn={{ lg: 'span 7' }} position='relative' minH={{ base: '240px', md: '360px' }} bg='gray.100'>
                  {event.bannerUrl ? (
                    <Image src={event.bannerUrl} alt={event.title} w='full' h='full' objectFit='cover' />
                  ) : (
                    <Flex w='full' h='full' align='center' justify='center' bg='gray.100' px={6} textAlign='center'>
                      <Text fontSize='sm' fontWeight='700' color='gray.500'>
                        Banner not available
                      </Text>
                    </Flex>
                  )}
                  <Box position='absolute' inset={0} bg={`linear-gradient(135deg, ${hexToRgba(accentColor, 0.12)}, ${hexToRgba(accentColor, 0.56)})`} />
                  <Box position='absolute' left={5} bottom={5}>
                    <Badge
                      variant='solid'
                      borderRadius='full'
                      px={3}
                      py={1}
                      bg='whiteAlpha.900'
                      color={accentColor}
                      boxShadow={`0 10px 24px ${accentGlow}`}
                    >
                      Registration opens soon
                    </Badge>
                  </Box>
                </Box>

                <Box gridColumn={{ lg: 'span 5' }} p={{ base: 5, md: 6, xl: 8 }}>
                  <Stack gap={6} h='full' justify='space-between'>
                    <Stack gap={4}>
                      <Stack gap={2}>
                        <Text fontSize='xs' fontWeight='800' color={accentColor} textTransform='uppercase' letterSpacing='0.16em'>
                          Event registration
                        </Text>
                        <Heading fontSize={{ base: '2xl', md: '3xl', xl: '4xl' }} letterSpacing='-0.05em' lineHeight='1.05' color='gray.900'>
                          {event.title}
                        </Heading>
                      </Stack>

                      <Stack gap={3}>
                        <HStack gap={3} align='start'>
                          <Box w='10' h='10' borderRadius='12px' display='grid' placeItems='center' bg={accentTint} color={accentColor} flexShrink={0}>
                            <Users size={18} />
                          </Box>
                          <Stack gap={0.5}>
                            <Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.12em'>
                              Organizer
                            </Text>
                            <Text fontSize='sm' fontWeight='700' color='gray.900'>
                              {event.organizer}
                            </Text>
                          </Stack>
                        </HStack>

                        <HStack gap={3} align='start'>
                          <Box w='10' h='10' borderRadius='12px' display='grid' placeItems='center' bg={accentTint} color={accentColor} flexShrink={0}>
                            <MapPin size={18} />
                          </Box>
                          <Stack gap={0.5}>
                            <Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.12em'>
                              Venue
                            </Text>
                            <Text fontSize='sm' fontWeight='700' color='gray.900'>
                              {event.location}
                            </Text>
                          </Stack>
                        </HStack>

                        <HStack gap={3} align='start'>
                          <Box w='10' h='10' borderRadius='12px' display='grid' placeItems='center' bg={accentTint} color={accentColor} flexShrink={0}>
                            <CalendarDays size={18} />
                          </Box>
                          <Stack gap={0.5}>
                            <Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.12em'>
                              Registration opens in
                            </Text>
                            <Text fontSize='sm' fontWeight='700' color='gray.900'>
                              Wait for the countdown below
                            </Text>
                          </Stack>
                        </HStack>
                      </Stack>
                    </Stack>

                  </Stack>
                </Box>
              </SimpleGrid>
            </Box>

            <Box
              borderWidth='1px'
              borderColor={hexToRgba(accentColor, 0.14)}
              borderRadius='28px'
              bg='white'
              boxShadow={`0 18px 44px ${hexToRgba(accentColor, 0.12)}`}
              p={{ base: 5, md: 6 }}
            >
              <Stack gap={4}>
                <Stack gap={1}>
                  <Text fontSize='xs' fontWeight='800' color={accentColor} textTransform='uppercase' letterSpacing='0.16em'>
                    Booking countdown
                  </Text>
                  <Text fontSize='sm' color='gray.600' lineHeight='1.7'>
                    Registration opens when the countdown reaches zero.
                  </Text>
                  <Text fontSize='sm' fontWeight='700' color='gray.800' lineHeight='1.7'>
                    Opens locally on {bookingOpensAt}
                  </Text>
                </Stack>

                <Box role='timer' aria-live='polite' aria-atomic='true'>
                  <SimpleGrid columns={{ base: 2, sm: 4 }} gap={3}>
                    <CountdownTile label='Days' value={countdownParts.days} accentColor={accentColor} />
                    <CountdownTile label='Hours' value={countdownParts.hours} accentColor={accentColor} />
                    <CountdownTile label='Minutes' value={countdownParts.minutes} accentColor={accentColor} />
                    <CountdownTile label='Seconds' value={countdownParts.seconds} accentColor={accentColor} />
                  </SimpleGrid>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Container>
      </Flex>
    </Box>
  )
}

function EventRegisterPageSkeleton() {
  return (
    <Box minH='100dvh' bg='gray.50' color='gray.900'>
      <Container maxW='7xl' py={{ base: 4, md: 8 }}>
        <Flex justify='space-between' align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={4} mb={6}>
          <Skeleton h='42px' w='120px' borderRadius='999px' />
          <Skeleton h='32px' w='160px' borderRadius='999px' />
        </Flex>
        <SimpleGrid columns={{ base: 1, xl: 12 }} gap={6} alignItems='start'>
          <Stack gap={6} gridColumn={{ xl: 'span 8' }}>
            <Skeleton h={{ base: '220px', md: '260px' }} borderRadius='28px' />
            <Box bg='white' borderWidth='1px' borderColor='gray.200' borderRadius='28px' p={{ base: 5, md: 8 }}><SkeletonText noOfLines={7} /></Box>
          </Stack>
          <Stack gap={6} gridColumn={{ xl: 'span 4' }}>
            <Box bg='white' borderWidth='1px' borderColor='gray.200' borderRadius='28px' p={{ base: 5, md: 6 }}><SkeletonText noOfLines={8} /></Box>
            <Box bg='white' borderWidth='1px' borderColor='gray.200' borderRadius='28px' p={{ base: 5, md: 6 }}><SkeletonText noOfLines={6} /></Box>
          </Stack>
        </SimpleGrid>
      </Container>
    </Box>
  )
}

function EventRegisterErrorState({ message, onBack, onRetry }: { message: string; onBack: () => void; onRetry?: () => void }) {
  return (
    <Box minH='100dvh' bg='gray.50' color='gray.900'>
      <Container maxW='4xl' py={{ base: 8, md: 16 }}>
        <Stack gap={6} align='center' textAlign='center' bg='white' borderWidth='1px' borderColor='gray.200' borderRadius='32px' p={{ base: 6, md: 10 }} boxShadow='0 24px 60px rgba(15, 23, 42, 0.08)'>
          <Box w='72px' h='72px' borderRadius='24px' display='grid' placeItems='center' bg='red.50' color='red.600'><AlertTriangle size={30} /></Box>
          <Stack gap={2} maxW='2xl'>
            <Heading fontSize={{ base: '2xl', md: '3xl' }} letterSpacing='-0.04em'>Registration could not be loaded</Heading>
            <Text color='gray.600' lineHeight='1.7'>{message}</Text>
          </Stack>
          <HStack gap={3} flexWrap='wrap' justify='center'>
            <Button minH='12' borderRadius='16px' variant='outline' onClick={onBack}><HStack gap={2}><ArrowLeft size={16} /><Text as='span'>Go back</Text></HStack></Button>
            {onRetry ? <Button minH='12' borderRadius='16px' color='white' bg='gray.900' onClick={onRetry}>Retry</Button> : null}
          </HStack>
        </Stack>
      </Container>
    </Box>
  )
}

function EventRegisterUnavailableState({ message, onBack, onRetry }: { message: string; onBack: () => void; onRetry?: () => void }) {
  return (
    <Box minH='100dvh' bg='gray.50' color='gray.900'>
      <Container maxW='4xl' py={{ base: 8, md: 16 }}>
        <Stack gap={6} align='center' textAlign='center' bg='white' borderWidth='1px' borderColor='amber.200' borderRadius='32px' p={{ base: 6, md: 10 }} boxShadow='0 24px 60px rgba(15, 23, 42, 0.08)'>
          <Box w='72px' h='72px' borderRadius='24px' display='grid' placeItems='center' bg='amber.50' color='amber.600'><ShieldCheck size={30} /></Box>
          <Stack gap={2} maxW='2xl'>
            <Heading fontSize={{ base: '2xl', md: '3xl' }} letterSpacing='-0.04em'>Registration is not available yet</Heading>
            <Text color='gray.600' lineHeight='1.7'>{message}</Text>
          </Stack>
          <HStack gap={3} flexWrap='wrap' justify='center'>
            <Button minH='12' borderRadius='16px' variant='outline' onClick={onBack}><HStack gap={2}><ArrowLeft size={16} /><Text as='span'>Go back</Text></HStack></Button>
            {onRetry ? <Button minH='12' borderRadius='16px' color='white' bg='gray.900' onClick={onRetry}>Retry</Button> : null}
          </HStack>
        </Stack>
      </Container>
    </Box>
  )
}

function mapRegistrationToViewModel(registration: EventRegistrationResponse): EventRegistrationViewModel {
  return {
    uniqueId: registration.uniqueId,
    title: registration.name,
    bannerUrl: resolveAssetUrl(registration.bannerUrl),
    themeColor: registration.themeColor,
    timeZone: registration.timeZone,
    startDate: registration.startDate,
    endDate: registration.endDate,
    bookingStartDate: registration.bookingStartDate,
    bookingEndDate: registration.bookingEndDate,
    purchaseTimeLimitMinutes: registration.purchaseTimeLimitMinutes,
    location: registration.venueName ?? 'Venue not set',
    locationMapUrl: registration.venueMapUrl,
    organizer: registration.organizerName ?? 'Event registration',
    registrationStatus: registration.registrationStatus,
    registrationBlockedReason: registration.registrationBlockedReason ?? null,
    canRegister: registration.canRegister,
    description: registration.description,
    summary: registration.summary,
    termsConditions: registration.termsConditions,
    isOrganizer: registration.isOrganizer,
    paymentAccountCurrency: registration.paymentAccountCurrency,
    paymentAccountUniqueId: registration.paymentAccountUniqueId,
    paymentMethods: registration.paymentMethods,
    sessions: registration.sessions,
    visibleTabs: registration.visibleTabs,
    coverColor: registration.themeColor ?? '#7551FF',
  }
}

export function EventRegisterPage() {
  const navigate = useNavigate()
  const { eventUniqueId = '' } = useParams<{ eventUniqueId?: string }>()
  const eventQuery = useQuery({
    queryKey: ['event-registration', eventUniqueId],
    queryFn: () => fetchEventRegistrationBootstrap(eventUniqueId),
    enabled: Boolean(eventUniqueId),
    retry: 1,
  })

  const registration = eventQuery.data ?? null
  const event = useMemo(() => (registration ? mapRegistrationToViewModel(registration) : null), [registration])
  const formAccent = event?.coverColor ?? '#7551FF'
  const bookingStartAt = useMemo(() => parseUtcDateTime(event?.bookingStartDate), [event?.bookingStartDate])
  const [now, setNow] = useState(() => Date.now())
  const bookingOpenRef = useRef(false)
  const loadErrorMessage = eventQuery.isError ? extractApiError(eventQuery.error) : ''
  const isUnavailableLoadError = eventQuery.isError && /not available|unavailable/i.test(loadErrorMessage)

  useEffect(() => {
    if (!bookingStartAt) return

    const timer = window.setInterval(() => {
      const currentNow = Date.now()
      setNow(currentNow)

      if (currentNow >= bookingStartAt.getTime()) {
        window.clearInterval(timer)
      }
    }, 1000)

    return () => window.clearInterval(timer)
  }, [bookingStartAt])

  const bookingStartAtTime = bookingStartAt?.getTime()
  const refetchEvent = eventQuery.refetch

  useEffect(() => {
    bookingOpenRef.current = false
  }, [eventUniqueId, bookingStartAtTime])

  useEffect(() => {
    if (!event || !bookingStartAt) return
    if (now < bookingStartAt.getTime()) return
    if (bookingOpenRef.current) return

    bookingOpenRef.current = true
    void refetchEvent()
  }, [bookingStartAt, event, refetchEvent, now])

  function handleBackToEvents() {
    navigate(APP_ROUTES.events)
  }

  if (!eventUniqueId) {
    return <EventRegisterErrorState message='The registration link is missing an event identifier.' onBack={handleBackToEvents} />
  }

  if (eventQuery.isLoading) {
    return <EventRegisterPageSkeleton />
  }

  if (eventQuery.isError || !event) {
    if (isUnavailableLoadError) {
      return <EventRegisterUnavailableState message={loadErrorMessage} onBack={handleBackToEvents} onRetry={eventQuery.refetch} />
    }

    return <EventRegisterErrorState message={loadErrorMessage || 'The event could not be loaded.'} onBack={handleBackToEvents} onRetry={eventQuery.refetch} />
  }

  if (bookingStartAt && now < bookingStartAt.getTime()) {
    return <BookingCountdownCard event={event} remainingMs={bookingStartAt.getTime() - now} accentColor={formAccent} />
  }

  if (!event.canRegister) {
    return <EventRegisterUnavailableState message={event.registrationBlockedReason ?? 'Registration is currently unavailable for this event.'} onBack={handleBackToEvents} />
  }

  return <EventRegisterWizard event={event} formAccent={formAccent} onBack={handleBackToEvents} />
}
