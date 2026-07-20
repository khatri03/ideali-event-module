import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
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
  Input,
  Link,
  Grid,
  Portal,
  Separator,
  SimpleGrid,
  Table,
  Skeleton,
  SkeletonText,
  Stack,
  Tabs,
  Text,
} from '@chakra-ui/react'
import { toaster } from '@/lib/toaster'
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Clock3,
  ExternalLink,
  FileText,
  MapPin,
  MessageSquareText,
  Check,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { chakra } from '@chakra-ui/react'
import { format } from 'date-fns'
import {
  fetchEventRegistrationAttendeeInfo,
  fetchEventRegistrationDescription,
  fetchEventRegistrationPayment,
  fetchEventRegistrationQuestionnaire,
  fetchEventRegistrationSessions,
  fetchStripePublicCredentials,
} from '@/api/events'
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
type CardFieldId = 'number' | 'expiry' | 'cvc'
type PurchaseReviewValidationTarget = 'payment-method' | 'payment-card' | 'terms'

interface CardFieldState {
  complete: boolean
  error: string | null
}

interface PaymentCardValidationState {
  number: CardFieldState
  expiry: CardFieldState
  cvc: CardFieldState
}

interface PurchaseReviewIssue {
  message: string
  target: PurchaseReviewValidationTarget
}

const INITIAL_CARD_FIELD_STATE: PaymentCardValidationState = {
  number: { complete: false, error: null },
  expiry: { complete: false, error: null },
  cvc: { complete: false, error: null },
}

interface BannerSlide {
  imageUrl: string
}

export interface EventRegisterWizardEvent {
  uniqueId: string
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
  paymentAccountUniqueId: string | null
  paymentMethods: EventRegistrationPaymentMethod[]
  sessions: EventRegistrationSession[]
  visibleTabs?: string[]
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

function formatPurchaseCountdown(milliseconds: number) {
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

function getCurrencyDisplayPrefix(currencyCode?: string | null) {
  const trimmedCurrency = currencyCode?.trim()

  if (!trimmedCurrency) {
    return '$'
  }

  const normalizedCurrency = trimmedCurrency.toUpperCase()

  if (normalizedCurrency === 'CAD') return 'CAD$'
  if (normalizedCurrency === 'USD') return 'USD$'
  if (normalizedCurrency === 'AUD') return 'AUD$'
  if (normalizedCurrency === 'NZD') return 'NZD$'
  if (normalizedCurrency === 'SGD') return 'SGD$'
  if (normalizedCurrency === 'HKD') return 'HK$'
  if (normalizedCurrency === 'MXN') return 'MX$'
  if (normalizedCurrency === 'JPY') return 'JPY¥'
  if (normalizedCurrency === 'EUR') return 'EUR€'
  if (normalizedCurrency === 'GBP') return 'GBP£'

  return `${normalizedCurrency} `
}

function formatCurrencyNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
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
  if (!Number.isFinite(value) || value < 0) return '$0.00'
  const trimmedCurrency = currencyCode?.trim()

  if (trimmedCurrency) {
    const isIsoCurrencyCode = /^[A-Za-z]{3}$/.test(trimmedCurrency)

    if (isIsoCurrencyCode) {
      return `${getCurrencyDisplayPrefix(trimmedCurrency)}${formatCurrencyNumber(value)}`
    }

    return `${trimmedCurrency}${formatCurrencyNumber(value)}`
  }

  return `$${formatCurrencyNumber(value)}`
}

function formatChargeRate(valueType: string, value: number, currencyCode?: string | null) {
  const normalizedValue = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2).replace(/\.?0+$/, '')

  if (valueType.trim().toLowerCase().includes('percent')) {
    return `${normalizedValue}%`
  }

  return formatAmount(value, currencyCode)
}

function isHtmlContent(value: string | null | undefined) {
  return Boolean(value && /<[^>]+>/.test(value))
}

function getVisiblePaymentMethods(event: EventRegisterWizardEvent) {
  return event.paymentMethods.filter((method) => !method.isOrganizerOnly || event.isOrganizer)
}

function getVisibleTabs(event: EventRegisterWizardEvent) {
  const tabs: Array<{ id: WizardTabId; label: string; icon: typeof FileText }> = []
  const visibleTabs = event.visibleTabs ?? []

  if (visibleTabs.length > 0) {
    if (visibleTabs.includes('description')) tabs.push({ id: 'description', label: 'Description', icon: FileText })
    if (visibleTabs.includes('sessions')) tabs.push({ id: 'sessions', label: 'Sessions', icon: CalendarDays })
    if (visibleTabs.includes('attendee-info')) tabs.push({ id: 'attendee-info', label: 'Attendee Info', icon: Users })
    if (visibleTabs.includes('questionnaire')) tabs.push({ id: 'questionnaire', label: 'Questionnaire', icon: MessageSquareText })
    if (visibleTabs.includes('payment')) tabs.push({ id: 'payment', label: 'Payment', icon: CreditCard })
    return tabs
  }

  if (event.description?.trim() || event.summary?.trim()) tabs.push({ id: 'description', label: 'Description', icon: FileText })
  tabs.push({ id: 'sessions', label: 'Sessions', icon: CalendarDays })
  if (event.sessions.some((session) => session.requiresAttendeeInfo)) tabs.push({ id: 'attendee-info', label: 'Attendee Info', icon: Users })
  if (event.sessions.some((session) => session.customForms.length > 0 || session.customQuestions.length > 0)) tabs.push({ id: 'questionnaire', label: 'Questionnaire', icon: MessageSquareText })
  if (getVisiblePaymentMethods(event).length > 0) tabs.push({ id: 'payment', label: 'Payment', icon: CreditCard })
  return tabs
}

function AnimatedPaymentMethodBody({ isOpen, children }: { isOpen: boolean; children: ReactNode }) {
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [contentHeight, setContentHeight] = useState(0)

  useEffect(() => {
    if (!contentRef.current) return

    // Use the real content height so auto-collapsing panels animate cleanly.
    setContentHeight(contentRef.current.scrollHeight)
  }, [children, isOpen])

  return (
    <Box
      maxH={isOpen ? `${Math.max(contentHeight, 1)}px` : '0px'}
      opacity={isOpen ? 1 : 0}
      transform={isOpen ? 'translateY(0) scaleY(1)' : 'translateY(-10px) scaleY(0.98)'}
      transformOrigin='top'
      transition='max-height 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease, transform 360ms cubic-bezier(0.22, 1, 0.36, 1)'
      overflow='hidden'
      pointerEvents={isOpen ? 'auto' : 'none'}
      willChange='max-height, opacity, transform'
    >
      <Box ref={contentRef}>
        {children}
      </Box>
    </Box>
  )
}

function isCardPaymentMethod(paymentMethod: string) {
  return /card/i.test(paymentMethod)
}

function StripePaymentFields({
  paymentMethod,
  paymentAccountUniqueId,
  paymentAccountCurrency,
  cardHolderName,
  onCardHolderNameChange,
  cardFieldStates,
  showValidationErrors,
  onCardFieldStateChange,
  onAvailabilityChange,
  validationRef,
}: {
  paymentMethod: string
  paymentAccountUniqueId: string | null
  paymentAccountCurrency: string | null
  cardHolderName: string
  onCardHolderNameChange: (value: string) => void
  cardFieldStates: PaymentCardValidationState
  showValidationErrors: boolean
  onCardFieldStateChange: (fieldId: CardFieldId, nextState: CardFieldState) => void
  onAvailabilityChange: (state: { isReady: boolean; message: string | null }) => void
  validationRef?: RefObject<HTMLDivElement | null>
}) {
  const stripeCredentialsQuery = useQuery({
    queryKey: ['event-registration', paymentAccountUniqueId, 'stripe-credentials'],
    queryFn: () => fetchStripePublicCredentials(paymentAccountUniqueId ?? ''),
    enabled: isCardPaymentMethod(paymentMethod) && Boolean(paymentAccountUniqueId),
    retry: 1,
  })

  useEffect(() => {
    if (!isCardPaymentMethod(paymentMethod)) return

    if (!paymentAccountUniqueId) {
      onAvailabilityChange({
        isReady: false,
        message: 'Card fields are unavailable because the payment account is not configured.',
      })
      return
    }

    if (stripeCredentialsQuery.isLoading) {
      onAvailabilityChange({
        isReady: false,
        message: 'Loading card fields...',
      })
      return
    }

    if (stripeCredentialsQuery.isError) {
      onAvailabilityChange({
        isReady: false,
        message: 'Unable to load card fields right now.',
      })
      return
    }

    if (!stripeCredentialsQuery.data) {
      onAvailabilityChange({
        isReady: false,
        message: 'Card fields are not ready yet.',
      })
      return
    }

    onAvailabilityChange({
      isReady: true,
      message: null,
    })
  }, [onAvailabilityChange, paymentAccountUniqueId, paymentMethod, stripeCredentialsQuery.data, stripeCredentialsQuery.isError, stripeCredentialsQuery.isLoading])

  const stripePromise = useMemo(() => {
    const stripeCredentials = stripeCredentialsQuery.data
    if (!stripeCredentials) return null

    const stripeAccount = stripeCredentials.stripeAccount.trim()
    return loadStripe(
      stripeCredentials.publishableKey,
      stripeAccount ? { stripeAccount } : undefined,
    )
  }, [stripeCredentialsQuery.data])

  const elementOptions = useMemo(
    () => ({
      disableLink: true,
      style: {
        base: {
          color: '#0f172a',
          fontSize: '16px',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          fontSmoothing: 'antialiased',
          '::placeholder': {
            color: '#94a3b8',
          },
        },
        invalid: {
          color: '#dc2626',
        },
      },
    }),
    [],
  )

  if (!isCardPaymentMethod(paymentMethod)) {
    return null
  }

  if (!paymentAccountUniqueId) {
    return (
      <Box borderWidth='1px' borderColor='orange.200' bg='orange.50' borderRadius='18px' p={4}>
        <Text fontSize='sm' color='orange.800'>
          Card fields are unavailable because the payment account is not configured.
        </Text>
      </Box>
    )
  }

  if (stripeCredentialsQuery.isLoading) {
    return (
      <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' p={4} bg='gray.50'>
        <SkeletonText noOfLines={4} gap='3' />
      </Box>
    )
  }

  if (stripeCredentialsQuery.isError) {
    return (
      <Box borderWidth='1px' borderColor='red.200' bg='red.50' borderRadius='18px' p={4}>
        <Text fontSize='sm' color='red.700'>
          Unable to load card fields right now.
        </Text>
      </Box>
    )
  }

  if (!stripePromise) {
    return null
  }

  return (
    <Elements stripe={stripePromise}>
      <Box ref={validationRef} borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='white' overflow='hidden'>
        <Box px={4} py={3} bg='gray.50' borderBottomWidth='1px' borderBottomColor='gray.200'>
          <Text fontSize='sm' fontWeight='700' color='gray.700'>
            Card details
          </Text>
          <Text fontSize='sm' color='gray.500'>
            Enter the cardholder name and card information for {paymentAccountCurrency ?? 'the selected currency'}.
          </Text>
        </Box>

        <Stack gap={4} p={4}>
          <Box>
            <Text fontSize='sm' fontWeight='600' color='gray.700' mb={2}>
              Name on card <Text as='span' color='red.500'>*</Text>
            </Text>
            <Input
              value={cardHolderName}
              onChange={(event) => onCardHolderNameChange(event.target.value)}
              autoComplete='cc-name'
              placeholder='Enter cardholder name'
              borderColor={showValidationErrors && !cardHolderName.trim() ? 'red.300' : 'gray.200'}
              bg='white'
              borderRadius='14px'
              h='12'
              px={4}
            />
            {showValidationErrors && !cardHolderName.trim() ? (
              <Text mt={2} fontSize='xs' color='red.600'>
                Enter the cardholder name.
              </Text>
            ) : null}
          </Box>

          <Grid templateColumns={{ base: '1fr', md: '3fr 1fr 1fr' }} gap={3}>
            <Box>
              <Text fontSize='sm' fontWeight='600' color='gray.700' mb={2}>
                Card number <Text as='span' color='red.500'>*</Text>
              </Text>
              <Box
                borderWidth='1px'
                borderColor={showValidationErrors && (!cardFieldStates.number.complete || Boolean(cardFieldStates.number.error)) ? 'red.300' : 'gray.200'}
                borderRadius='14px'
                px={3}
                py={3}
                bg='white'
              >
                <CardNumberElement
                  options={elementOptions}
                  onChange={(details) =>
                    onCardFieldStateChange('number', {
                      complete: details.complete,
                      error: details.error?.message ?? null,
                    })
                  }
                />
              </Box>
              {showValidationErrors && (!cardFieldStates.number.complete || Boolean(cardFieldStates.number.error)) ? (
                <Text mt={2} fontSize='xs' color='red.600'>
                  {cardFieldStates.number.error ?? 'Complete the card number.'}
                </Text>
              ) : null}
            </Box>

            <Box>
              <Text fontSize='sm' fontWeight='600' color='gray.700' mb={2}>
                Expiry <Text as='span' color='red.500'>*</Text>
              </Text>
              <Box
                borderWidth='1px'
                borderColor={showValidationErrors && (!cardFieldStates.expiry.complete || Boolean(cardFieldStates.expiry.error)) ? 'red.300' : 'gray.200'}
                borderRadius='14px'
                px={3}
                py={3}
                bg='white'
              >
                <CardExpiryElement
                  options={elementOptions}
                  onChange={(details) =>
                    onCardFieldStateChange('expiry', {
                      complete: details.complete,
                      error: details.error?.message ?? null,
                    })
                  }
                />
              </Box>
              {showValidationErrors && (!cardFieldStates.expiry.complete || Boolean(cardFieldStates.expiry.error)) ? (
                <Text mt={2} fontSize='xs' color='red.600'>
                  {cardFieldStates.expiry.error ?? 'Complete the expiry date.'}
                </Text>
              ) : null}
            </Box>

            <Box>
              <Text fontSize='sm' fontWeight='600' color='gray.700' mb={2}>
                CVV <Text as='span' color='red.500'>*</Text>
              </Text>
              <Box
                borderWidth='1px'
                borderColor={showValidationErrors && (!cardFieldStates.cvc.complete || Boolean(cardFieldStates.cvc.error)) ? 'red.300' : 'gray.200'}
                borderRadius='14px'
                px={3}
                py={3}
                bg='white'
              >
                <CardCvcElement
                  options={elementOptions}
                  onChange={(details) =>
                    onCardFieldStateChange('cvc', {
                      complete: details.complete,
                      error: details.error?.message ?? null,
                    })
                  }
                />
              </Box>
              {showValidationErrors && (!cardFieldStates.cvc.complete || Boolean(cardFieldStates.cvc.error)) ? (
                <Text mt={2} fontSize='xs' color='red.600'>
                  {cardFieldStates.cvc.error ?? 'Complete the CVV.'}
                </Text>
              ) : null}
            </Box>
          </Grid>
        </Stack>
      </Box>
    </Elements>
  )
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
    const quantities = new Set<number>([0])

    for (let value = minimumPurchase; value <= upperBound; value += 1) {
      quantities.add(value)
    }

    return Array.from(quantities)
      .sort((left, right) => left - right)
      .map((value) => ({
        value: String(value),
        label: String(value),
      }))
  }

  const rollingUpperBound = Math.max(quantity + 10, minimumPurchase + 9)
  const quantities = new Set<number>([0])

  for (let value = minimumPurchase; value <= rollingUpperBound; value += 1) {
    quantities.add(value)
  }

  return Array.from(quantities)
    .sort((left, right) => left - right)
    .map((value) => ({
      value: String(value),
      label: String(value),
    }))
}

function getTicketQuantityAfterDecrement(ticket: EventRegistrationTicket, quantity: number) {
  const minimumPurchase = Math.max(ticket.minPurchase ?? 1, 1)

  if (quantity <= minimumPurchase) {
    return 0
  }

  return quantity - 1
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
  | {
      kind: 'all'
      title: string
      description: string
    }

function PurchaseTimerChip({
  remainingMs,
  durationMs,
  expired,
  accentColor,
}: {
  remainingMs: number
  durationMs: number
  expired: boolean
  accentColor: string
}) {
  const remainingText = formatPurchaseCountdown(remainingMs)
  const isRunningLow = !expired && remainingMs <= durationMs * 0.2
  const borderColor = expired ? 'red.200' : isRunningLow ? 'orange.200' : hexToRgba(accentColor, 0.16)
  const background = expired ? 'red.50' : isRunningLow ? 'orange.50' : 'white'
  const iconBackground = expired ? 'red.600' : isRunningLow ? 'orange.600' : accentColor
  const textColor = expired ? 'red.700' : isRunningLow ? 'orange.800' : 'gray.800'
  const borderGlow = expired ? '0 0 0 1px rgba(239, 68, 68, 0.12)' : isRunningLow ? '0 0 0 1px rgba(249, 115, 22, 0.12)' : '0 0 0 1px rgba(15, 23, 42, 0.06)'
  const helperText = expired
    ? 'Purchase time limit reached. Remove selected tickets to start a new purchase flow.'
    : isRunningLow
      ? 'Time is running out. Less than 20% of your purchase window remains.'
      : 'Your purchase window started the moment you selected your first ticket.'

  return (
    <Box
      as='span'
      title={helperText}
      aria-label={helperText}
      role='status'
      display='inline-flex'
      alignItems='center'
      gap={2.5}
      borderWidth='1px'
      borderColor={borderColor}
      borderRadius='full'
      bg={background}
      boxShadow={`0 12px 28px rgba(15, 23, 42, 0.08), ${borderGlow}`}
      px={3}
      py={2}
      cursor='help'
      maxW='full'
    >
      <Box w='8' h='8' borderRadius='full' display='grid' placeItems='center' bg={iconBackground} color='white' flexShrink={0}>
        <Clock3 size={16} />
      </Box>
      <Text fontSize='sm' fontWeight='900' color={textColor} letterSpacing='-0.02em' lineHeight='1'>
        {remainingText}
      </Text>
    </Box>
  )
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
              lineClamp={1}
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
                <chakra.select
                  value={String(quantity)}
                  onChange={(event) => onSelectQuantity(Number(event.target.value))}
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
                </chakra.select>
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

function SessionsTabSkeleton() {
  return (
    <Stack gap={4}>
      <Flex justify='flex-end'>
        <Skeleton h='38px' w='140px' borderRadius='full' />
      </Flex>

      <SimpleGrid columns={{ base: 1, xl: 3 }} gap={4}>
        {[0, 1, 2].map((index) => (
          <Box
            key={index}
            borderWidth='1px'
            borderColor='gray.200'
            borderRadius='20px'
            bg='white'
            overflow='hidden'
            boxShadow='0 10px 24px rgba(15, 23, 42, 0.04)'
          >
            <Box px={4} py={4} borderBottomWidth='1px' borderBottomColor='gray.100' bg='gray.50'>
              <Stack gap={3}>
                <Skeleton h='18px' w='70%' borderRadius='full' />
                <Skeleton h='12px' w='45%' borderRadius='full' />
              </Stack>
            </Box>
            <Stack gap={4} px={4} py={4}>
              <Skeleton h='44px' borderRadius='full' />
              <Skeleton h='120px' borderRadius='18px' />
            </Stack>
          </Box>
        ))}
      </SimpleGrid>
    </Stack>
  )
}

export function EventRegisterWizard({ event, formAccent, onBack }: { event: EventRegisterWizardEvent; formAccent: string; onBack: () => void }) {
  const accentBackground = hexToRgba(formAccent, 0.18)
  const tabs = useMemo(() => getVisibleTabs(event), [event])
  const firstTab = tabs[0]?.id ?? 'sessions'
  const [activeTab, setActiveTab] = useState<WizardTabId>(firstTab)
  const [highestUnlockedIndex, setHighestUnlockedIndex] = useState(0)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [expandedSessionIds, setExpandedSessionIds] = useState<string[]>([])
  const [activeSessionDescription, setActiveSessionDescription] = useState<{ title: string; description: string } | null>(null)
  const [sessionTicketSearch, setSessionTicketSearch] = useState<Record<string, string>>({})
  const [selectedTicketQuantities, setSelectedTicketQuantities] = useState<Record<string, number>>({})
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [cardHolderName, setCardHolderName] = useState('')
  const [cardFieldStates, setCardFieldStates] = useState<PaymentCardValidationState>(INITIAL_CARD_FIELD_STATE)
  const [cardFieldAvailability, setCardFieldAvailability] = useState<{ isReady: boolean; message: string | null }>({
    isReady: false,
    message: null,
  })
  const [isPurchaseReviewOpen, setIsPurchaseReviewOpen] = useState(false)
  const [purchaseReviewAttempted, setPurchaseReviewAttempted] = useState(false)
  const [purchaseReviewMessage, setPurchaseReviewMessage] = useState<string | null>(null)
  const [purchaseReviewScrollTarget, setPurchaseReviewScrollTarget] = useState<PurchaseReviewValidationTarget | null>(null)
  const [expandedPaymentMethod, setExpandedPaymentMethod] = useState<string | null>(null)
  const [purchaseTimerStartedAt, setPurchaseTimerStartedAt] = useState<number | null>(null)
  const [purchaseTimerNow, setPurchaseTimerNow] = useState(() => Date.now())
  const [purchaseTimerExpiryOpen, setPurchaseTimerExpiryOpen] = useState(false)
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)
  const [pendingDeleteAction, setPendingDeleteAction] = useState<PendingDeleteAction | null>(null)
  const paymentSubtotalSnapshotRef = useRef<number | null>(null)
  const paymentMethodValidationRef = useRef<HTMLDivElement | null>(null)
  const paymentCardValidationRef = useRef<HTMLDivElement | null>(null)
  const termsValidationRef = useRef<HTMLDivElement | null>(null)
  const descriptionQuery = useQuery({
    queryKey: ['event-registration', event.uniqueId, 'description'],
    queryFn: () => fetchEventRegistrationDescription(event.uniqueId),
    enabled: tabs.some((tab) => tab.id === 'description') && activeTab === 'description',
    retry: 1,
  })
  const sessionsQuery = useQuery({
    queryKey: ['event-registration', event.uniqueId, 'sessions'],
    queryFn: () => fetchEventRegistrationSessions(event.uniqueId),
    enabled: tabs.some((tab) => tab.id === 'sessions') && activeTab === 'sessions',
    retry: 1,
  })
  const attendeeInfoQuery = useQuery({
    queryKey: ['event-registration', event.uniqueId, 'attendee-info'],
    queryFn: () => fetchEventRegistrationAttendeeInfo(event.uniqueId),
    enabled: tabs.some((tab) => tab.id === 'attendee-info') && activeTab === 'attendee-info',
    retry: 1,
  })
  const questionnaireQuery = useQuery({
    queryKey: ['event-registration', event.uniqueId, 'questionnaire'],
    queryFn: () => fetchEventRegistrationQuestionnaire(event.uniqueId),
    enabled: tabs.some((tab) => tab.id === 'questionnaire') && activeTab === 'questionnaire',
    retry: 1,
  })
  useEffect(() => {
    setActiveTab(firstTab)
    setHighestUnlockedIndex(0)
  }, [firstTab])

  useEffect(() => {
    if (purchaseTimerStartedAt === null) return
    const timer = window.setInterval(() => {
      setPurchaseTimerNow(Date.now())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [purchaseTimerStartedAt])

  function restartPurchaseFlow() {
    window.location.reload()
  }

  const activeIndex = getStepIndex(tabs, activeTab)
  const isFinalStep = activeIndex >= 0 && activeIndex === tabs.length - 1
  const descriptionData = descriptionQuery.data ?? event
  const sessionsData =
    sessionsQuery.data?.sessions ??
    attendeeInfoQuery.data?.sessions ??
    questionnaireQuery.data?.sessions ??
    event.sessions ??
    []
  const selectedTicketSummary = useMemo<SelectedTicketSummaryItem[]>(
    () =>
      sessionsData.flatMap((session) =>
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
    [sessionsData, selectedTicketQuantities],
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
  const paymentQuery = useQuery({
    queryKey: ['event-registration', event.uniqueId, 'payment'],
    queryFn: () => fetchEventRegistrationPayment(event.uniqueId, selectedTicketTotal),
    enabled: tabs.some((tab) => tab.id === 'payment') && activeTab === 'payment',
    retry: 1,
  })
  const { refetch: refetchPaymentBreakdown, isSuccess: paymentBreakdownLoaded } = paymentQuery
  const paymentMethodsData = paymentQuery.data?.paymentMethods ?? event.paymentMethods ?? []
  const visiblePaymentMethods = paymentMethodsData.filter((method) => !method.isOrganizerOnly || event.isOrganizer)
  const paymentBreakdowns = paymentQuery.data?.paymentBreakdowns ?? []
  const selectedPaymentBreakdown =
    paymentBreakdowns.find((breakdown) => breakdown.paymentMethod === selectedPaymentMethod) ??
    paymentBreakdowns[0] ??
    null
  const isSelectedPaymentMethodCard = Boolean(selectedPaymentBreakdown && isCardPaymentMethod(selectedPaymentBreakdown.paymentMethod))
  const paymentBreakdownSubtotal = selectedPaymentBreakdown?.subtotal ?? selectedTicketTotal
  const eventData = {
    ...event,
    description: descriptionData.description ?? event.description,
    summary: descriptionData.summary ?? event.summary,
    termsConditions: descriptionData.termsConditions ?? event.termsConditions,
    sessions: sessionsData,
    paymentMethods: paymentMethodsData,
  }
  const currentEvent = eventData
  const sessions = currentEvent.sessions
  const bannerSlides = useMemo(() => getSessionBannerSlides(currentEvent), [currentEvent])
  const sessionsLoading = sessionsQuery.isLoading || (sessionsQuery.isFetching && sessions.length === 0)
  useEffect(() => {
    setExpandedSessionIds(sessions.map((session) => session.uniqueId))
  }, [sessions])
  const purchaseTimerDurationMs = Math.max(currentEvent.purchaseTimeLimitMinutes, 1) * 60 * 1000
  const purchaseTimerRemainingMs = purchaseTimerStartedAt === null ? null : purchaseTimerStartedAt + purchaseTimerDurationMs - purchaseTimerNow
  const purchaseTimerVisible = purchaseTimerStartedAt !== null
  const purchaseTimerExpired = purchaseTimerRemainingMs !== null && purchaseTimerRemainingMs <= 0

  useEffect(() => {
    if (purchaseTimerRemainingMs === null || purchaseTimerRemainingMs > 0) return

    setPurchaseTimerExpiryOpen(true)
  }, [purchaseTimerRemainingMs])

  useEffect(() => {
    if (activeTab !== 'payment' || !paymentBreakdownLoaded) return
    if (paymentSubtotalSnapshotRef.current === null) {
      paymentSubtotalSnapshotRef.current = selectedTicketTotal
      return
    }

    if (paymentSubtotalSnapshotRef.current === selectedTicketTotal) return

    paymentSubtotalSnapshotRef.current = selectedTicketTotal
    refetchPaymentBreakdown()
  }, [activeTab, paymentBreakdownLoaded, refetchPaymentBreakdown, selectedTicketTotal])

  useEffect(() => {
    if (activeTab !== 'payment') return

    const availableMethods = paymentBreakdowns.length > 0
      ? paymentBreakdowns.map((breakdown) => breakdown.paymentMethod)
      : visiblePaymentMethods.map((method) => method.paymentMethod)

    if (availableMethods.length === 0) {
      setSelectedPaymentMethod(null)
      return
    }

    setSelectedPaymentMethod((current) => (current && availableMethods.includes(current) ? current : availableMethods[0]))
  }, [activeTab, paymentBreakdowns, visiblePaymentMethods])
  const shouldHighlightSummaryLauncher = selectedTicketCount > 0 || purchaseTimerVisible
  const isDescriptionStep = activeTab === 'description'
  const sessionsStepIndex = getStepIndex(tabs, 'sessions')
  const effectiveHighestUnlockedIndex =
    selectedTicketCount > 0 ? highestUnlockedIndex : Math.min(highestUnlockedIndex, sessionsStepIndex)
  const canContinueForward = !purchaseTimerExpired && (isDescriptionStep || selectedTicketCount > 0)
  const footerActionLabel = isFinalStep ? 'Review Purchase' : 'Continue'
  const FooterActionIcon = isFinalStep ? Check : ChevronRight
  const footerActionDisabled = !canContinueForward || (isFinalStep && selectedTicketCount <= 0)

  function isStepEnabled(stepId: WizardTabId) {
    const index = getStepIndex(tabs, stepId)
    return index >= 0 && index <= effectiveHighestUnlockedIndex
  }

  function handleStepChange(stepId: string) {
    if (isStepEnabled(stepId as WizardTabId)) setActiveTab(stepId as WizardTabId)
  }

  function handleContinue() {
    if (purchaseTimerExpired) return
    if (!isDescriptionStep && selectedTicketCount <= 0) return
    if (activeIndex < 0 || activeIndex >= tabs.length - 1) return
    const nextIndex = activeIndex + 1
    setHighestUnlockedIndex((current) => Math.max(current, nextIndex))
    setActiveTab(tabs[nextIndex].id)
  }

  function getPurchaseReviewIssues() {
    const issues: PurchaseReviewIssue[] = []

    if (selectedTicketCount <= 0) {
      issues.push({ message: 'Select at least one ticket.', target: 'payment-method' })
    }

    if (!selectedPaymentBreakdown) {
      issues.push({ message: 'Select a payment method.', target: 'payment-method' })
    } else if (isCardPaymentMethod(selectedPaymentBreakdown.paymentMethod)) {
      if (!cardFieldAvailability.isReady) {
        issues.push({ message: cardFieldAvailability.message ?? 'Card fields are not ready yet.', target: 'payment-card' })
      }

      if (!cardHolderName.trim()) {
        issues.push({ message: 'Enter the cardholder name.', target: 'payment-card' })
      }

      if (!cardFieldStates.number.complete || cardFieldStates.number.error) {
        issues.push({ message: cardFieldStates.number.error ?? 'Complete the card number.', target: 'payment-card' })
      }

      if (!cardFieldStates.expiry.complete || cardFieldStates.expiry.error) {
        issues.push({ message: cardFieldStates.expiry.error ?? 'Complete the expiry date.', target: 'payment-card' })
      }

      if (!cardFieldStates.cvc.complete || cardFieldStates.cvc.error) {
        issues.push({ message: cardFieldStates.cvc.error ?? 'Complete the CVV.', target: 'payment-card' })
      }
    }

    if (currentEvent.termsConditions && !termsAccepted) {
      issues.push({ message: 'Accept the registration terms and conditions.', target: 'terms' })
    }

    return issues
  }

  useEffect(() => {
    if (!purchaseReviewAttempted || !purchaseReviewMessage || isPurchaseReviewOpen) return
    if (!purchaseReviewScrollTarget) return

    const targetRef =
      purchaseReviewScrollTarget === 'payment-method'
        ? paymentMethodValidationRef
        : purchaseReviewScrollTarget === 'payment-card'
          ? paymentCardValidationRef
          : termsValidationRef

    const frame = window.requestAnimationFrame(() => {
      targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isPurchaseReviewOpen, purchaseReviewAttempted, purchaseReviewMessage, purchaseReviewScrollTarget])

  function applyPurchaseReviewIssues(issues: PurchaseReviewIssue[]) {
    const firstIssue = issues[0] ?? null

    setPurchaseReviewAttempted(true)
    setPurchaseReviewMessage(firstIssue?.message ?? null)
    setPurchaseReviewScrollTarget(firstIssue?.target ?? null)
    setIsPurchaseReviewOpen(false)
  }

  function handlePurchaseReview() {
    const issues = getPurchaseReviewIssues()

    if (issues.length > 0) {
      applyPurchaseReviewIssues(issues)
      return
    }

    setPurchaseReviewAttempted(true)
    setPurchaseReviewMessage(null)
    setPurchaseReviewScrollTarget(null)
    setIsPurchaseReviewOpen(true)
  }

  function handlePrimaryAction() {
    if (isFinalStep) {
      handlePurchaseReview()
      return
    }

    handleContinue()
  }

  function handleConfirmPurchase() {
    const issues = getPurchaseReviewIssues()

    if (issues.length > 0) {
      applyPurchaseReviewIssues(issues)
      return
    }

    setIsPurchaseReviewOpen(false)
    toaster.create({
      type: 'success',
      title: 'Purchase summary confirmed',
      description: 'Your selected tickets and payment method have been reviewed.',
    })
  }

  const purchaseReviewTicketRows = selectedTicketSummaryBySession.flatMap((sessionGroup) =>
    sessionGroup.items.map((item) => ({
      sessionName: sessionGroup.sessionName,
      ticketName: item.ticketName,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
  )
  const purchaseReviewChargeRows = selectedPaymentBreakdown?.charges ?? []
  const selectedPaymentMethodLabel =
    selectedPaymentBreakdown?.label ??
    selectedPaymentBreakdown?.paymentMethod ??
    'Payment method not selected'

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
    setExpandedSessionIds(sessions.map((session) => session.uniqueId))
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
      const requestedQuantity = nextQuantity <= 0 ? 0 : Math.max(nextQuantity, minimumPurchase)
      const normalized = Math.max(0, maxAllowed === null ? requestedQuantity : Math.min(requestedQuantity, maxAllowed))

      if (normalized <= 0) {
        const next = { ...current }
        delete next[ticket.uniqueId]
        return next
      }

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
        delete next[item.ticketId]
      })
      return next
    })
  }

  function handleRemoveAllTickets() {
    const resetIndex = sessionsStepIndex >= 0 ? sessionsStepIndex : 0
    setSelectedTicketQuantities({})
    setSelectedPaymentMethod(null)
    setExpandedPaymentMethod(null)
    setCardHolderName('')
    setTermsAccepted(false)
    setTermsOpen(false)
    setPurchaseTimerStartedAt(null)
    setPurchaseTimerNow(Date.now())
    paymentSubtotalSnapshotRef.current = null
    setIsSummaryOpen(false)
    setHighestUnlockedIndex((current) => Math.min(current, resetIndex))
    setActiveTab(tabs[resetIndex]?.id ?? 'sessions')
  }

  function requestRemoveTicket(ticket: EventRegistrationTicket, ticketName: string) {
    setPendingDeleteAction({
      kind: 'ticket',
      ticket,
      title: 'Remove item',
      description: `Remove ${ticketName} from your selected items?`,
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

  function requestRemoveAllTickets() {
    setPendingDeleteAction({
      kind: 'all',
      title: 'Remove all items',
      description: 'Remove all selected tickets from your registration?',
    })
  }

  function confirmDeleteAction() {
    if (!pendingDeleteAction) return

    if (pendingDeleteAction.kind === 'ticket') {
      handleRemoveTicket(pendingDeleteAction.ticket)
    } else if (pendingDeleteAction.kind === 'session') {
      handleRemoveSession(pendingDeleteAction.items)
    } else {
      handleRemoveAllTickets()
    }

    setPendingDeleteAction(null)
  }

  useEffect(() => {
    if (selectedTicketCount > 0) return
    if (activeIndex <= sessionsStepIndex) return
    if (sessionsStepIndex < 0) return

    setHighestUnlockedIndex((current) => Math.min(current, sessionsStepIndex))
    setActiveTab(tabs[sessionsStepIndex].id)
  }, [activeIndex, selectedTicketCount, sessionsStepIndex, tabs])

  const areAllSessionsExpanded =
    sessions.length > 0 && expandedSessionIds.length === sessions.length

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
                        {currentEvent.summary ? <Text fontSize='sm' color='gray.600' lineHeight='1.7'>{currentEvent.summary}</Text> : null}
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

            <Portal>
              <Box
                position='fixed'
                left={{ base: 0, md: 'auto' }}
                right={{ base: 0, md: 2.5 }}
                bottom={{ base: 0, sm: 0, md: 2.5 }}
                zIndex={999}
                pointerEvents='none'
                px={{ base: 0, md: 0 }}
                pb={{ base: 0, md: 0 }}
              >
              <Box
                pointerEvents='auto'
                w={{ base: 'full', md: '380px' }}
                maxH={{ base: 'min(72dvh, 560px)', md: 'calc(100dvh - 1.5rem)' }}
                  borderWidth='1px'
                  borderColor='gray.200'
                  borderRadius={{ base: '24px 24px 0 0', md: '26px' }}
                  bg='white'
                  boxShadow='0 28px 80px rgba(15, 23, 42, 0.22)'
                  overflow='hidden'
                  display='flex'
                  flexDirection='column'
                >
                  <Box
                    px={4}
                    py={3.5}
                    borderBottomWidth={isSummaryOpen ? '1px' : '0'}
                    borderBottomColor={hexToRgba(formAccent, 0.32)}
                    bg={formAccent}
                    color='white'
                    cursor='pointer'
                    onClick={() => setIsSummaryOpen((current) => !current)}
                    transition='border-color 0.22s ease'
                  >
                    <Flex
                      align='center'
                      justify='space-between'
                      gap={3}
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
                      <HStack gap={2.5} flexShrink={0}>
                        <Text fontSize='sm' fontWeight='800' lineHeight='1.1' color='white'>
                          {formatAmount(selectedTicketTotal, event.paymentAccountCurrency)}
                        </Text>
                        <Box
                          color='whiteAlpha.900'
                          transform={isSummaryOpen ? 'rotate(0deg)' : 'rotate(-90deg)'}
                          transition='transform 220ms ease'
                          flexShrink={0}
                        >
                          <ChevronDown size={18} />
                        </Box>
                      </HStack>
                    </Flex>
                  </Box>

                  <Box
                    flex='1'
                    minH={0}
                    maxH={isSummaryOpen ? { base: 'min(72vh, 560px)', md: 'min(74vh, 620px)' } : '0px'}
                    opacity={isSummaryOpen ? 1 : 0}
                    transform={isSummaryOpen ? 'translateY(0)' : 'translateY(10px)'}
                    transition='max-height 280ms ease, opacity 220ms ease, transform 220ms ease'
                    overflow='hidden'
                    display='flex'
                    flexDirection='column'
                  >
                    <Stack gap={3} px={4} py={4} flex='1' minH={0} overflow='hidden'>
                      <Box borderWidth='1px' borderColor='orange.200' bg='orange.50' borderRadius='16px' px={3.5} py={3}>
                        <Text fontSize='sm' color='orange.900' lineHeight='1.6' fontWeight='800'>
                          Prices exclusive of tax and other charges.
                        </Text>
                      </Box>

                      <Box flex='1' minH={0} overflowY='auto' pr={1}>
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
                                <Box px={4} py={3.5} bg='gray.50' borderBottomWidth='1px' borderBottomColor='gray.200'>
                                  <Flex align='start' justify='space-between' gap={3}>
                                    <Stack gap={1} minW={0}>
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
                                      <Text fontSize='xs' color='gray.500' lineHeight='1.4'>
                                        {sessionGroup.items.length} {sessionGroup.items.length === 1 ? 'ticket type selected' : 'ticket types selected'}
                                      </Text>
                                    </Stack>

                                    <HStack gap={2.5} flexShrink={0}>
                                      <Badge
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
                                      <Button
                                        minW='0'
                                        h='20px'
                                        p='0'
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
                                    </HStack>
                                  </Flex>
                                </Box>

                                <Stack gap={0} px={4} py={2.5}>
                                  {sessionGroup.items.map((item, itemIndex) => {
                                    const quantityOptions = getTicketQuantityOptions(item.ticket, item.quantity)

                                    return (
                                    <Box
                                      key={item.ticketId}
                                      py={3}
                                      borderBottomWidth={itemIndex < sessionGroup.items.length - 1 ? '1px' : '0'}
                                      borderBottomColor='gray.100'
                                    >
                                      <Stack gap={2.5}>
                                        <Flex justify='space-between' align='start' gap={3}>
                                          <Stack gap={1} minW={0}>
                                            <Text
                                              fontSize='sm'
                                              fontWeight='800'
                                              color='gray.900'
                                              lineHeight='1.4'
                                              whiteSpace='normal'
                                              wordBreak='break-word'
                                              minW={0}
                                            >
                                              {item.ticketName}
                                            </Text>
                                            <HStack gap={2} wrap='wrap' minW={0} align='center'>
                                              <Text fontSize='xs' color='gray.500'>
                                                {formatAmount(item.unitPrice, event.paymentAccountCurrency)}
                                              </Text>
                                              <Text fontSize='xs' color='gray.300'>|</Text>
                                              <Text fontSize='xs' fontWeight='700' color='gray.700'>
                                                {formatAmount(item.lineTotal, event.paymentAccountCurrency)}
                                              </Text>
                                            </HStack>
                                          </Stack>

                                          <Button
                                            minW='0'
                                            h='16px'
                                            p='0'
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
                                        </Flex>

                                        <HStack
                                          gap={2}
                                          align='center'
                                          justify='space-between'
                                          borderWidth='1px'
                                          borderColor='gray.200'
                                          borderRadius='16px'
                                          bg='gray.50'
                                          px={2}
                                          py={1.5}
                                        >
                                          <Text fontSize='xs' color='gray.500' fontWeight='600' flexShrink={0}>
                                            Qty
                                          </Text>
                                          <HStack
                                            gap={1}
                                            borderWidth='1px'
                                            borderColor='gray.200'
                                            borderRadius='full'
                                            bg='white'
                                            px={1}
                                            py={0.5}
                                            w='132px'
                                            minW='132px'
                                            flexShrink={0}
                                            justify='space-between'
                                            align='center'
                                          >
                                              <Button
                                                minW='0'
                                                w='28px'
                                                h='28px'
                                                p='0'
                                                borderRadius='full'
                                                borderWidth='1px'
                                                borderColor='gray.300'
                                                bg='white'
                                                onClick={() => handleTicketQuantityChange(item.ticket, getTicketQuantityAfterDecrement(item.ticket, item.quantity))}
                                                disabled={item.quantity <= 0}
                                                aria-label={`Decrease ${item.ticketName}`}
                                                title={`Decrease ${item.ticketName}`}
                                              >
                                                <Text as='span' fontSize='md' fontWeight='800' lineHeight='1' color='gray.700'>-</Text>
                                              </Button>

                                            <Box flex='1' minW='0' position='relative'>
                                              <chakra.select
                                                value={String(item.quantity)}
                                                onChange={(event) => handleTicketQuantityChange(item.ticket, Number(event.target.value))}
                                                w='full'
                                                h='28px'
                                                pl={2}
                                                pr={6}
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
                                              </chakra.select>
                                              <Flex
                                                position='absolute'
                                                insetY='0'
                                                right={2}
                                                align='center'
                                                pointerEvents='none'
                                                color='gray.500'
                                              >
                                                <ChevronDown size={14} strokeWidth={2.25} />
                                              </Flex>
                                            </Box>

                                            <Button
                                              minW='0'
                                              w='28px'
                                              h='28px'
                                              p='0'
                                              borderRadius='full'
                                              borderWidth='1px'
                                              borderColor='gray.300'
                                              bg='white'
                                              color='gray.700'
                                              onClick={() => handleTicketQuantityChange(item.ticket, item.quantity + 1)}
                                              disabled={getTicketSelectableMax(item.ticket) !== null && item.quantity >= (getTicketSelectableMax(item.ticket) ?? 0)}
                                              aria-label={`Increase ${item.ticketName}`}
                                              title={`Increase ${item.ticketName}`}
                                            >
                                              <Text as='span' fontSize='md' fontWeight='800' lineHeight='1'>+</Text>
                                            </Button>
                                          </HStack>
                                        </HStack>
                                      </Stack>
                                    </Box>
                                    )
                                  })}
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
                      </Box>

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

            {currentEvent.termsConditions ? (
              <Box ref={termsValidationRef} borderWidth='1px' borderColor='gray.200' borderRadius='20px' bg='white' px={{ base: 4, md: 5 }} py={4} boxShadow='0 12px 30px rgba(15, 23, 42, 0.08)'>
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
                    const enabled = index <= effectiveHighestUnlockedIndex
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
                              {currentEvent.summary ? <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='gray.50' p={4}><Text fontSize='sm' fontWeight='700' color='gray.900' mb={2}>Summary</Text><Text color='gray.700' lineHeight='1.7'>{currentEvent.summary}</Text></Box> : null}
                              {currentEvent.description ? <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='white' p={5}>{isHtmlContent(currentEvent.description) ? <RichTextBlock html={currentEvent.description} /> : <Text color='gray.700' lineHeight='1.7'>{currentEvent.description}</Text>}</Box> : null}
                            </Stack>
                          ) : null}

                          {tab.id === 'sessions' ? (
                            <Stack gap={4}>
                              {sessionsLoading ? (
                                <SessionsTabSkeleton />
                              ) : sessions.length > 0 ? (
                                <Flex
                                  align={{ base: 'stretch', md: 'center' }}
                                  justify='space-between'
                                  gap={3}
                                  direction={{ base: 'column', md: 'row' }}
                                >
                                  <Box minH='11' display='flex' alignItems='center'>
                                    {selectedTicketCount > 0 ? (
                                      <Button
                                        variant='ghost'
                                        color='red.600'
                                        fontSize='sm'
                                        fontWeight='700'
                                        minH='11'
                                        px={0}
                                        _hover={{ bg: 'transparent', color: 'red.700', textDecoration: 'underline' }}
                                        _active={{ bg: 'transparent', color: 'red.800' }}
                                        onClick={requestRemoveAllTickets}
                                      >
                                        Remove all
                                      </Button>
                                    ) : null}
                                  </Box>

                                  <Box display='flex' justifyContent={{ base: 'flex-start', md: 'flex-end' }}>
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
                                  </Box>
                                </Flex>
                              ) : null}
                              {sessions.map((session) => (
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
                                                  onDecrease={() => handleTicketQuantityChange(ticket, getTicketQuantityAfterDecrement(ticket, selectedTicketQuantities[ticket.uniqueId] ?? 0))}
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
                              <Stack gap={4}>{sessions.filter((session) => session.requiresAttendeeInfo).map((session) => <Box key={session.uniqueId} borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='gray.50' p={4}><HStack justify='space-between' gap={4} align='start' flexWrap='wrap'><Stack gap={1}><Text fontWeight='700' color='gray.900'>{session.name}</Text><Text fontSize='sm' color='gray.600'>Attendee information will be collected for this session.</Text></Stack><Badge colorPalette='blue' variant='subtle' borderRadius='full' px={3} py={1}>Required</Badge></HStack></Box>)}</Stack>
                            </SupportCard>
                          ) : null}

                          {tab.id === 'questionnaire' ? (
                            <SupportCard title='Questionnaire' subtitle='Custom forms and questions mapped to the sessions are rendered here.' icon={<MessageSquareText size={18} />}>
                              <Stack gap={5}>{sessions.filter((session) => session.customForms.length > 0 || session.customQuestions.length > 0).map((session) => <Box key={session.uniqueId} borderWidth='1px' borderColor='gray.200' borderRadius='20px' p={5} bg='gray.50'><Stack gap={4}><Box><Text fontSize='lg' fontWeight='700' color='gray.900'>{session.name}</Text><Text fontSize='sm' color='gray.600'>Questionnaire content mapped to this session.</Text></Box>{session.customForms.length > 0 ? <Stack gap={3}><Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.14em'>Custom Forms</Text><SimpleGrid columns={{ base: 1, lg: 2 }} gap={3}>{session.customForms.map((form) => <Box key={form.uniqueId} borderWidth='1px' borderColor='gray.200' borderRadius='16px' bg='white' p={4}><Text fontWeight='700' color='gray.900'>{form.headerText ?? form.name}</Text>{form.description ? <Text mt={2} fontSize='sm' color='gray.600' lineHeight='1.7'>{form.description}</Text> : null}</Box>)}</SimpleGrid></Stack> : null}{session.customQuestions.length > 0 ? <Stack gap={3}><Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.14em'>Custom Questions</Text><Stack gap={3}>{session.customQuestions.map((question) => <Box key={question.uniqueId} borderWidth='1px' borderColor='gray.200' borderRadius='16px' bg='white' p={4}><HStack justify='space-between' gap={4} align='start' flexWrap='wrap'><Stack gap={1}><Text fontWeight='700' color='gray.900'>{question.label}</Text><Text fontSize='sm' color='gray.600'>{question.controlType}</Text></Stack><Badge colorPalette={question.required ? 'red' : 'gray'} variant='subtle' borderRadius='full' px={3} py={1}>{question.required ? 'Required' : 'Optional'}</Badge></HStack></Box>)}</Stack></Stack> : null}</Stack></Box>)}</Stack>
                            </SupportCard>
                          ) : null}

                          {tab.id === 'payment' ? (
                            <SupportCard title='Payment' subtitle='Show the mapped payment methods and protect organizer-only cheque payments.' icon={<CreditCard size={18} />}>
                              <Stack gap={4}>
                                <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' p={4} bg='gray.50'>
                                  <HStack justify='space-between' gap={4} align='start' flexWrap='wrap'>
                                    <Stack gap={1}>
                                      <Text fontSize='sm' color='gray.600'>Selected ticket subtotal</Text>
                                      <Text fontSize='2xl' fontWeight='800' color='gray.900'>
                                        {formatAmount(selectedTicketTotal, currentEvent.paymentAccountCurrency)}
                                      </Text>
                                    </Stack>
                                    <Text fontSize='sm' color='gray.600' textAlign='right' maxW='sm'>
                                      Review the charges for each payment method before choosing how to pay.
                                    </Text>
                                  </HStack>
                                </Box>

                                {paymentQuery.isFetching && paymentBreakdowns.length === 0 ? (
                                  <Stack gap={4}>
                                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                                      {[0, 1].map((index) => (
                                        <Skeleton key={index} h='92px' borderRadius='18px' />
                                      ))}
                                    </SimpleGrid>
                                    <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='gray.50' p={4}>
                                      <SkeletonText noOfLines={4} gap='4' />
                                    </Box>
                                  </Stack>
                                ) : paymentBreakdowns.length > 0 ? (
                                  <>
                                    <Stack gap={4}>
                                    <Stack gap={2} ref={paymentMethodValidationRef}>
                                      <HStack justify='space-between' gap={4} flexWrap='wrap'>
                                        <Text fontSize='sm' fontWeight='700' color='gray.700'>Select payment method</Text>
                                      </HStack>
                                    </Stack>

                                    <Stack gap={3}>
                                      {paymentBreakdowns.map((breakdown) => {
                                        const isSelected = selectedPaymentBreakdown?.paymentMethod === breakdown.paymentMethod
                                        const isExpanded = expandedPaymentMethod === breakdown.paymentMethod
                                        const showPaymentControls = isSelected && isCardPaymentMethod(breakdown.paymentMethod)

                                        return (
                                          <Box
                                            key={breakdown.paymentMethod}
                                            borderWidth='1px'
                                            borderColor={isSelected ? formAccent : 'gray.200'}
                                            borderRadius='18px'
                                            bg={isSelected ? hexToRgba(formAccent, 0.08) : 'white'}
                                            boxShadow={isSelected ? `0 0 0 1px ${formAccent}` : '0 10px 24px rgba(15, 23, 42, 0.04)'}
                                            overflow='hidden'
                                          >
                                            <Button
                                              onClick={() => {
                                                setSelectedPaymentMethod(breakdown.paymentMethod)
                                                setExpandedPaymentMethod((current) =>
                                                  current === breakdown.paymentMethod ? null : breakdown.paymentMethod,
                                                )
                                              }}
                                              variant='ghost'
                                              w='full'
                                              h='auto'
                                              px={4}
                                              py={4}
                                              justifyContent='space-between'
                                              alignItems='center'
                                              textAlign='left'
                                              borderRadius={0}
                                              _hover={{ bg: isSelected ? hexToRgba(formAccent, 0.12) : 'gray.50' }}
                                              _active={{ bg: isSelected ? hexToRgba(formAccent, 0.16) : 'gray.100' }}
                                            >
                                              <HStack gap={3} minW={0} flex='1' justify='space-between' align='start'>
                                                <Stack gap={1} minW={0} flex='1'>
                                                  <HStack gap={2} wrap='wrap' minW={0}>
                                                    <Text fontWeight='800' color='gray.900'>{breakdown.label}</Text>
                                                    {breakdown.isOrganizerOnly ? <Badge colorPalette='purple' variant='subtle' borderRadius='full' px={3} py={1}>Organizer only</Badge> : null}
                                                  </HStack>
                                                </Stack>

                                                <HStack gap={2} flexShrink={0}>
                                                  <Text fontSize='lg' fontWeight='800' color='gray.900'>
                                                    {formatAmount(breakdown.grandTotal, currentEvent.paymentAccountCurrency)}
                                                  </Text>
                                                  <Box
                                                    display='inline-flex'
                                                    alignItems='center'
                                                    justifyContent='center'
                                                    w='28px'
                                                    h='28px'
                                                    borderRadius='full'
                                                    borderWidth='1px'
                                                    borderColor={isExpanded ? formAccent : 'gray.300'}
                                                    bg={isExpanded ? hexToRgba(formAccent, 0.12) : 'gray.50'}
                                                    color='gray.700'
                                                    flexShrink={0}
                                                  >
                                                    <Box transform={isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'} transition='transform 0.2s ease'>
                                                      <ChevronDown size={14} />
                                                    </Box>
                                                  </Box>
                                                </HStack>
                                              </HStack>
                                            </Button>

                                            <Separator borderColor='gray.200' />

                                            <AnimatedPaymentMethodBody isOpen={isExpanded}>
                                              <Stack gap={4} px={4} py={4}>
                                                {showPaymentControls ? (
                                                  <StripePaymentFields
                                                    paymentMethod={breakdown.paymentMethod}
                                                    paymentAccountUniqueId={currentEvent.paymentAccountUniqueId}
                                                    paymentAccountCurrency={currentEvent.paymentAccountCurrency}
                                                    cardHolderName={cardHolderName}
                                                    onCardHolderNameChange={setCardHolderName}
                                                    cardFieldStates={cardFieldStates}
                                                    showValidationErrors={purchaseReviewAttempted}
                                                    onCardFieldStateChange={(fieldId, nextState) =>
                                                      setCardFieldStates((current) => ({
                                                        ...current,
                                                        [fieldId]: nextState,
                                                      }))
                                                    }
                                                    onAvailabilityChange={setCardFieldAvailability}
                                                    validationRef={paymentCardValidationRef}
                                                  />
                                                ) : (
                                                  <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='gray.50' p={4}>
                                                    <Text fontSize='sm' color='gray.600'>
                                                      This payment method has no additional input fields.
                                                    </Text>
                                                  </Box>
                                                )}
                                              </Stack>
                                            </AnimatedPaymentMethodBody>
                                          </Box>
                                        )
                                      })}
                                    </Stack>
                                    </Stack>

                                    {isFinalStep && purchaseReviewAttempted && purchaseReviewMessage ? (
                                      <Box borderWidth='1px' borderColor='red.200' bg='red.50' borderRadius='18px' p={4}>
                                        <Text fontSize='sm' color='red.700' fontWeight='600'>
                                          {purchaseReviewMessage}
                                        </Text>
                                      </Box>
                                    ) : null}

                                    {selectedPaymentBreakdown ? (
                                      <Box borderWidth='1px' borderColor='gray.200' borderRadius='20px' bg='white' overflow='hidden' boxShadow='0 10px 24px rgba(15, 23, 42, 0.04)'>
                                        <Box px={4} py={4} borderBottomWidth='1px' borderBottomColor='gray.200' bg='gray.50'>
                                          <HStack justify='space-between' gap={4} flexWrap='wrap'>
                                            <Stack gap={1}>
                                              <Text fontSize='sm' fontWeight='700' color='gray.600'>Payment breakdown</Text>
                                              <Text fontSize='lg' fontWeight='800' color='gray.900'>{selectedPaymentBreakdown.label}</Text>
                                            </Stack>
                                            {selectedPaymentBreakdown.isOrganizerOnly ? <Badge colorPalette='purple' variant='subtle' borderRadius='full' px={3} py={1}>Organizer only</Badge> : null}
                                          </HStack>
                                        </Box>

                                        <Stack gap={4} p={4}>
                                          <Table.Root variant='line' size='sm' borderColor='gray.200'>
                                            <Table.Header>
                                              <Table.Row bg='white'>
                                                <Table.ColumnHeader borderColor='gray.200' px={4} py={3} color='gray.600' fontSize='xs' textTransform='uppercase' letterSpacing='0.12em'>
                                                  Item
                                                </Table.ColumnHeader>
                                                <Table.ColumnHeader borderColor='gray.200' px={4} py={3} color='gray.600' fontSize='xs' textTransform='uppercase' letterSpacing='0.12em'>
                                                  Price
                                                </Table.ColumnHeader>
                                                <Table.ColumnHeader borderColor='gray.200' px={4} py={3} color='gray.600' fontSize='xs' textTransform='uppercase' letterSpacing='0.12em'>
                                                  Quantity
                                                </Table.ColumnHeader>
                                                <Table.ColumnHeader borderColor='gray.200' px={4} py={3} color='gray.600' fontSize='xs' textTransform='uppercase' letterSpacing='0.12em' textAlign='right'>
                                                  Total
                                                </Table.ColumnHeader>
                                              </Table.Row>
                                            </Table.Header>

                                            <Table.Body>
                                              {selectedTicketSummaryBySession.map((sessionGroup, sessionIndex) => (
                                                <Fragment key={sessionGroup.sessionId}>
                                                  <Table.Row key={`${sessionGroup.sessionId}-header`} bg='gray.50'>
                                                    <Table.Cell borderColor='gray.200' px={4} py={3} colSpan={4}>
                                                      <HStack justify='space-between' gap={3} minW={0}>
                                                        <Stack gap={0.5} minW={0}>
                                                          <Text fontWeight='800' color='gray.900' lineHeight='1.4' whiteSpace='normal' wordBreak='break-word'>
                                                            {sessionGroup.sessionName}
                                                          </Text>
                                                          <Text fontSize='xs' color='gray.500'>
                                                            {sessionGroup.items.length} {sessionGroup.items.length === 1 ? 'ticket type selected' : 'ticket types selected'}
                                                          </Text>
                                                        </Stack>
                                                      </HStack>
                                                    </Table.Cell>
                                                  </Table.Row>

                                                  {sessionGroup.items.map((item) => {
                                                    const quantityOptions = getTicketQuantityOptions(item.ticket, item.quantity)

                                                    return (
                                                      <Table.Row key={item.ticketId}>
                                                        <Table.Cell borderColor='gray.200' px={4} py={3}>
                                                          <Text fontWeight='700' color='gray.900' lineHeight='1.4' whiteSpace='normal' wordBreak='break-word'>
                                                            {item.ticketName}
                                                          </Text>
                                                        </Table.Cell>
                                                        <Table.Cell borderColor='gray.200' px={4} py={3}>
                                                          <Text fontWeight='700' color='gray.800'>
                                                            {formatAmount(item.unitPrice, currentEvent.paymentAccountCurrency)}
                                                          </Text>
                                                        </Table.Cell>
                                                        <Table.Cell borderColor='gray.200' px={4} py={3}>
                                                          <Flex justify='center'>
                                                            <HStack
                                                              gap={1.5}
                                                              borderWidth='1px'
                                                              borderColor='gray.200'
                                                              borderRadius='full'
                                                              bg='gray.50'
                                                              px={1.5}
                                                              py={1}
                                                              w='full'
                                                              maxW='152px'
                                                              justify='space-between'
                                                              align='center'
                                                            >
                                                              <Button
                                                                minW='0'
                                                                w='28px'
                                                                h='28px'
                                                                p='0'
                                                                borderRadius='full'
                                                                borderWidth='1px'
                                                                borderColor={item.quantity === 1 ? 'red.300' : 'gray.300'}
                                                                bg={item.quantity === 1 ? 'red.50' : 'white'}
                                                                color={item.quantity === 1 ? 'red.500' : 'gray.700'}
                                                                _hover={item.quantity === 1 ? { bg: 'red.100', color: 'red.600' } : { bg: 'gray.50' }}
                                                                _active={item.quantity === 1 ? { bg: 'red.200', color: 'red.700' } : { bg: 'gray.100' }}
                                                                onClick={() =>
                                                                  item.quantity === 1
                                                                    ? requestRemoveTicket(item.ticket, item.ticketName)
                                                                    : handleTicketQuantityChange(item.ticket, getTicketQuantityAfterDecrement(item.ticket, item.quantity))
                                                                }
                                                                disabled={item.quantity <= 0}
                                                                aria-label={item.quantity === 1 ? `Remove ${item.ticketName}` : `Decrease ${item.ticketName}`}
                                                                title={item.quantity === 1 ? `Remove ${item.ticketName}` : `Decrease ${item.ticketName}`}
                                                              >
                                                                {item.quantity === 1 ? (
                                                                  <Trash2 size={13} strokeWidth={2.2} />
                                                                ) : (
                                                                  <Text as='span' fontSize='md' fontWeight='800' lineHeight='1'>-</Text>
                                                                )}
                                                              </Button>

                                                              <Box flex='1' minW='68px' maxW='84px' position='relative'>
                                                                <chakra.select
                                                                  value={String(item.quantity)}
                                                                  onChange={(event) => handleTicketQuantityChange(item.ticket, Number(event.target.value))}
                                                                  w='full'
                                                                  h='30px'
                                                                  pl={2}
                                                                  pr={7}
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
                                                                </chakra.select>
                                                                <Flex
                                                                  position='absolute'
                                                                  insetY='0'
                                                                  right={2}
                                                                  align='center'
                                                                  pointerEvents='none'
                                                                  color='gray.500'
                                                                >
                                                                  <ChevronDown size={12} strokeWidth={2.25} />
                                                                </Flex>
                                                              </Box>

                                                              <Button
                                                                minW='0'
                                                                w='28px'
                                                                h='28px'
                                                                p='0'
                                                                borderRadius='full'
                                                                borderWidth='1px'
                                                                borderColor='gray.300'
                                                                bg='white'
                                                                color='gray.700'
                                                                onClick={() => handleTicketQuantityChange(item.ticket, item.quantity + 1)}
                                                                disabled={getTicketSelectableMax(item.ticket) !== null && item.quantity >= (getTicketSelectableMax(item.ticket) ?? 0)}
                                                                aria-label={`Increase ${item.ticketName}`}
                                                                title={`Increase ${item.ticketName}`}
                                                              >
                                                                <Text as='span' fontSize='md' fontWeight='800' lineHeight='1'>+</Text>
                                                              </Button>
                                                            </HStack>
                                                          </Flex>
                                                        </Table.Cell>
                                                        <Table.Cell borderColor='gray.200' px={4} py={3} textAlign='right'>
                                                          <HStack justify='flex-end' gap={2} align='center'>
                                                            <Text fontWeight='700' color='gray.900'>
                                                              {formatAmount(item.lineTotal, currentEvent.paymentAccountCurrency)}
                                                            </Text>
                                                          </HStack>
                                                        </Table.Cell>
                                                      </Table.Row>
                                                    )
                                                  })}

                                                  {sessionIndex < selectedTicketSummaryBySession.length - 1 ? (
                                                    <Table.Row>
                                                      <Table.Cell borderColor='gray.200' px={4} py={0} colSpan={4}>
                                                        <Separator borderColor='gray.200' />
                                                      </Table.Cell>
                                                    </Table.Row>
                                                  ) : null}
                                                </Fragment>
                                              ))}

                                              <Table.Row bg='gray.50'>
                                                <Table.Cell borderColor='gray.200' px={4} py={3}>
                                                  <Text fontWeight='800' color='gray.900'>Subtotal</Text>
                                                </Table.Cell>
                                                <Table.Cell borderColor='gray.200' px={4} py={3} />
                                                <Table.Cell borderColor='gray.200' px={4} py={3} />
                                                <Table.Cell borderColor='gray.200' px={4} py={3} textAlign='right'>
                                                  <Text fontSize='lg' fontWeight='800' color='gray.900'>
                                                    {formatAmount(paymentBreakdownSubtotal, currentEvent.paymentAccountCurrency)}
                                                  </Text>
                                                </Table.Cell>
                                              </Table.Row>

                                              {selectedPaymentBreakdown.charges.length > 0 ? selectedPaymentBreakdown.charges.map((charge) => (
                                                <Table.Row key={`${selectedPaymentBreakdown.paymentMethod}-${charge.source}-${charge.title}`}>
                                                  <Table.Cell borderColor='gray.200' px={4} py={3}>
                                                    <Stack gap={0.5}>
                                                      <Text fontWeight='700' color='gray.900'>
                                                        {charge.title}
                                                      </Text>
                                                    </Stack>
                                                  </Table.Cell>
                                                  <Table.Cell borderColor='gray.200' px={4} py={3}>
                                                    <Text fontWeight='700' color='gray.800'>
                                                      {formatChargeRate(charge.valueType, charge.value, currentEvent.paymentAccountCurrency)}
                                                    </Text>
                                                  </Table.Cell>
                                                  <Table.Cell borderColor='gray.200' px={4} py={3} textAlign='center'>
                                                    <Text fontWeight='700' color='gray.800'>&nbsp;</Text>
                                                  </Table.Cell>
                                                  <Table.Cell borderColor='gray.200' px={4} py={3} textAlign='right'>
                                                    <Text fontWeight='700' color='gray.900'>
                                                      {formatAmount(charge.amount, currentEvent.paymentAccountCurrency)}
                                                    </Text>
                                                  </Table.Cell>
                                                </Table.Row>
                                              )) : (
                                                <Table.Row>
                                                  <Table.Cell borderColor='gray.200' px={4} py={3} colSpan={4}>
                                                    <Text fontSize='sm' color='gray.600'>No additional buyer charges apply for this method.</Text>
                                                  </Table.Cell>
                                                </Table.Row>
                                              )}

                                              <Table.Row bg='gray.50'>
                                                <Table.Cell borderColor='gray.200' px={4} py={3}>
                                                  <Text fontWeight='800' color='gray.900'>Total payable</Text>
                                                </Table.Cell>
                                                <Table.Cell borderColor='gray.200' px={4} py={3} />
                                                <Table.Cell borderColor='gray.200' px={4} py={3} />
                                                <Table.Cell borderColor='gray.200' px={4} py={3} textAlign='right'>
                                                  <Text fontSize='lg' fontWeight='800' color='gray.900'>
                                                    {formatAmount(selectedPaymentBreakdown.grandTotal, currentEvent.paymentAccountCurrency)}
                                                  </Text>
                                                </Table.Cell>
                                              </Table.Row>
                                            </Table.Body>
                                          </Table.Root>
                                        </Stack>
                                      </Box>
                                    ) : null}
                                  </>
                                ) : visiblePaymentMethods.length > 0 ? (
                                  <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' p={4} bg='gray.50'>
                                    <Text color='gray.600' fontSize='sm'>Payment methods are available, but the price breakdown could not be loaded yet.</Text>
                                  </Box>
                                ) : (
                                  <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' p={4} bg='gray.50'>
                                    <Text color='gray.600' fontSize='sm'>No public payment methods are currently mapped for this event.</Text>
                                  </Box>
                                )}
                              </Stack>
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
                        <Button
                          {...CONTROL_BUTTON_PRIMARY}
                          bg={formAccent}
                          _hover={{ bg: hexToRgba(formAccent, 0.88), transform: 'translateY(-1px)' }}
                          onClick={handlePrimaryAction}
                          disabled={footerActionDisabled}
                        >
                          <HStack gap={2}>
                            <Text as='span'>{footerActionLabel}</Text>
                            <FooterActionIcon size={16} />
                          </HStack>
                        </Button>
                      </Flex>
                    </Stack>
                  </Tabs.Content>
                ))}
              </Tabs.Root>
            </Box>
          </Stack>
        </Container>
      </Flex>

      {purchaseTimerVisible ? (
        <Portal>
          <Box
            position='fixed'
            top={{ base: 3, md: 4 }}
            right={{ base: 3, md: 4 }}
            zIndex={1300}
            pointerEvents='none'
          >
            <Box pointerEvents='auto'>
              <PurchaseTimerChip
                remainingMs={purchaseTimerRemainingMs ?? 0}
                durationMs={purchaseTimerDurationMs}
                expired={purchaseTimerExpired}
                accentColor={formAccent}
              />
            </Box>
          </Box>
        </Portal>
      ) : null}

      {currentEvent.termsConditions ? (
        <Dialog.Root open={termsOpen} onOpenChange={(details) => setTermsOpen(details.open)} size='xl'>
          <Dialog.Backdrop backdropFilter='blur(8px)' bg='blackAlpha.600' />
          <Dialog.Positioner alignItems='center' justifyContent='center' px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }}>
            <Dialog.Content borderRadius='28px' overflow='hidden' bg='white' boxShadow='0 30px 70px rgba(15, 23, 42, 0.25)' maxH='80vh' display='flex' flexDirection='column'>
              <Box px={{ base: 4, md: 6 }} py={4} borderBottomWidth='1px' borderBottomColor='gray.200'><Flex justify='space-between' align='start' gap={4}><Stack gap={1}><Text fontSize='xs' textTransform='uppercase' letterSpacing='0.14em' color='gray.500' fontWeight='700'>Terms & Conditions</Text><Heading fontSize={{ base: 'xl', md: '2xl' }} color='gray.900' letterSpacing='-0.03em'>Registration agreement</Heading></Stack><CloseButton onClick={() => setTermsOpen(false)} /></Flex></Box>
              <Box px={{ base: 4, md: 6 }} py={{ base: 5, md: 6 }} flex='1' overflowY='auto'>{isHtmlContent(currentEvent.termsConditions) ? <RichTextBlock html={currentEvent.termsConditions} /> : <Text color='gray.700' lineHeight='1.75'>{currentEvent.termsConditions}</Text>}</Box>
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

      <Dialog.Root
        open={purchaseTimerExpiryOpen}
        onOpenChange={(details) => {
          if (!details.open) {
            restartPurchaseFlow()
          }
        }}
        size='sm'
      >
        <Dialog.Backdrop backdropFilter='blur(8px)' bg='blackAlpha.650' />
        <Dialog.Positioner alignItems='center' justifyContent='center' px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }}>
          <Dialog.Content borderRadius='28px' overflow='hidden' bg='white' boxShadow='0 30px 80px rgba(15, 23, 42, 0.28)'>
            <Box h='5px' bg={formAccent} />
            <Box px={{ base: 4, md: 5 }} py={{ base: 5, md: 6 }}>
              <Stack gap={5} align='center' textAlign='center'>
                <Box w='72px' h='72px' borderRadius='24px' display='grid' placeItems='center' bg={hexToRgba(formAccent, 0.12)} color={formAccent}>
                  <Clock3 size={30} />
                </Box>
                <Stack gap={2} maxW='2xl'>
                  <Heading fontSize={{ base: '2xl', md: '3xl' }} letterSpacing='-0.04em'>
                    Purchase time expired
                  </Heading>
                  <Text color='gray.600' lineHeight='1.7'>
                    The purchase window has ended. Press OK to reload the registration form and start again.
                  </Text>
                </Stack>
                <Button
                  minH='12'
                  px={6}
                  borderRadius='16px'
                  color='white'
                  bg={formAccent}
                  _hover={{ bg: hexToRgba(formAccent, 0.9) }}
                  _active={{ bg: hexToRgba(formAccent, 0.82) }}
                  onClick={restartPurchaseFlow}
                >
                  OK
                </Button>
              </Stack>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <Dialog.Root open={isPurchaseReviewOpen} onOpenChange={(details) => setIsPurchaseReviewOpen(details.open)} size='xl'>
        <Dialog.Backdrop backdropFilter='blur(8px)' bg='blackAlpha.650' />
        <Dialog.Positioner alignItems='center' justifyContent='center' px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }}>
          <Dialog.Content borderRadius='28px' overflow='hidden' bg='white' boxShadow='0 30px 80px rgba(15, 23, 42, 0.28)' maxH='85vh' display='flex' flexDirection='column'>
            <Box h='5px' bg={formAccent} />
            <Box px={{ base: 4, md: 6 }} py={4} borderBottomWidth='1px' borderBottomColor='gray.200'>
              <Flex justify='space-between' align='start' gap={4}>
                <Stack gap={1}>
                  <Text fontSize='xs' textTransform='uppercase' letterSpacing='0.14em' color='gray.500' fontWeight='700'>
                    Review purchase
                  </Text>
                  <Heading fontSize={{ base: 'xl', md: '2xl' }} color='gray.900' letterSpacing='-0.03em'>
                    {currentEvent.title}
                  </Heading>
                </Stack>
                <CloseButton onClick={() => setIsPurchaseReviewOpen(false)} />
              </Flex>
            </Box>

            <Box px={{ base: 4, md: 6 }} py={{ base: 5, md: 6 }} flex='1' overflowY='auto'>
              <Stack gap={5}>
                <Box borderWidth='1px' borderColor='gray.200' borderRadius='20px' bg='gray.50' p={4}>
                  <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                    <Stack gap={1}>
                      <Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.14em'>
                        Tickets
                      </Text>
                      <Text fontSize='lg' fontWeight='800' color='gray.900'>
                        {selectedTicketCount} selected
                      </Text>
                    </Stack>
                    <Stack gap={1}>
                      <Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.14em'>
                        Total
                      </Text>
                      <Text fontSize='lg' fontWeight='800' color='gray.900'>
                        {formatAmount(selectedTicketTotal, currentEvent.paymentAccountCurrency)}
                      </Text>
                    </Stack>
                    <Stack gap={1}>
                      <Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.14em'>
                        Payment method
                      </Text>
                      <Text fontSize='lg' fontWeight='800' color='gray.900' lineHeight='1.3'>
                        {selectedPaymentMethodLabel}
                      </Text>
                    </Stack>
                  </SimpleGrid>
                  {isSelectedPaymentMethodCard ? (
                    <Text mt={3} fontSize='sm' color='gray.600'>
                      Cardholder: {cardHolderName.trim() || 'Not entered'}
                    </Text>
                  ) : null}
                </Box>

                {purchaseReviewAttempted && purchaseReviewMessage ? (
                  <Box borderWidth='1px' borderColor='red.200' bg='red.50' borderRadius='18px' p={4}>
                    <Text fontSize='sm' color='red.700' fontWeight='600'>
                      {purchaseReviewMessage}
                    </Text>
                  </Box>
                ) : null}

                <Box borderWidth='1px' borderColor='gray.200' borderRadius='20px' bg='white' overflow='hidden'>
                  <Box px={4} py={3} bg='gray.50' borderBottomWidth='1px' borderBottomColor='gray.200'>
                    <Text fontSize='sm' fontWeight='700' color='gray.700'>
                      Ticket summary
                    </Text>
                  </Box>
                  <Table.Root variant='line' size='sm' borderColor='gray.200'>
                    <Table.Header>
                      <Table.Row bg='white'>
                        <Table.ColumnHeader borderColor='gray.200' px={4} py={3}>Session</Table.ColumnHeader>
                        <Table.ColumnHeader borderColor='gray.200' px={4} py={3}>Ticket</Table.ColumnHeader>
                        <Table.ColumnHeader borderColor='gray.200' px={4} py={3} textAlign='center'>Qty</Table.ColumnHeader>
                        <Table.ColumnHeader borderColor='gray.200' px={4} py={3} textAlign='right'>Total</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {purchaseReviewTicketRows.map((row) => (
                        <Table.Row key={`${row.sessionName}-${row.ticketName}`}>
                          <Table.Cell borderColor='gray.200' px={4} py={3}>
                            <Text fontWeight='700' color='gray.900' lineHeight='1.4'>{row.sessionName}</Text>
                          </Table.Cell>
                          <Table.Cell borderColor='gray.200' px={4} py={3}>
                            <Text color='gray.700' lineHeight='1.4'>{row.ticketName}</Text>
                          </Table.Cell>
                          <Table.Cell borderColor='gray.200' px={4} py={3} textAlign='center'>
                            <Text fontWeight='700' color='gray.900'>{row.quantity}</Text>
                          </Table.Cell>
                          <Table.Cell borderColor='gray.200' px={4} py={3} textAlign='right'>
                            <Text fontWeight='700' color='gray.900'>{formatAmount(row.lineTotal, currentEvent.paymentAccountCurrency)}</Text>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>

                <Box borderWidth='1px' borderColor='gray.200' borderRadius='20px' bg='white' overflow='hidden'>
                  <Box px={4} py={3} bg='gray.50' borderBottomWidth='1px' borderBottomColor='gray.200'>
                    <Text fontSize='sm' fontWeight='700' color='gray.700'>
                      Charges
                    </Text>
                  </Box>
                  <Stack gap={3} p={4}>
                    {purchaseReviewChargeRows.length > 0 ? (
                      purchaseReviewChargeRows.map((charge) => (
                        <Flex key={`${charge.source}-${charge.title}`} justify='space-between' gap={4} align='start'>
                          <Stack gap={0.5} minW={0}>
                            <Text fontSize='sm' fontWeight='600' color='gray.900'>{charge.title}</Text>
                            <Text fontSize='xs' color='gray.500'>
                              {charge.source === 'processor-fee' ? 'Price' : 'Rate'}: {formatChargeRate(charge.valueType, charge.value, currentEvent.paymentAccountCurrency)}
                            </Text>
                          </Stack>
                          <Text fontSize='sm' fontWeight='700' color='gray.900' flexShrink={0}>
                            {formatAmount(charge.amount, currentEvent.paymentAccountCurrency)}
                          </Text>
                        </Flex>
                      ))
                    ) : (
                      <Text fontSize='sm' color='gray.600'>No additional buyer charges.</Text>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Box>

            <Box px={{ base: 4, md: 6 }} py={4} borderTopWidth='1px' borderTopColor='gray.200' bg='gray.50'>
              <Flex justify='flex-end' gap={3} direction={{ base: 'column-reverse', sm: 'row' }}>
                <Button {...CONTROL_BUTTON_OUTLINE} onClick={() => setIsPurchaseReviewOpen(false)}>
                  Back to payment
                </Button>
                <Button
                  bg={formAccent}
                  color='white'
                  borderRadius='16px'
                  minH='11'
                  px={5}
                  _hover={{ bg: hexToRgba(formAccent, 0.88) }}
                  _active={{ bg: hexToRgba(formAccent, 0.95) }}
                  onClick={handleConfirmPurchase}
                  disabled={Boolean(purchaseReviewAttempted && purchaseReviewMessage)}
                >
                  Confirm Purchase
                </Button>
              </Flex>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

    </Box>
  )
}








