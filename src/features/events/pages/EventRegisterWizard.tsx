import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
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
  Grid,
  Heading,
  HStack,
  Image,
  Input,
  Link,
  Portal,
  Separator,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
} from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock3,
  CreditCard,
  ExternalLink,
  FileText,
  MapPin,
  MessageSquareText,
  Check,
  Trash2,
  Users,
  X,
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
const timerRevealAnimation = keyframes`
  0% {
    opacity: 0;
    transform: translateY(-18px) scale(0.985);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`

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
  purchaseTimeLimitMinutes: number
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
  paymentAccountCurrency: string | null
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

function formatCountdown(milliseconds: number) {
  const safeMilliseconds = Math.max(milliseconds, 0)
  const totalSeconds = Math.floor(safeMilliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
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

function formatAmount(value: number, currencyCode?: string | null) {
  if (!Number.isFinite(value) || value < 0) return '$0'
  if (value === 0) {
    const trimmedCurrency = currencyCode?.trim()

    if (trimmedCurrency) {
      const isIsoCurrencyCode = /^[A-Za-z]{3}$/.test(trimmedCurrency)

      if (isIsoCurrencyCode) {
        try {
          return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: trimmedCurrency.toUpperCase(),
            currencyDisplay: 'narrowSymbol',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(0)
        } catch {
          return `${trimmedCurrency.toUpperCase()} 0`
        }
      }

      return `${trimmedCurrency}0`
    }

    return '$0'
  }

  const trimmedCurrency = currencyCode?.trim()

  if (trimmedCurrency) {
    const isIsoCurrencyCode = /^[A-Za-z]{3}$/.test(trimmedCurrency)

    if (isIsoCurrencyCode) {
      try {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: trimmedCurrency.toUpperCase(),
          currencyDisplay: 'narrowSymbol',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value)
      } catch {
        return `${trimmedCurrency.toUpperCase()} ${value.toFixed(2)}`
      }
    }

    try {
      return `${trimmedCurrency}${value.toFixed(2)}`
    } catch {
      return `${trimmedCurrency}${value.toFixed(2)}`
    }
  }

  return value.toFixed(2)
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

function getTicketDisplayPrice(ticket: EventRegistrationTicket) {
  return getTicketPricePeriod(ticket)?.amount ?? ticket.fullPrice ?? 0
}

function getTicketSavings(ticket: EventRegistrationTicket) {
  const fullPrice = ticket.fullPrice ?? 0
  const displayPrice = getTicketDisplayPrice(ticket)

  if (!Number.isFinite(fullPrice) || !Number.isFinite(displayPrice) || fullPrice <= 0 || displayPrice >= fullPrice) {
    return null
  }

  const amountSaved = fullPrice - displayPrice
  const percentageSaved = Math.round((amountSaved / fullPrice) * 100)

  return {
    fullPrice,
    amountSaved,
    percentageSaved,
  }
}

function getTicketSelectableMax(ticket: EventRegistrationTicket) {
  const remaining = getTicketRemaining(ticket)
  const purchaseMax = ticket.maxPurchase ?? null

  if (remaining !== null && purchaseMax !== null) return Math.max(Math.min(remaining, purchaseMax), 0)
  if (remaining !== null) return Math.max(remaining, 0)
  if (purchaseMax !== null) return Math.max(purchaseMax, 0)

  return null
}

function getTicketQuantityOptions(ticket: EventRegistrationTicket, quantity: number) {
  const minimumPurchase = Math.max(ticket.minPurchase ?? 1, 1)
  const maxAllowed = getTicketSelectableMax(ticket)

  if (maxAllowed !== null) {
    const upperBound = Math.max(maxAllowed, 0)
    const values = upperBound < minimumPurchase
      ? [0, upperBound]
      : [0, ...Array.from({ length: upperBound - minimumPurchase + 1 }, (_, index) => minimumPurchase + index)]

    return Array.from(new Set(values))
      .filter((value) => value >= 0 && value <= upperBound)
      .map((value) => ({
        value: String(value),
        label: String(value),
      }))
  }

  const rollingUpperBound = Math.max(quantity + 10, minimumPurchase + 9)
  return [0, ...Array.from({ length: rollingUpperBound - minimumPurchase + 1 }, (_, index) => minimumPurchase + index)].map((value) => ({
    value: String(value),
    label: String(value),
  }))
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

interface SelectedTicketSummaryItem {
  sessionId: string
  sessionName: string
  ticketId: string
  ticketName: string
  ticket: EventRegistrationTicket
  quantity: number
  unitPrice: number
  lineTotal: number
}

type PendingDeleteAction =
  | {
      kind: 'ticket'
      ticket: EventRegistrationTicket
      title: string
      description: string
    }
  | {
      kind: 'session'
      items: SelectedTicketSummaryItem[]
      title: string
      description: string
    }

function TicketCard({
  ticket,
  quantity,
  onDecrease,
  onIncrease,
  onSelectQuantity,
  currencyCode,
}: {
  ticket: EventRegistrationTicket
  quantity: number
  onDecrease: () => void
  onIncrease: () => void
  onSelectQuantity: (quantity: number) => void
  currencyCode?: string | null
}) {
  const activePricePeriod = getTicketPricePeriod(ticket)
  const displayPrice = getTicketDisplayPrice(ticket)
  const savings = getTicketSavings(ticket)
  const selectableMax = getTicketSelectableMax(ticket)
  const [pricingExpanded, setPricingExpanded] = useState(false)
  const quantityOptions = useMemo(() => getTicketQuantityOptions(ticket, quantity), [ticket, quantity])

  return (
    <Box borderWidth='1px' borderColor='gray.200' borderRadius='20px' bg='white' p={{ base: 4, md: 4.5 }}>
      <Stack gap={3}>
        <Stack gap={3}>
          <Stack gap={1.5}>
            <Flex justify='space-between' align='start' gap={4}>
              <Text fontSize='md' fontWeight='700' color='gray.900' lineHeight='1.4' flex='1'>
                {ticket.name}
              </Text>
              <HStack gap={3} flexWrap='wrap' align='baseline' justify='flex-end'>
                {savings ? (
                  <Text fontSize='sm' color='red.500' textDecoration='line-through'>
                    {formatAmount(savings.fullPrice, currencyCode)}
                  </Text>
                ) : null}
                <Text fontSize='xl' fontWeight='800' color={savings ? 'green.600' : 'gray.900'}>
                  {formatAmount(displayPrice ?? 0, currencyCode)}
                </Text>
              </HStack>
            </Flex>
            {ticket.description ? (
              <Text
                fontSize='sm'
                color='gray.600'
                lineHeight='1.5'
                display='-webkit-box'
                overflow='hidden'
                sx={{ WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}
              >
                {ticket.description}
              </Text>
            ) : null}
          </Stack>

          <Flex
            direction='column'
            gap={2}
            w='full'
          >
            <Flex
              borderWidth='1px'
              borderColor='gray.200'
              borderRadius='full'
              bg='gray.50'
              px={2}
              py={1}
              align='center'
              justify='space-between'
              gap={2}
              w='full'
            >
              <Button
                minW='0'
                w='32px'
                h='32px'
                p='0'
                borderRadius='full'
                borderWidth='1px'
                borderColor='gray.300'
                bg='white'
                onClick={onDecrease}
                disabled={quantity <= 0}
              >
                <Text as='span' fontSize='lg' fontWeight='800' lineHeight='1' color='gray.700'>-</Text>
              </Button>
              <Box flex='1' minW='84px' position='relative'>
                <Box
                  as='select'
                  value={String(quantity)}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => onSelectQuantity(Number(event.target.value))}
                  w='full'
                  h='40px'
                  pl={4}
                  pr={9}
                  border='none'
                  outline='none'
                  bg='transparent'
                  color='gray.900'
                  fontSize='sm'
                  fontWeight='800'
                  textAlign='center'
                  textAlignLast='center'
                  appearance='none'
                  cursor='pointer'
                  _focusVisible={{ outline: 'none' }}
                >
                  {quantityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Box>
                <Flex
                  position='absolute'
                  insetY='0'
                  right={3}
                  align='center'
                  pointerEvents='none'
                  color='gray.500'
                >
                  <ChevronDown size={14} strokeWidth={2.25} />
                </Flex>
              </Box>
              <Button
                minW='0'
                w='32px'
                h='32px'
                p='0'
                borderRadius='full'
                borderWidth='1px'
                borderColor='gray.300'
                bg='white'
                onClick={onIncrease}
                disabled={selectableMax !== null && quantity >= selectableMax}
              >
                <Text as='span' fontSize='lg' fontWeight='800' lineHeight='1' color='gray.700'>+</Text>
              </Button>
            </Flex>
            {ticket.minPurchase > 1 ? (
              <Text fontSize='xs' color='gray.500' textAlign='center'>
                Minimum purchase: <Text as='span' fontWeight='700' color='gray.700'>{ticket.minPurchase}</Text>
              </Text>
            ) : null}
          </Flex>
        </Stack>

        {ticket.pricePeriods.length > 1 ? (
          <>
            <Separator borderColor='gray.200' />
            <Flex justify='flex-end'>
              <Link
                as='button'
                type='button'
                fontSize='xs'
                fontWeight='700'
                color='gray.700'
                textDecoration='underline'
                textUnderlineOffset='3px'
                onClick={() => setPricingExpanded((current) => !current)}
              >
                {pricingExpanded ? 'Hide pricing' : 'View pricing'}
              </Link>
            </Flex>
          </>
        ) : null}

        {pricingExpanded && ticket.pricePeriods.length > 1 ? (
          <Stack gap={2.5}>
            <Stack gap={2}>
              {ticket.pricePeriods.map((period) => (
                <Box key={period.uniqueId} borderWidth='1px' borderColor='gray.200' borderRadius='16px' bg='gray.50' px={3.5} py={3}>
                  <Flex justify='space-between' align='start' gap={3} wrap='wrap'>
                    <Stack gap={0.5}>
                      <Text fontSize='sm' fontWeight='700' color='gray.900'>{period.name ?? 'Price window'}</Text>
                      <Text fontSize='xs' color='gray.500'>{formatDateTimeRange(period.startDateTime, period.endDateTime)}</Text>
                    </Stack>
                    <Stack gap={0.5} align={{ base: 'start', md: 'end' }}>
                      <Text fontSize='sm' fontWeight='700' color='gray.900'>{formatAmount(period.amount ?? 0, currencyCode)}</Text>
                      <Text fontSize='xs' color={period.uniqueId === activePricePeriod?.uniqueId ? 'green.600' : 'gray.500'}>
                        {period.currentStatus}
                      </Text>
                    </Stack>
                  </Flex>
                </Box>
              ))}
            </Stack>
          </Stack>
        ) : null}
      </Stack>
    </Box>
  )
}

function SessionTitleCard({
  title,
  description,
  ticketCount,
  isExpanded,
  onToggle,
  onOpenDescription,
  children,
}: {
  title: string
  description?: string | null
  ticketCount: number
  isExpanded: boolean
  onToggle: () => void
  onOpenDescription: () => void
  children?: ReactNode
}) {
  return (
    <Box borderWidth='1px' borderColor={isExpanded ? 'gray.300' : 'gray.200'} borderRadius='24px' bg='white' p={{ base: 5, md: 6 }} boxShadow='0 16px 40px rgba(15, 23, 42, 0.06)'>
      <Stack gap={4}>
        <Flex align='center' justify='space-between' gap={4}>
          {description ? (
            <Link
              as='button'
              type='button'
              onClick={onOpenDescription}
              fontSize='lg'
              fontWeight='700'
              color='gray.900'
              letterSpacing='-0.02em'
              textAlign='left'
              textDecoration='underline'
              textUnderlineOffset='4px'
              title='View description'
              _hover={{ color: 'gray.700' }}
            >
              {title}
            </Link>
          ) : (
            <Heading fontSize='lg' color='gray.900' letterSpacing='-0.02em'>{title}</Heading>
          )}
          <HStack gap={3}>
            <Badge colorPalette='gray' variant='subtle' borderRadius='full' px={3} py={1}>
              {ticketCount} {ticketCount === 1 ? 'ticket' : 'tickets'}
            </Badge>
            <Button
              onClick={onToggle}
              aria-label={isExpanded ? `Collapse ${title}` : `Expand ${title}`}
              aria-expanded={isExpanded}
              minW='0'
              w='32px'
              h='32px'
              p='0'
              borderRadius='full'
              borderWidth='1px'
              borderColor={isExpanded ? 'gray.400' : 'gray.300'}
              bg={isExpanded ? 'gray.200' : 'gray.100'}
              color='gray.800'
              _hover={{ bg: 'gray.200', borderColor: 'gray.500' }}
              _active={{ bg: 'gray.300', borderColor: 'gray.600' }}
            >
              <Box display='inline-flex' transform={isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'} transition='transform 0.2s ease'>
                <ChevronRight size={14} />
              </Box>
            </Button>
          </HStack>
        </Flex>
        <Separator borderColor='gray.200' />
        {isExpanded ? children : null}
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
  const [expandedSessionIds, setExpandedSessionIds] = useState<string[]>([])
  const [activeSessionDescription, setActiveSessionDescription] = useState<{ title: string; description: string } | null>(null)
  const [sessionTicketSearch, setSessionTicketSearch] = useState<Record<string, string>>({})
  const [selectedTicketQuantities, setSelectedTicketQuantities] = useState<Record<string, number>>({})
  const [purchaseTimerStartedAt, setPurchaseTimerStartedAt] = useState<number | null>(null)
  const [purchaseTimerNow, setPurchaseTimerNow] = useState(() => Date.now())
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)
  const [pendingDeleteAction, setPendingDeleteAction] = useState<PendingDeleteAction | null>(null)

  useEffect(() => {
    setActiveTab(firstTab)
    setHighestUnlockedIndex(0)
  }, [firstTab])

  useEffect(() => {
    setExpandedSessionIds(event.sessions.map((session) => session.uniqueId))
  }, [event.sessions])

  useEffect(() => {
    if (purchaseTimerStartedAt === null) return
    const timer = window.setInterval(() => {
      setPurchaseTimerNow(Date.now())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [purchaseTimerStartedAt])

  const activeIndex = getStepIndex(tabs, activeTab)
  const isFinalStep = activeIndex >= 0 && activeIndex === tabs.length - 1
  const visiblePaymentMethods = getVisiblePaymentMethods(event)
  const purchaseTimerDurationMs = Math.max(event.purchaseTimeLimitMinutes, 1) * 60 * 1000
  const purchaseTimerRemainingMs = purchaseTimerStartedAt === null ? null : purchaseTimerStartedAt + purchaseTimerDurationMs - purchaseTimerNow
  const purchaseTimerVisible = purchaseTimerStartedAt !== null
  const purchaseTimerExpired = purchaseTimerRemainingMs !== null && purchaseTimerRemainingMs <= 0
  const selectedTicketSummary = useMemo<SelectedTicketSummaryItem[]>(
    () =>
      event.sessions.flatMap((session) =>
        session.ticketTypes.flatMap((ticket) => {
          const quantity = selectedTicketQuantities[ticket.uniqueId] ?? 0
          if (quantity <= 0) return []

          const unitPrice = getTicketDisplayPrice(ticket)

          return [
            {
              sessionId: session.uniqueId,
              sessionName: session.name,
              ticketId: ticket.uniqueId,
              ticketName: ticket.name,
              ticket,
              quantity,
              unitPrice,
              lineTotal: unitPrice * quantity,
            },
          ]
        }),
      ),
    [event.sessions, selectedTicketQuantities],
  )
  const selectedTicketSummaryBySession = useMemo(
    () =>
      selectedTicketSummary.reduce<Array<{
        sessionId: string
        sessionName: string
        items: SelectedTicketSummaryItem[]
        total: number
      }>>((groups, item) => {
        const existingGroup = groups.find((group) => group.sessionId === item.sessionId)

        if (existingGroup) {
          existingGroup.items.push(item)
          existingGroup.total += item.lineTotal
          return groups
        }

        groups.push({
          sessionId: item.sessionId,
          sessionName: item.sessionName,
          items: [item],
          total: item.lineTotal,
        })

        return groups
      }, []),
    [selectedTicketSummary],
  )
  const selectedTicketCount = selectedTicketSummary.reduce((total, item) => total + item.quantity, 0)
  const selectedTicketTotal = selectedTicketSummary.reduce((total, item) => total + item.lineTotal, 0)
  const shouldHighlightSummaryLauncher = selectedTicketCount > 0 || purchaseTimerVisible

  function isStepEnabled(stepId: WizardTabId) {
    const index = getStepIndex(tabs, stepId)
    return index >= 0 && index <= highestUnlockedIndex
  }

  function handleStepChange(stepId: string) {
    if (isStepEnabled(stepId as WizardTabId)) setActiveTab(stepId as WizardTabId)
  }

  function handleContinue() {
    if (purchaseTimerExpired) return
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

  function handleSessionToggle(sessionUniqueId: string) {
    setExpandedSessionIds((current) =>
      current.includes(sessionUniqueId)
        ? current.filter((id) => id !== sessionUniqueId)
        : [...current, sessionUniqueId],
    )
  }

  function handleExpandAllSessions() {
    setExpandedSessionIds(event.sessions.map((session) => session.uniqueId))
  }

  function handleCollapseAllSessions() {
    setExpandedSessionIds([])
  }

  function handleSessionTicketSearchChange(sessionUniqueId: string, value: string) {
    setSessionTicketSearch((current) => ({
      ...current,
      [sessionUniqueId]: value,
    }))
  }

  function handleTicketQuantityChange(ticket: EventRegistrationTicket, nextQuantity: number) {
    const maxAllowed = getTicketSelectableMax(ticket)
    const minimumPurchase = Math.max(ticket.minPurchase ?? 1, 1)

    setSelectedTicketQuantities((current) => {
      const currentQuantity = current[ticket.uniqueId] ?? 0
      const requestedQuantity =
        currentQuantity <= 0 && nextQuantity > 0
          ? Math.max(nextQuantity, minimumPurchase)
          : nextQuantity
      const normalized = Math.max(0, maxAllowed === null ? requestedQuantity : Math.min(requestedQuantity, maxAllowed))

      return {
        ...current,
        [ticket.uniqueId]: normalized,
      }
    })

    if (purchaseTimerStartedAt === null && nextQuantity > 0) {
      const now = Date.now()
      setPurchaseTimerStartedAt(now)
      setPurchaseTimerNow(now)
    }
  }

  function handleRemoveTicket(ticket: EventRegistrationTicket) {
    handleTicketQuantityChange(ticket, 0)
  }

  function handleRemoveSession(items: SelectedTicketSummaryItem[]) {
    setSelectedTicketQuantities((current) => {
      const next = { ...current }
      items.forEach((item) => {
        next[item.ticketId] = 0
      })
      return next
    })
  }

  function requestRemoveTicket(ticket: EventRegistrationTicket, ticketName: string) {
    setPendingDeleteAction({
      kind: 'ticket',
      ticket,
      title: 'Remove ticket',
      description: `Remove ${ticketName} from your summary?`,
    })
  }

  function requestRemoveSession(items: SelectedTicketSummaryItem[], sessionName: string) {
    setPendingDeleteAction({
      kind: 'session',
      items,
      title: 'Remove session',
      description: `Remove all selected tickets from ${sessionName}?`,
    })
  }

  function confirmDeleteAction() {
    if (!pendingDeleteAction) return

    if (pendingDeleteAction.kind === 'ticket') {
      handleRemoveTicket(pendingDeleteAction.ticket)
    } else {
      handleRemoveSession(pendingDeleteAction.items)
    }

    setPendingDeleteAction(null)
  }

  const areAllSessionsExpanded =
    event.sessions.length > 0 && expandedSessionIds.length === event.sessions.length

  if (purchaseTimerVisible && purchaseTimerExpired) {
    return (
      <Box minH='100dvh' bg={accentBackground} color='gray.900'>
        <Flex minH='100dvh' align='center' justify='center' px={{ base: 3, md: 6, xl: 8 }} py={{ base: 5, md: 8 }}>
          <Container maxW='4xl' p={0}>
            <Box bg='white' borderWidth='1px' borderColor='gray.200' borderRadius='28px' p={{ base: 5, md: 8 }} boxShadow='0 24px 60px rgba(15, 23, 42, 0.08)'>
              <Stack gap={5} align='center' textAlign='center'>
                <Box w='72px' h='72px' borderRadius='24px' display='grid' placeItems='center' bg='red.50' color='red.600'>
                  <Clock3 size={30} />
                </Box>
                <Stack gap={2} maxW='2xl'>
                  <Heading fontSize={{ base: '2xl', md: '3xl' }} letterSpacing='-0.04em'>
                    Purchase time limit reached
                  </Heading>
                  <Text color='gray.600' lineHeight='1.7'>
                    Your registration session expired. Please restart the registration flow to continue.
                  </Text>
                </Stack>
                <Button minH='12' borderRadius='16px' color='white' bg='gray.900' onClick={onBack}>
                  Restart registration
                </Button>
              </Stack>
            </Box>
          </Container>
        </Flex>
      </Box>
    )
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

            {purchaseTimerVisible ? (
              <Box
                borderWidth='1px'
                borderColor={purchaseTimerExpired ? 'red.200' : 'gray.200'}
                borderRadius='20px'
                bg={purchaseTimerExpired ? 'red.50' : 'white'}
                px={{ base: 4, md: 5 }}
                py={4}
                boxShadow='0 12px 30px rgba(15, 23, 42, 0.08)'
                animation={`${timerRevealAnimation} 280ms ease-out`}
                transformOrigin='top center'
              >
                <Flex align={{ base: 'start', md: 'center' }} justify='space-between' gap={4} direction={{ base: 'column', md: 'row' }}>
                  <HStack gap={3} align='start'>
                    <Box w='10' h='10' borderRadius='12px' display='grid' placeItems='center' bg={purchaseTimerExpired ? 'red.100' : 'gray.100'} color={purchaseTimerExpired ? 'red.600' : 'gray.700'}>
                      <Clock3 size={18} />
                    </Box>
                    <Stack gap={0.5}>
                      <Text fontSize='xs' fontWeight='800' color='gray.500' textTransform='uppercase' letterSpacing='0.12em'>Purchase time left</Text>
                      <Text fontSize='lg' fontWeight='800' color={purchaseTimerExpired ? 'red.600' : 'gray.900'}>{formatCountdown(purchaseTimerRemainingMs ?? 0)}</Text>
                    </Stack>
                  </HStack>
                  <Text fontSize='sm' color='gray.600' lineHeight='1.6' maxW='2xl'>
                    {purchaseTimerExpired
                      ? 'Purchase time limit reached. Please restart registration.'
                      : 'Complete your registration before the timer reaches zero.'}
                  </Text>
                </Flex>
              </Box>
            ) : null}

            <Portal>
              <Box position='fixed' right={{ base: 1.5, md: 2.5 }} bottom={{ base: 1.5, md: 2.5 }} zIndex={999} pointerEvents='none'>
                <Box
                  pointerEvents='auto'
                  w={{ base: 'min(calc(100vw - 0.75rem), 360px)', md: '380px' }}
                  maxH={{ base: 'calc(100dvh - 0.75rem)', md: 'calc(100dvh - 1.5rem)' }}
                  borderWidth='1px'
                  borderColor='gray.200'
                  borderRadius='26px'
                  bg='white'
                  boxShadow='0 28px 80px rgba(15, 23, 42, 0.22)'
                  overflow='hidden'
                  display='flex'
                  flexDirection='column'
                >
                  <Flex
                    px={4}
                    py={3.5}
                    align='center'
                    justify='space-between'
                    gap={3}
                    borderBottomWidth={isSummaryOpen ? '1px' : '0'}
                    borderBottomColor={hexToRgba(formAccent, 0.32)}
                    bg={formAccent}
                    color='white'
                    cursor='pointer'
                    onClick={() => setIsSummaryOpen((current) => !current)}
                    transition='border-color 0.22s ease'
                  >
                    <HStack gap={3} minW={0}>
                      <Stack gap={0} minW={0}>
                        <Text fontSize='sm' fontWeight='800' lineHeight='1.2'>Summary</Text>
                        {isSummaryOpen && selectedTicketCount > 0 ? (
                          <Text fontSize='xs' color={shouldHighlightSummaryLauncher ? 'white' : 'whiteAlpha.900'} lineHeight='1.3'>
                            {selectedTicketCount} selected
                          </Text>
                        ) : null}
                      </Stack>
                    </HStack>
                    {isSummaryOpen ? (
                      <Box
                        color='whiteAlpha.900'
                        transform='rotate(0deg)'
                        transition='transform 220ms ease'
                        flexShrink={0}
                      >
                        <ChevronDown size={18} />
                      </Box>
                    ) : (
                      <Text fontSize='sm' fontWeight='800' lineHeight='1.1' color='white' flexShrink={0}>
                        {formatAmount(selectedTicketTotal, event.paymentAccountCurrency)}
                      </Text>
                    )}
                  </Flex>

                  <Box
                    flex='1'
                    minH={0}
                    maxH={isSummaryOpen ? { base: 'min(72vh, 560px)', md: 'min(74vh, 620px)' } : '0px'}
                    opacity={isSummaryOpen ? 1 : 0}
                    transform={isSummaryOpen ? 'translateY(0)' : 'translateY(10px)'}
                    transition='max-height 280ms ease, opacity 220ms ease, transform 220ms ease'
                    overflow='hidden'
                  >
                    <Stack gap={3} px={4} py={4} overflowY='auto' maxH='inherit'>
                      {selectedTicketSummaryBySession.length > 0 ? (
                        <Stack gap={3.5}>
                          {selectedTicketSummaryBySession.map((sessionGroup) => (
                            <Box
                              key={sessionGroup.sessionId}
                              borderWidth='1px'
                              borderColor='gray.200'
                              borderRadius='20px'
                              bg='white'
                              overflow='hidden'
                              boxShadow='0 12px 28px rgba(15, 23, 42, 0.05)'
                            >
                              <Box
                                px={4}
                                py={3.5}
                                bg='gray.50'
                                borderBottomWidth='1px'
                                borderBottomColor='gray.200'
                              >
                                <Grid templateColumns='minmax(0, 1fr) auto' columnGap={3} rowGap={2.5} alignItems='center'>
                                  <Text
                                    fontSize='sm'
                                    fontWeight='800'
                                    color='gray.900'
                                    lineHeight='1.4'
                                    whiteSpace='normal'
                                    wordBreak='break-word'
                                    minW={0}
                                  >
                                    {sessionGroup.sessionName}
                                  </Text>
                                  <Button
                                    minW='0'
                                    h='18px'
                                    p='0'
                                    justifySelf='end'
                                    variant='ghost'
                                    color='red.500'
                                    _hover={{ bg: 'transparent', color: 'red.600' }}
                                    _active={{ bg: 'transparent', color: 'red.700' }}
                                    aria-label={`Remove ${sessionGroup.sessionName}`}
                                    title={`Remove ${sessionGroup.sessionName}`}
                                    onClick={() => requestRemoveSession(sessionGroup.items, sessionGroup.sessionName)}
                                  >
                                    <X size={13} strokeWidth={2.3} />
                                  </Button>

                                  <Text fontSize='xs' color='gray.500' lineHeight='1.4'>
                                    {sessionGroup.items.length} {sessionGroup.items.length === 1 ? 'ticket type selected' : 'ticket types selected'}
                                  </Text>
                                  <Badge
                                    justifySelf='end'
                                    colorPalette='gray'
                                    variant='subtle'
                                    borderRadius='full'
                                    px={3}
                                    py={1.5}
                                    fontSize='sm'
                                    fontWeight='800'
                                    color='gray.800'
                                    bg='white'
                                    borderWidth='1px'
                                    borderColor='gray.200'
                                  >
                                    {formatAmount(sessionGroup.total, event.paymentAccountCurrency)}
                                  </Badge>
                                </Grid>
                              </Box>

                              <Stack gap={0} px={4} py={2.5}>
                                {sessionGroup.items.map((item, itemIndex) => (
                                  <Box
                                    key={item.ticketId}
                                    py={3}
                                    borderBottomWidth={itemIndex < sessionGroup.items.length - 1 ? '1px' : '0'}
                                    borderBottomColor='gray.100'
                                  >
                                    <Grid templateColumns='minmax(0, 1fr) auto' columnGap={3} rowGap={2.5} alignItems='center'>
                                      <Text
                                        fontSize='sm'
                                        fontWeight='700'
                                        color='gray.900'
                                        lineHeight='1.4'
                                        whiteSpace='normal'
                                        wordBreak='break-word'
                                        minW={0}
                                      >
                                        {item.ticketName}
                                      </Text>
                                      <Button
                                        minW='0'
                                        h='16px'
                                        p='0'
                                        justifySelf='end'
                                        variant='ghost'
                                        color='red.500'
                                        _hover={{ bg: 'transparent', color: 'red.600' }}
                                        _active={{ bg: 'transparent', color: 'red.700' }}
                                        aria-label={`Remove ${item.ticketName}`}
                                        title={`Remove ${item.ticketName}`}
                                        onClick={() => requestRemoveTicket(item.ticket, item.ticketName)}
                                      >
                                        <Trash2 size={12} strokeWidth={2.2} />
                                      </Button>

                                      <HStack gap={2} wrap='wrap' minW={0} align='center'>
                                        <Text fontSize='xs' color='gray.500'>
                                          {formatAmount(item.unitPrice, event.paymentAccountCurrency)} each
                                        </Text>
                                        <Text fontSize='xs' color='gray.300'>|</Text>
                                        <Text fontSize='xs' fontWeight='700' color='gray.700'>
                                          {formatAmount(item.lineTotal, event.paymentAccountCurrency)}
                                        </Text>
                                      </HStack>
                                      <HStack
                                        gap={2}
                                        justifySelf='end'
                                        borderWidth='1px'
                                        borderColor='gray.200'
                                        borderRadius='full'
                                        bg='gray.50'
                                        px={1.5}
                                        py={1}
                                        minW='116px'
                                        justify='space-between'
                                      >
                                        <Button
                                          minW='0'
                                          w='24px'
                                          h='24px'
                                          p='0'
                                          borderRadius='full'
                                          borderWidth='1px'
                                          borderColor='gray.300'
                                          bg='white'
                                          color='gray.700'
                                          fontSize='sm'
                                          fontWeight='800'
                                          onClick={() => handleTicketQuantityChange(item.ticket, item.quantity - 1)}
                                          disabled={item.quantity <= 0}
                                        >
                                          -
                                        </Button>
                                        <Text minW='20px' textAlign='center' fontSize='sm' fontWeight='800' color='gray.900'>
                                          {item.quantity}
                                        </Text>
                                        <Button
                                          minW='0'
                                          w='24px'
                                          h='24px'
                                          p='0'
                                          borderRadius='full'
                                          borderWidth='1px'
                                          borderColor='gray.300'
                                          bg='white'
                                          color='gray.700'
                                          fontSize='sm'
                                          fontWeight='800'
                                          onClick={() => handleTicketQuantityChange(item.ticket, item.quantity + 1)}
                                          disabled={getTicketSelectableMax(item.ticket) !== null && item.quantity >= (getTicketSelectableMax(item.ticket) ?? 0)}
                                        >
                                          +
                                        </Button>
                                      </HStack>
                                    </Grid>
                                  </Box>
                                ))}
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      ) : (
                        <Box borderWidth='1px' borderColor='gray.200' borderRadius='14px' bg='gray.50' px={3.5} py={3}>
                          <Text fontSize='sm' fontWeight='600' color='gray.700'>
                            No tickets selected yet.
                          </Text>
                          <Text mt={1} fontSize='xs' color='gray.500' lineHeight='1.55'>
                            Pick tickets in Sessions and the summary updates instantly.
                          </Text>
                        </Box>
                      )}

                      <Separator borderColor='gray.200' />

                      <Flex justify='space-between' align='center' gap={3}>
                        <Text fontSize='sm' color='gray.600'>
                          Total
                        </Text>
                        <Text fontSize='lg' fontWeight='800' color='gray.900'>
                          {formatAmount(selectedTicketTotal, event.paymentAccountCurrency)}
                        </Text>
                      </Flex>
                    </Stack>
                  </Box>
                </Box>
              </Box>
            </Portal>

            {event.termsConditions ? (
              <Box borderWidth='1px' borderColor='gray.200' borderRadius='20px' bg='white' px={{ base: 4, md: 5 }} py={4} boxShadow='0 12px 30px rgba(15, 23, 42, 0.08)'>
                <Flex justify='space-between' align={{ base: 'stretch', md: 'center' }} gap={4} direction={{ base: 'column', md: 'row' }}>
                  <Checkbox.Root checked={termsAccepted} onCheckedChange={(details) => setTermsAccepted(details.checked === true)}>
                    <Checkbox.HiddenInput />
                    <Checkbox.Control borderColor='gray.300' borderRadius='8px' bg='white' _checked={{ bg: formAccent, borderColor: formAccent }} />
                    <Checkbox.Label color='gray.700' fontSize='sm' fontWeight='600'>I accept the registration terms and conditions.</Checkbox.Label>
                  </Checkbox.Root>
                  <Button variant='ghost' color={formAccent} fontWeight='700' onClick={() => setTermsOpen(true)} alignSelf={{ base: 'flex-start', md: 'center' }}>View terms</Button>
                </Flex>
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
                            <Stack gap={4}>
                              {event.summary ? <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='gray.50' p={4}><Text fontSize='sm' fontWeight='700' color='gray.900' mb={2}>Summary</Text><Text color='gray.700' lineHeight='1.7'>{event.summary}</Text></Box> : null}
                              {event.description ? <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='white' p={5}>{isHtmlContent(event.description) ? <RichTextBlock html={event.description} /> : <Text color='gray.700' lineHeight='1.7'>{event.description}</Text>}</Box> : null}
                            </Stack>
                          ) : null}

                          {tab.id === 'sessions' ? (
                            <Stack gap={4}>
                              {event.sessions.length > 0 ? (
                                <Flex justify='flex-end' gap={2} wrap='wrap'>
                                  <Button
                                    h='38px'
                                    px={4}
                                    borderRadius='full'
                                    borderWidth='1px'
                                    borderColor='gray.900'
                                    bg='gray.900'
                                    color='white'
                                    fontSize='sm'
                                    fontWeight='700'
                                    boxShadow='0 10px 24px rgba(15, 23, 42, 0.18)'
                                    _hover={{ bg: 'gray.800', borderColor: 'gray.800' }}
                                    _active={{ bg: 'gray.700', borderColor: 'gray.700' }}
                                    transition='all 0.2s ease'
                                    minW='140px'
                                    onClick={areAllSessionsExpanded ? handleCollapseAllSessions : handleExpandAllSessions}
                                  >
                                    {areAllSessionsExpanded ? 'Collapse All' : 'Expand All'}
                                  </Button>
                                </Flex>
                              ) : null}
                              {event.sessions.map((session) => (
                                (() => {
                                  const searchValue = sessionTicketSearch[session.uniqueId] ?? ''
                                  const filteredTickets = session.ticketTypes.filter((ticket) => {
                                    const needle = searchValue.trim().toLowerCase()
                                    if (!needle) return true
                                    return (
                                      ticket.name.toLowerCase().includes(needle) ||
                                      (ticket.description?.toLowerCase().includes(needle) ?? false)
                                    )
                                  })

                                  return (
                                    <SessionTitleCard
                                      key={session.uniqueId}
                                      title={session.name}
                                      description={session.description}
                                      ticketCount={session.ticketTypes.length}
                                      isExpanded={expandedSessionIds.includes(session.uniqueId)}
                                      onToggle={() => handleSessionToggle(session.uniqueId)}
                                      onOpenDescription={() => setActiveSessionDescription({ title: session.name, description: session.description ?? '' })}
                                    >
                                      {session.ticketTypes.length > 0 ? (
                                        <Stack gap={4}>
                                          <Flex justify='flex-end' align={{ base: 'stretch', md: 'center' }} gap={3} direction={{ base: 'column', md: 'row' }}>
                                            <Box position='relative' w='full' maxW={{ base: 'full', md: '280px' }}>
                                              <Input
                                                value={searchValue}
                                                onChange={(event) => handleSessionTicketSearchChange(session.uniqueId, event.target.value)}
                                                placeholder='Search tickets'
                                                h='44px'
                                                px={4}
                                                pe={searchValue ? 11 : 4}
                                                borderRadius='full'
                                                borderColor='gray.300'
                                                bg='white'
                                                fontSize='sm'
                                                _focusVisible={{ borderColor: 'gray.500', boxShadow: '0 0 0 1px var(--chakra-colors-gray-500)' }}
                                              />
                                              {searchValue ? (
                                                <CloseButton
                                                  aria-label='Clear ticket search'
                                                  size='sm'
                                                  position='absolute'
                                                  top='50%'
                                                  right='10px'
                                                  transform='translateY(-50%)'
                                                  borderRadius='full'
                                                  color='gray.500'
                                                  bg='gray.100'
                                                  _hover={{ bg: 'gray.200', color: 'gray.700' }}
                                                  onClick={() => handleSessionTicketSearchChange(session.uniqueId, '')}
                                                />
                                              ) : null}
                                            </Box>
                                          </Flex>
                                          {filteredTickets.length > 0 ? (
                                            <SimpleGrid columns={{ base: 1, xl: 3 }} gap={4}>
                                              {filteredTickets.map((ticket) => (
                                                <TicketCard
                                                  key={ticket.uniqueId}
                                                  ticket={ticket}
                                                  quantity={selectedTicketQuantities[ticket.uniqueId] ?? 0}
                                                  currencyCode={event.paymentAccountCurrency}
                                                  onDecrease={() => handleTicketQuantityChange(ticket, (selectedTicketQuantities[ticket.uniqueId] ?? 0) - 1)}
                                                  onIncrease={() => handleTicketQuantityChange(ticket, (selectedTicketQuantities[ticket.uniqueId] ?? 0) + 1)}
                                                  onSelectQuantity={(value) => handleTicketQuantityChange(ticket, value)}
                                                />
                                              ))}
                                            </SimpleGrid>
                                          ) : (
                                            <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='gray.50' p={4}>
                                              <Text fontSize='sm' color='gray.600'>No tickets matched your search for this session.</Text>
                                            </Box>
                                          )}
                                        </Stack>
                                      ) : (
                                        <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='gray.50' p={4}>
                                          <Text fontSize='sm' color='gray.600'>No tickets are currently mapped to this session.</Text>
                                        </Box>
                                      )}
                                    </SessionTitleCard>
                                  )
                                })()
                              ))}
                            </Stack>
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
                        {activeIndex > 0 ? (
                          <Button {...CONTROL_BUTTON_OUTLINE} onClick={handleBackStep}><HStack gap={2}><ArrowLeft size={16} /><Text as='span'>Back</Text></HStack></Button>
                        ) : (
                          <Box />
                        )}
                        <Button {...CONTROL_BUTTON_PRIMARY} bg={formAccent} _hover={{ bg: hexToRgba(formAccent, 0.88), transform: 'translateY(-1px)' }} onClick={handleContinue} disabled={isFinalStep && Boolean(event.termsConditions) && !termsAccepted}><HStack gap={2}><Text as='span'>Continue</Text><ChevronRight size={16} /></HStack></Button>
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
          <Dialog.Positioner alignItems='center' justifyContent='center' px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }}>
            <Dialog.Content borderRadius='28px' overflow='hidden' bg='white' boxShadow='0 30px 70px rgba(15, 23, 42, 0.25)' maxH='80vh' display='flex' flexDirection='column'>
              <Box px={{ base: 4, md: 6 }} py={4} borderBottomWidth='1px' borderBottomColor='gray.200'><Flex justify='space-between' align='start' gap={4}><Stack gap={1}><Text fontSize='xs' textTransform='uppercase' letterSpacing='0.14em' color='gray.500' fontWeight='700'>Terms & Conditions</Text><Heading fontSize={{ base: 'xl', md: '2xl' }} color='gray.900' letterSpacing='-0.03em'>Registration agreement</Heading></Stack><CloseButton onClick={() => setTermsOpen(false)} /></Flex></Box>
              <Box px={{ base: 4, md: 6 }} py={{ base: 5, md: 6 }} flex='1' overflowY='auto'>{isHtmlContent(event.termsConditions) ? <RichTextBlock html={event.termsConditions} /> : <Text color='gray.700' lineHeight='1.75'>{event.termsConditions}</Text>}</Box>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>
      ) : null}

      <Dialog.Root open={Boolean(activeSessionDescription)} onOpenChange={(details) => { if (!details.open) setActiveSessionDescription(null) }} size='lg'>
        <Dialog.Backdrop backdropFilter='blur(8px)' bg='blackAlpha.600' />
        <Dialog.Positioner alignItems='center' justifyContent='center' px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }}>
          <Dialog.Content borderRadius='28px' overflow='hidden' bg='white' boxShadow='0 30px 70px rgba(15, 23, 42, 0.25)' maxH='80vh' display='flex' flexDirection='column'>
            <Box px={{ base: 4, md: 6 }} py={4} borderBottomWidth='1px' borderBottomColor='gray.200'>
              <Flex justify='space-between' align='start' gap={4}>
                <Stack gap={1}>
                  <Text fontSize='xs' textTransform='uppercase' letterSpacing='0.14em' color='gray.500' fontWeight='700'>Session Description</Text>
                  <Heading fontSize={{ base: 'xl', md: '2xl' }} color='gray.900' letterSpacing='-0.03em'>
                    {activeSessionDescription?.title}
                  </Heading>
                </Stack>
                <CloseButton onClick={() => setActiveSessionDescription(null)} />
              </Flex>
            </Box>
            <Box px={{ base: 4, md: 6 }} py={{ base: 5, md: 6 }} flex='1' overflowY='auto'>
              {activeSessionDescription ? (
                isHtmlContent(activeSessionDescription.description) ? (
                  <RichTextBlock html={activeSessionDescription.description} />
                ) : (
                  <Text color='gray.700' lineHeight='1.75'>{activeSessionDescription.description}</Text>
                )
              ) : null}
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <Dialog.Root open={Boolean(pendingDeleteAction)} onOpenChange={(details) => { if (!details.open) setPendingDeleteAction(null) }} size='sm'>
        <Dialog.Backdrop backdropFilter='blur(8px)' bg='blackAlpha.600' />
        <Dialog.Positioner alignItems='center' justifyContent='center' px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }}>
          <Dialog.Content borderRadius='24px' overflow='hidden' bg='white' boxShadow='0 30px 70px rgba(15, 23, 42, 0.25)'>
            <Box px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }}>
              <Stack gap={5}>
                <HStack gap={3} align='start'>
                  <Flex w='12' h='12' borderRadius='16px' align='center' justify='center' bg='red.50' color='red.500' flexShrink={0}>
                    <Trash2 size={18} />
                  </Flex>
                  <Stack gap={1}>
                    <Heading fontSize={{ base: 'lg', md: 'xl' }} color='gray.900' letterSpacing='-0.03em'>
                      {pendingDeleteAction?.title}
                    </Heading>
                    <Text fontSize='sm' color='gray.600' lineHeight='1.7'>
                      {pendingDeleteAction?.description}
                    </Text>
                  </Stack>
                </HStack>

                <Flex justify='flex-end' gap={3} direction={{ base: 'column-reverse', sm: 'row' }}>
                  <Button {...CONTROL_BUTTON_OUTLINE} onClick={() => setPendingDeleteAction(null)}>
                    Cancel
                  </Button>
                  <Button bg='red.500' color='white' borderRadius='16px' minH='11' px={5} _hover={{ bg: 'red.600' }} _active={{ bg: 'red.700' }} onClick={confirmDeleteAction}>
                    Remove
                  </Button>
                </Flex>
              </Stack>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  )
}





