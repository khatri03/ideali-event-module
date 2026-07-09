import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Box, Button, Container, Flex, Heading, HStack, Skeleton, SkeletonText, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { AlertTriangle, ArrowLeft, ShieldCheck } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { client } from '@/api/client'
import { fetchEventRegistration } from '@/api/events'
import type { EventRegistrationPaymentMethod, EventRegistrationResponse, EventRegistrationSession } from '@/api/events'
import { extractApiError } from '@/utils/errors'
import { APP_ROUTES } from '@/utils/routes'
import { EventRegisterWizard } from './EventRegisterWizard'

interface EventRegistrationViewModel {
  title: string
  bannerUrl: string | null
  themeColor: string | null
  timeZone: string | null
  startDate: string | null
  endDate: string | null
  bookingStartDate: string | null
  bookingEndDate: string | null
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
  paymentMethods: EventRegistrationPaymentMethod[]
  sessions: EventRegistrationSession[]
  coverColor: string
}

function resolveAssetUrl(value: string | null | undefined) {
  if (!value) return null
  try {
    return new URL(value, client.defaults.baseURL).toString()
  } catch {
    return value
  }
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
    title: registration.name,
    bannerUrl: resolveAssetUrl(registration.bannerUrl),
    themeColor: registration.themeColor,
    timeZone: registration.timeZone,
    startDate: registration.startDate,
    endDate: registration.endDate,
    bookingStartDate: registration.bookingStartDate,
    bookingEndDate: registration.bookingEndDate,
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
    paymentMethods: registration.paymentMethods,
    sessions: registration.sessions,
    coverColor: registration.themeColor ?? '#7551FF',
  }
}

export function EventRegisterPage() {
  const navigate = useNavigate()
  const { eventUniqueId = '' } = useParams<{ eventUniqueId?: string }>()
  const eventQuery = useQuery({
    queryKey: ['event-registration', eventUniqueId],
    queryFn: () => fetchEventRegistration(eventUniqueId),
    enabled: Boolean(eventUniqueId),
    retry: 1,
  })

  const registration = eventQuery.data ?? null
  const event = useMemo(() => (registration ? mapRegistrationToViewModel(registration) : null), [registration])
  const formAccent = event?.coverColor ?? '#7551FF'
  const loadErrorMessage = eventQuery.isError ? extractApiError(eventQuery.error) : ''
  const isUnavailableLoadError = eventQuery.isError && /not available|unavailable/i.test(loadErrorMessage)

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

  if (!event.canRegister) {
    return <EventRegisterUnavailableState message={event.registrationBlockedReason ?? 'Registration is currently unavailable for this event.'} onBack={handleBackToEvents} />
  }

  return <EventRegisterWizard event={event} formAccent={formAccent} onBack={handleBackToEvents} />
}
