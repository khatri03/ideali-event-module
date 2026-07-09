import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AspectRatio,
  Badge,
  Box,
  Button,
  Checkbox,
  CloseButton,
  Container,
  Dialog,
  Flex,
  Heading,
  HStack,
  Image,
  Link,
  Separator,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
} from '@chakra-ui/react'
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  CreditCard,
  ExternalLink,
  FileText,
  MapPin,
  MessageSquareText,
  Check,
  Users,
} from 'lucide-react'
import { format } from 'date-fns'
import type {
  EventRegistrationPaymentMethod,
  EventRegistrationSession,
  EventRegistrationTicket,
} from '@/api/events'
import {
  CONTROL_BUTTON_OUTLINE,
  CONTROL_BUTTON_PRIMARY,
} from '@/components/common/controlStyles'

const LOCAL_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

type WizardTabId = 'description' | 'sessions' | 'attendee-info' | 'questionnaire' | 'payment'

interface BannerSlide {
  imageUrl: string
}

export interface EventRegisterWizardEvent {
  title: string
  bannerUrl: string | null
  themeColor: string | null
  startDate: string | null
  endDate: string | null
  bookingStartDate: string | null
  bookingEndDate: string | null
  description: string | null
  summary: string | null
  termsConditions: string | null
  location: string
  locationMapUrl: string | null
  organizer: string
  timeZone: string | null
  registrationStatus: string
  canRegister: boolean
  registrationBlockedReason: string | null
  isOrganizer: boolean
  paymentMethods: EventRegistrationPaymentMethod[]
  sessions: EventRegistrationSession[]
}

function parseUtcDateTime(value: string | null | undefined) {
  if (!value) return null
  const hasTimeZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value)
  const normalized = hasTimeZone ? value : `${value}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateTime(value: string | null | undefined, timeZone = LOCAL_TIME_ZONE) {
  const date = parseUtcDateTime(value)
  if (!date) return 'Date not set'
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(date)
  } catch {
    return format(date, "EEE, MMM d, yyyy 'at' h:mm a")
  }
}

function formatDateTimeRange(startDate: string | null | undefined, endDate: string | null | undefined) {
  const start = formatDateTime(startDate)
  const end = formatDateTime(endDate)
  if (start === 'Date not set' && end === 'Date not set') return 'Not set'
  if (start === end) return start
  return `${start} - ${end}`
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

function formatAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 'Free'
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function isHtmlContent(value: string | null | undefined) {
  return Boolean(value && /<[^>]+>/.test(value))
}

function getVisiblePaymentMethods(event: EventRegisterWizardEvent) {
  return event.paymentMethods.filter((method) => !method.isOrganizerOnly || event.isOrganizer)
}

function getVisibleTabs(event: EventRegisterWizardEvent) {
  const tabs: Array<{ id: WizardTabId; label: string; icon: typeof FileText }> = []
  if (Boolean(event.description?.trim() || event.summary?.trim())) tabs.push({ id: 'description', label: 'Description', icon: FileText })
  tabs.push({ id: 'sessions', label: 'Sessions', icon: CalendarDays })
  if (event.sessions.some((session) => session.requiresAttendeeInfo)) tabs.push({ id: 'attendee-info', label: 'Attendee Info', icon: Users })
  if (event.sessions.some((session) => session.customForms.length > 0 || session.customQuestions.length > 0)) tabs.push({ id: 'questionnaire', label: 'Questionnaire', icon: MessageSquareText })
  if (getVisiblePaymentMethods(event).length > 0) tabs.push({ id: 'payment', label: 'Payment', icon: CreditCard })
  return tabs
}

function getStepIndex(tabs: Array<{ id: WizardTabId }>, stepId: WizardTabId) {
  return tabs.findIndex((item) => item.id === stepId)
}

function getTicketPricePeriod(ticket: EventRegistrationTicket) {
  const now = new Date()
  return ticket.pricePeriods.find((period) => {
    const start = parseUtcDateTime(period.startDateTime)
    const end = parseUtcDateTime(period.endDateTime)
    return Boolean(start && end && start <= now && now <= end)
  })
}

function getTicketRemaining(ticket: EventRegistrationTicket) {
  if (ticket.availableForSale !== null && ticket.availableForSale !== undefined) return ticket.availableForSale
  if (ticket.totalQuantity !== null && ticket.totalQuantity !== undefined) return Math.max(ticket.totalQuantity - (ticket.ticketsSold ?? 0), 0)
  return null
}

function AutoImageCarousel({ slides, accentColor, height = { base: '220px', md: '320px' } }: { slides: BannerSlide[]; accentColor: string; height?: { base: string; md: string } }) {
  const [activeSlide, setActiveSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length)
    }, 5000)

    return () => window.clearInterval(timer)
  }, [slides.length, isPaused])

  useEffect(() => {
    setActiveSlide(0)
  }, [slides])

  if (slides.length === 0) {
    return null
  }

  return (
    <Box
      position='relative'
      h={height}
      overflow='hidden'
      borderRadius='24px'
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      bg='gray.100'
    >
      {slides.map((slide, index) => (
        <Box
          key={`${slide.imageUrl}-${index}`}
          position='absolute'
          inset={0}
          opacity={index === activeSlide ? 1 : 0}
          transition='opacity 700ms ease'
          pointerEvents={index === activeSlide ? 'auto' : 'none'}
        >
          <Image src={slide.imageUrl} alt='' aria-hidden='true' w='full' h='full' objectFit='cover' objectPosition='center' />
        </Box>
      ))}

      {slides.length > 1 ? (
        <Box position='absolute' left={0} right={0} bottom={4}>
          <HStack gap={2} justify='center'>
            {slides.map((slide, index) => (
              <Button
                key={`${slide.imageUrl}-dot-${index}`}
                aria-label={`Show slide ${index + 1}`}
                onClick={() => setActiveSlide(index)}
                w='10px'
                h='10px'
                minW='10px'
                p={0}
                borderRadius='full'
                borderWidth='1px'
                borderColor='whiteAlpha.500'
                bg={index === activeSlide ? accentColor : 'whiteAlpha.400'}
                boxShadow={index === activeSlide ? `0 0 0 3px ${hexToRgba(accentColor, 0.25)}` : 'none'}
                transition='all 0.2s ease'
              />
            ))}
          </HStack>
        </Box>
      ) : null}

    </Box>
  )
}

function getSessionBannerSlides(event: EventRegisterWizardEvent) {
  const slides: BannerSlide[] = []

  if (event.bannerUrl) {
    slides.push({
      imageUrl: event.bannerUrl,
    })
  }

  event.sessions.forEach((session) => {
    if (!session.bannerUrl) return
    slides.push({
      imageUrl: session.bannerUrl,
    })
  })

  return slides
}

function RichTextBlock({ html }: { html: string }) {
  return (
    <Box color='gray.700' lineHeight='1.75' dangerouslySetInnerHTML={{ __html: html }} />
  )
}

function SupportCard({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Box borderWidth='1px' borderColor='gray.200' borderRadius='24px' bg='white' p={{ base: 5, md: 6 }} boxShadow='0 16px 40px rgba(15, 23, 42, 0.06)'>
      <HStack gap={4} align='start' mb={4}>
        <Flex w='12' h='12' borderRadius='16px' align='center' justify='center' bg='gray.100' color='gray.700'>{icon}</Flex>
        <Stack gap={1} flex='1'>
          <Heading fontSize='lg' color='gray.900' letterSpacing='-0.02em'>{title}</Heading>
          {subtitle ? <Text fontSize='sm' color='gray.500' lineHeight='1.6'>{subtitle}</Text> : null}
        </Stack>
      </HStack>
      {children}
    </Box>
  )
}

function SessionTicketCard({ ticket }: { ticket: EventRegistrationTicket }) {
  const activePricePeriod = getTicketPricePeriod(ticket)
  const remaining = getTicketRemaining(ticket)
  const price = activePricePeriod?.amount ?? ticket.fullPrice

  return (
    <Box borderWidth='1px' borderColor='gray.200' borderRadius='20px' p={4} bg='gray.50'>
      <Flex justify='space-between' gap={4} align='start' wrap='wrap'>
        <Stack gap={1} flex='1' minW='220px'>
          <Text fontWeight='700' color='gray.900'>{ticket.name}</Text>
          {ticket.description ? <Text fontSize='sm' color='gray.600' lineHeight='1.6'>{ticket.description}</Text> : null}
        </Stack>
        <Stack gap={1} align='end'>
          <Text fontSize='xl' fontWeight='800' color='gray.900'>{formatAmount(price)}</Text>
          <Text fontSize='xs' color='gray.500' textTransform='uppercase' letterSpacing='0.12em'>per ticket</Text>
        </Stack>
      </Flex>
      <HStack gap={2} mt={4} flexWrap='wrap'>
        <Badge colorPalette={ticket.isActive ? 'green' : 'gray'} variant='subtle' borderRadius='full' px={3} py={1}>{ticket.isActive ? 'Active' : 'Inactive'}</Badge>
        <Badge colorPalette='gray' variant='subtle' borderRadius='full' px={3} py={1}>{remaining === null ? 'Availability not set' : `${remaining} available`}</Badge>
        <Badge colorPalette={activePricePeriod ? 'blue' : 'gray'} variant='subtle' borderRadius='full' px={3} py={1}>{activePricePeriod?.name ?? 'Standard price'}</Badge>
      </HStack>
      {ticket.pricePeriods.length > 0 ? (
        <Stack gap={3} mt={4}>
          <Separator borderColor='gray.200' />
          <Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.14em'>Pricing windows</Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
            {ticket.pricePeriods.map((period) => (
              <Box key={period.uniqueId} borderWidth='1px' borderColor='gray.200' borderRadius='16px' bg='white' p={3}>
                <Flex justify='space-between' gap={3} align='start' wrap='wrap'>
                  <Stack gap={1}>
                    <Text fontSize='sm' fontWeight='700' color='gray.900'>{period.name ?? 'Price window'}</Text>
                    <Text fontSize='xs' color='gray.500'>{formatDateTimeRange(period.startDateTime, period.endDateTime)}</Text>
                  </Stack>
                  <Stack gap={1} align='end'>
                    <Text fontSize='sm' fontWeight='700' color='gray.900'>{formatAmount(period.amount)}</Text>
                    <Badge colorPalette={period.uniqueId === activePricePeriod?.uniqueId ? 'green' : 'gray'} variant='subtle' borderRadius='full' px={2} py={0.5}>{period.currentStatus}</Badge>
                  </Stack>
                </Flex>
              </Box>
            ))}
          </SimpleGrid>
        </Stack>
      ) : null}
    </Box>
  )
}

function SessionSection({ session }: { session: EventRegistrationSession }) {
  return (
    <Box borderWidth='1px' borderColor='gray.200' borderRadius='24px' bg='white' p={{ base: 4, md: 6 }}>
      <Stack gap={5}>
        <Flex justify='space-between' align='start' gap={4} wrap='wrap'>
          <Stack gap={2} flex='1' minW='240px'>
            <Heading fontSize='xl' color='gray.900' letterSpacing='-0.02em'>{session.name}</Heading>
            {session.description ? <Text color='gray.600' fontSize='sm' lineHeight='1.7'>{session.description}</Text> : null}
          </Stack>
          <Stack gap={2} align='end'>
            <Badge colorPalette='gray' variant='subtle' borderRadius='full' px={3} py={1}>{session.setupState}</Badge>
            <Badge colorPalette='gray' variant='outline' borderRadius='full' px={3} py={1}>{session.bookingStatus}</Badge>
          </Stack>
        </Flex>

        <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
          <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='gray.50' p={4}>
            <Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.12em'>Starts At</Text>
            <Text mt={2} fontSize='sm' fontWeight='700' color='gray.900'>{formatDateTime(session.startDate)}</Text>
          </Box>
          <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='gray.50' p={4}>
            <Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.12em'>Ends At</Text>
            <Text mt={2} fontSize='sm' fontWeight='700' color='gray.900'>{formatDateTime(session.endDate)}</Text>
          </Box>
          <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='gray.50' p={4}>
            <Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.12em'>Booking Window</Text>
            <Text mt={2} fontSize='sm' fontWeight='700' color='gray.900'>{formatDateTimeRange(session.bookingStartDate, session.bookingEndDate)}</Text>
          </Box>
        </SimpleGrid>

        {session.ticketTypes.length > 0 ? (
          <Stack gap={3}>
            <Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.14em'>Available Tickets</Text>
            <Stack gap={3}>{session.ticketTypes.map((ticket) => <SessionTicketCard key={ticket.uniqueId} ticket={ticket} />)}</Stack>
          </Stack>
        ) : (
          <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' p={4} bg='gray.50'>
            <Text color='gray.600' fontSize='sm'>No tickets are currently mapped to this session.</Text>
          </Box>
        )}
      </Stack>
    </Box>
  )
}

export function EventRegisterWizard({ event, formAccent, onBack }: { event: EventRegisterWizardEvent; formAccent: string; onBack: () => void }) {
  const accentBackground = hexToRgba(formAccent, 0.18)
  const tabs = useMemo(() => getVisibleTabs(event), [event])
  const bannerSlides = useMemo(() => getSessionBannerSlides(event), [event])
  const firstTab = tabs[0]?.id ?? 'sessions'
  const [activeTab, setActiveTab] = useState<WizardTabId>(firstTab)
  const [highestUnlockedIndex, setHighestUnlockedIndex] = useState(0)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)

  useEffect(() => {
    setActiveTab(firstTab)
    setHighestUnlockedIndex(0)
  }, [firstTab])

  const activeIndex = getStepIndex(tabs, activeTab)
  const visiblePaymentMethods = getVisiblePaymentMethods(event)

  function isStepEnabled(stepId: WizardTabId) {
    const index = getStepIndex(tabs, stepId)
    return index >= 0 && index <= highestUnlockedIndex
  }

  function handleStepChange(stepId: string) {
    if (isStepEnabled(stepId as WizardTabId)) setActiveTab(stepId as WizardTabId)
  }

  function handleContinue() {
    if (activeIndex < 0 || activeIndex >= tabs.length - 1) return
    const nextIndex = activeIndex + 1
    setHighestUnlockedIndex((current) => Math.max(current, nextIndex))
    setActiveTab(tabs[nextIndex].id)
  }

  function handleBackStep() {
    if (activeIndex <= 0) {
      onBack()
      return
    }

    setActiveTab(tabs[activeIndex - 1].id)
  }

  return (
    <Box minH='100dvh' bg={accentBackground} color='gray.900'>
      <Flex minH='100dvh' align='center' justify='center' px={{ base: 3, md: 6, xl: 8 }} py={{ base: 5, md: 8 }}>
        <Container maxW='8xl' p={0}>
          <Stack gap={6}>
            <Box bg='white' borderWidth='1px' borderColor='blackAlpha.100' borderRadius='28px' overflow='hidden' boxShadow='0 24px 60px rgba(15, 23, 42, 0.08)'>
              <Box h='6px' bg={formAccent} />
              <Box p={{ base: 4, md: 6 }}>
                <SimpleGrid columns={{ base: 1, lg: 12 }} gap={6} alignItems='stretch'>
                  <Box gridColumn={{ lg: 'span 8' }} borderWidth='1px' borderColor='gray.200' borderRadius='24px' overflow='hidden' bg='gray.100'>
                    {bannerSlides.length > 0 ? (
                      <AutoImageCarousel slides={bannerSlides} accentColor={formAccent} />
                    ) : (
                      <Flex minH={{ base: '220px', md: '320px' }} align='center' justify='center' px={6} textAlign='center'><Text fontSize='sm' fontWeight='700' color='gray.500'>Banner not available</Text></Flex>
                    )}
                  </Box>
                  <Box gridColumn={{ lg: 'span 4' }} borderWidth='1px' borderColor='gray.200' borderRadius='24px' bg='white' p={{ base: 5, md: 6 }}>
                    <Stack gap={4} h='full' justify='space-between'>
                      <Stack gap={3}>
                        <Heading fontSize={{ base: '2xl', md: '3xl' }} lineHeight='1.08' letterSpacing='-0.04em' color='gray.900'>{event.title}</Heading>
                        <Text fontSize={{ base: 'sm', md: 'md' }} color='gray.700' lineHeight='1.7'><Text as='span' fontWeight='400'>By:</Text>{' '}<Text as='span' fontWeight='700' color='gray.900'>{event.organizer}</Text></Text>
                        {event.summary ? <Text fontSize='sm' color='gray.600' lineHeight='1.7'>{event.summary}</Text> : null}
                      </Stack>
                      <Stack gap={3}>
                        <Box borderWidth='1px' borderColor='gray.200' borderRadius='20px' bg='gray.50' overflow='hidden'>
                          <HStack gap={3} align='start' px={4} py={3} borderBottomWidth='1px' borderBottomColor='gray.200'><Box color='gray.500' mt={0.5}><CalendarDays size={18} /></Box><Box><Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.12em'>Starts At</Text><Text mt={1} fontSize='sm' fontWeight='700' color='gray.900'>{formatDateTime(event.startDate)}</Text></Box></HStack>
                          <HStack gap={3} align='start' px={4} py={3} borderBottomWidth='1px' borderBottomColor='gray.200'><Box color='gray.500' mt={0.5}><ChevronRight size={18} /></Box><Box><Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.12em'>Ends At</Text><Text mt={1} fontSize='sm' fontWeight='700' color='gray.900'>{formatDateTime(event.endDate)}</Text></Box></HStack>
                          <HStack gap={3} align='start' px={4} py={3}><Box color='gray.500' mt={0.5}><MapPin size={18} /></Box><Box><Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.12em'>Venue</Text>{event.locationMapUrl ? <Link href={event.locationMapUrl} target='_blank' rel='noopener noreferrer' mt={1} display='inline-flex' alignItems='center' gap={1.5} fontSize='sm' fontWeight='700' color={formAccent} textDecoration='underline' textUnderlineOffset='3px' title='Open venue location in a new tab'>{event.location}<ExternalLink size={14} /></Link> : <Text mt={1} fontSize='sm' fontWeight='700' color='gray.900'>{event.location}</Text>}</Box></HStack>
                        </Box>
                      </Stack>
                    </Stack>
                  </Box>
                </SimpleGrid>
              </Box>
            </Box>

            {event.termsConditions ? (
              <Box position='sticky' top={{ base: 2, md: 4 }} zIndex={20}>
                <Box borderWidth='1px' borderColor='gray.200' borderRadius='20px' bg='white' px={{ base: 4, md: 5 }} py={4} boxShadow='0 12px 30px rgba(15, 23, 42, 0.08)'>
                  <Flex justify='space-between' align={{ base: 'stretch', md: 'center' }} gap={4} direction={{ base: 'column', md: 'row' }}>
                    <Checkbox.Root checked={termsAccepted} onCheckedChange={(details) => setTermsAccepted(details.checked === true)}><Checkbox.HiddenInput /><Checkbox.Control borderColor='gray.300' borderRadius='8px' bg='white' _checked={{ bg: formAccent, borderColor: formAccent }} /><Checkbox.Label color='gray.700' fontSize='sm' fontWeight='600'>I accept the registration terms and conditions.</Checkbox.Label></Checkbox.Root>
                    <Button variant='ghost' color={formAccent} fontWeight='700' onClick={() => setTermsOpen(true)} alignSelf={{ base: 'flex-start', md: 'center' }}>View terms</Button>
                  </Flex>
                </Box>
              </Box>
            ) : null}

            <Box bg='white' borderWidth='1px' borderColor='blackAlpha.100' borderRadius='28px' p={{ base: 4, md: 6 }} boxShadow='0 24px 60px rgba(15, 23, 42, 0.08)'>
              <Tabs.Root value={activeTab} onValueChange={(details) => handleStepChange(details.value)} activationMode='manual'>
                <Tabs.List
                  display='grid'
                  gap={3}
                  borderWidth='1px'
                  borderColor='gray.200'
                  borderRadius='22px'
                  bg='gray.50'
                  p={3}
                  mb={6}
                  gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: `repeat(${tabs.length}, minmax(0, 1fr))` }}
                >
                  {tabs.map((tab, index) => {
                    const enabled = index <= highestUnlockedIndex
                    const complete = index < activeIndex
                    const isActive = activeTab === tab.id
                    const IconComponent = tab.icon
                    return (
                      <Tabs.Trigger
                        key={tab.id}
                        value={tab.id}
                        disabled={!enabled}
                        borderWidth='1px'
                        borderColor={enabled ? (isActive ? formAccent : complete ? 'green.300' : 'gray.200') : 'gray.200'}
                        borderRadius='18px'
                        px={4}
                        py={9}
                        minH='32'
                        w='full'
                        justifyContent='center'
                        bg={isActive ? hexToRgba(formAccent, 0.12) : complete ? 'green.50' : enabled ? 'white' : 'gray.50'}
                        color={enabled ? 'gray.900' : 'gray.400'}
                        _hover={{ bg: enabled ? (isActive ? hexToRgba(formAccent, 0.16) : complete ? 'green.100' : hexToRgba(formAccent, 0.06)) : 'gray.50' }}
                        _disabled={{ opacity: 0.45, cursor: 'not-allowed' }}
                        boxShadow={isActive ? `0 0 0 1px ${formAccent} inset` : 'none'}
                      >
                        <Stack gap={2} align='center' textAlign='center' w='full'>
                          <Flex
                            w='11'
                            h='11'
                            borderRadius='full'
                            align='center'
                            justify='center'
                            bg={isActive ? formAccent : complete ? 'green.500' : 'gray.200'}
                            color={isActive || complete ? 'white' : 'gray.600'}
                            fontSize='sm'
                            fontWeight='800'
                            boxShadow={isActive ? `0 0 0 4px ${hexToRgba(formAccent, 0.12)}` : 'none'}
                          >
                            {complete && !isActive ? <Check size={13} /> : String(index + 1).padStart(2, '0')}
                          </Flex>
                          <HStack gap={1.5} justify='center' flexWrap='wrap'>
                            <IconComponent size={16} />
                            <Text as='span' fontWeight='700' fontSize='sm'>{tab.label}</Text>
                          </HStack>
                        </Stack>
                      </Tabs.Trigger>
                    )
                  })}
                </Tabs.List>

                {tabs.map((tab) => (
                  <Tabs.Content key={tab.id} value={tab.id}>
                    <Stack gap={6}>
                      <Box
                        maxH={{ base: '60vh', md: '62vh', xl: '64vh' }}
                        overflowY='auto'
                        pr={{ base: 1, md: 2 }}
                      >
                        <Stack gap={6}>
                          {tab.id === 'description' ? (
                            <SupportCard title='Description' subtitle='Event overview and key details.' icon={<FileText size={18} />}>
                              <Stack gap={4}>
                                {event.summary ? <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='gray.50' p={4}><Text fontSize='sm' fontWeight='700' color='gray.900' mb={2}>Summary</Text><Text color='gray.700' lineHeight='1.7'>{event.summary}</Text></Box> : null}
                                {event.description ? <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='white' p={5}>{isHtmlContent(event.description) ? <RichTextBlock html={event.description} /> : <Text color='gray.700' lineHeight='1.7'>{event.description}</Text>}</Box> : null}
                              </Stack>
                            </SupportCard>
                          ) : null}

                          {tab.id === 'sessions' ? (
                            <SupportCard title='Sessions' subtitle='Choose from the configured sessions and review available ticket windows.' icon={<CalendarDays size={18} />}>
                              <Stack gap={4}>
                                {event.sessions.map((session) => <SessionSection key={session.uniqueId} session={session} />)}
                              </Stack>
                            </SupportCard>
                          ) : null}

                          {tab.id === 'attendee-info' ? (
                            <SupportCard title='Attendee Info' subtitle='These sessions require attendee details before registration can continue.' icon={<Users size={18} />}>
                              <Stack gap={4}>{event.sessions.filter((session) => session.requiresAttendeeInfo).map((session) => <Box key={session.uniqueId} borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='gray.50' p={4}><HStack justify='space-between' gap={4} align='start' flexWrap='wrap'><Stack gap={1}><Text fontWeight='700' color='gray.900'>{session.name}</Text><Text fontSize='sm' color='gray.600'>Attendee information will be collected for this session.</Text></Stack><Badge colorPalette='blue' variant='subtle' borderRadius='full' px={3} py={1}>Required</Badge></HStack></Box>)}</Stack>
                            </SupportCard>
                          ) : null}

                          {tab.id === 'questionnaire' ? (
                            <SupportCard title='Questionnaire' subtitle='Custom forms and questions mapped to the sessions are rendered here.' icon={<MessageSquareText size={18} />}>
                              <Stack gap={5}>{event.sessions.filter((session) => session.customForms.length > 0 || session.customQuestions.length > 0).map((session) => <Box key={session.uniqueId} borderWidth='1px' borderColor='gray.200' borderRadius='20px' p={5} bg='gray.50'><Stack gap={4}><Box><Text fontSize='lg' fontWeight='700' color='gray.900'>{session.name}</Text><Text fontSize='sm' color='gray.600'>Questionnaire content mapped to this session.</Text></Box>{session.customForms.length > 0 ? <Stack gap={3}><Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.14em'>Custom Forms</Text><SimpleGrid columns={{ base: 1, lg: 2 }} gap={3}>{session.customForms.map((form) => <Box key={form.uniqueId} borderWidth='1px' borderColor='gray.200' borderRadius='16px' bg='white' p={4}><Text fontWeight='700' color='gray.900'>{form.headerText ?? form.name}</Text>{form.description ? <Text mt={2} fontSize='sm' color='gray.600' lineHeight='1.7'>{form.description}</Text> : null}</Box>)}</SimpleGrid></Stack> : null}{session.customQuestions.length > 0 ? <Stack gap={3}><Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.14em'>Custom Questions</Text><Stack gap={3}>{session.customQuestions.map((question) => <Box key={question.uniqueId} borderWidth='1px' borderColor='gray.200' borderRadius='16px' bg='white' p={4}><HStack justify='space-between' gap={4} align='start' flexWrap='wrap'><Stack gap={1}><Text fontWeight='700' color='gray.900'>{question.label}</Text><Text fontSize='sm' color='gray.600'>{question.controlType}</Text></Stack><Badge colorPalette={question.required ? 'red' : 'gray'} variant='subtle' borderRadius='full' px={3} py={1}>{question.required ? 'Required' : 'Optional'}</Badge></HStack></Box>)}</Stack></Stack> : null}</Stack></Box>)}</Stack>
                            </SupportCard>
                          ) : null}

                          {tab.id === 'payment' ? (
                            <SupportCard title='Payment' subtitle='Show the mapped payment methods and protect organizer-only cheque payments.' icon={<CreditCard size={18} />}>
                              <Stack gap={4}>{visiblePaymentMethods.length > 0 ? <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>{visiblePaymentMethods.map((method) => <Box key={method.paymentMethod} borderWidth='1px' borderColor='gray.200' borderRadius='18px' p={4} bg='gray.50'><HStack justify='space-between' gap={4} align='start' flexWrap='wrap'><Stack gap={1}><Text fontWeight='700' color='gray.900'>{method.label}</Text><Text fontSize='sm' color='gray.600'>Available for this registration flow.</Text></Stack>{method.isOrganizerOnly ? <Badge colorPalette='purple' variant='subtle' borderRadius='full' px={3} py={1}>Organizer only</Badge> : null}</HStack></Box>)}</SimpleGrid> : <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' p={4} bg='gray.50'><Text color='gray.600' fontSize='sm'>No public payment methods are currently mapped for this event.</Text></Box>}</Stack>
                            </SupportCard>
                          ) : null}
                        </Stack>
                      </Box>

                      <Flex justify='space-between' gap={3} align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }}>
                        <Button {...CONTROL_BUTTON_OUTLINE} onClick={handleBackStep} disabled={activeIndex <= 0}><HStack gap={2}><ArrowLeft size={16} /><Text as='span'>Back</Text></HStack></Button>
                        <Button {...CONTROL_BUTTON_PRIMARY} bg={formAccent} _hover={{ bg: hexToRgba(formAccent, 0.88), transform: 'translateY(-1px)' }} onClick={handleContinue} disabled={Boolean(event.termsConditions) && !termsAccepted}><HStack gap={2}><Text as='span'>Continue</Text><ChevronRight size={16} /></HStack></Button>
                      </Flex>
                    </Stack>
                  </Tabs.Content>
                ))}
              </Tabs.Root>
            </Box>
          </Stack>
        </Container>
      </Flex>

      {event.termsConditions ? (
        <Dialog.Root open={termsOpen} onOpenChange={(details) => setTermsOpen(details.open)} size='xl'>
          <Dialog.Backdrop backdropFilter='blur(8px)' bg='blackAlpha.600' />
          <Dialog.Positioner>
            <Dialog.Content borderRadius='28px' overflow='hidden' bg='white' boxShadow='0 30px 70px rgba(15, 23, 42, 0.25)'>
              <Box px={{ base: 4, md: 6 }} py={4} borderBottomWidth='1px' borderBottomColor='gray.200'><Flex justify='space-between' align='start' gap={4}><Stack gap={1}><Text fontSize='xs' textTransform='uppercase' letterSpacing='0.14em' color='gray.500' fontWeight='700'>Terms & Conditions</Text><Heading fontSize={{ base: 'xl', md: '2xl' }} color='gray.900' letterSpacing='-0.03em'>Registration agreement</Heading></Stack><CloseButton onClick={() => setTermsOpen(false)} /></Flex></Box>
              <Box px={{ base: 4, md: 6 }} py={{ base: 5, md: 6 }} maxH='70vh' overflowY='auto'>{isHtmlContent(event.termsConditions) ? <RichTextBlock html={event.termsConditions} /> : <Text color='gray.700' lineHeight='1.75'>{event.termsConditions}</Text>}</Box>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>
      ) : null}
    </Box>
  )
}
