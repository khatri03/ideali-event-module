import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  Input,
  Link,
  Portal,
  Separator,
  SimpleGrid,
  Table,
  Skeleton,
  SkeletonText,
  Stack,
  Tabs,
  Switch,
  Text,
  Tooltip,
} from '@chakra-ui/react'
import { toaster } from '@/lib/toaster'
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Clock3,
  ExternalLink,
  FileText,
  AlertCircle,
  MapPin,
  MessageSquareText,
  Check,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { chakra } from '@chakra-ui/react'
import {
  fetchEventRegistrationAttendeeInfo,
  fetchEventRegistrationDescription,
  fetchEventRegistrationQuestionnaire,
  fetchEventRegistrationSessions,
} from '@/api/events'
import type { EventRegistrationTicket } from '@/api/events'
import {
  CONTROL_BUTTON_OUTLINE,
  CONTROL_BUTTON_PRIMARY,
} from '@/components/common/controlStyles'
import { useRegistrationCart } from '@/features/events/hooks/useRegistrationCart'
import { useQuestionnaireAnswers } from '@/features/events/hooks/useQuestionnaireAnswers'
import { useCreateEventPaymentIntent, useConfirmEventCheckout } from '@/features/events/hooks/useEventCheckout'
import { useSubmitLineAttendees, useSubmitLineAnswers } from '@/features/events/hooks/useEventCartAttendees'
import { PurchaseTimerChip } from '@/features/events/components/registration/PurchaseTimerChip'
import { QuestionField } from '@/features/events/components/registration/QuestionField'
import { StripeCardFields } from '@/features/events/components/registration/StripeCardFields'
import type { EventPaymentIntentResult, PaymentProduct } from '@/features/events/schemas/eventCart.schemas'
import { extractApiError } from '@/utils/errors'

import { AnimatedPaymentMethodBody } from '@/features/events/components/registration/AnimatedPaymentMethodBody'
import { AutoImageCarousel } from '@/features/events/components/registration/AutoImageCarousel'
import { AttendeeTicketCard } from '@/features/events/components/registration/AttendeeTicketCard'
import { ContactDetailsFields } from '@/features/events/components/registration/ContactDetailsFields'
import { RichTextBlock, SupportCard } from '@/features/events/components/registration/SupportCard'
import { SessionTitleCard, SessionsTabSkeleton } from '@/features/events/components/registration/SessionTitleCard'
import { TicketCard } from '@/features/events/components/registration/TicketCard'
import { EMPTY_BUYER_INFO } from '@/features/events/components/registration/types'
import type {
  AttendeeSessionGroup,
  AttendeeSlotEntry,
  AttendeeSlotState,
  BuyerAttendeeInfoState,
  EventRegisterWizardEvent,
  PendingDeleteAction,
  PurchaseReviewIssue,
  PurchaseReviewValidationTarget,
  SelectedTicketSummaryItem,
  WizardTabId,
} from '@/features/events/components/registration/types'
import {
  formatAmount,
  formatChargeRate,
  formatRegistrationDateTime,
  hexToRgba,
} from '@/features/events/utils/registrationFormat'
import {
  formatPhoneNumberInput,
  getSelectedSessionSummaries,
  getSessionBannerSlides,
  getTicketDisplayPrice,
  getTicketQuantityAfterDecrement,
  getTicketQuantityOptions,
  getTicketSelectableMax,
  isCardPaymentMethod,
  isHtmlContent,
} from '@/features/events/utils/ticketSelection'

export type { EventRegisterWizardEvent }

function getVisibleTabs(event: EventRegisterWizardEvent, selectedTicketQuantities: Record<string, number>) {
  const tabs: Array<{ id: WizardTabId; label: string; icon: typeof FileText }> = []
  const selectedSessionSummaries = getSelectedSessionSummaries(event.sessions, selectedTicketQuantities)
  const hasSelectedAttendeeInfo = selectedSessionSummaries.some((session) => session.requiresAttendeeInfo)
  const hasSelectedQuestions = selectedSessionSummaries.some((session) => session.hasQuestions)
  const visibleTabs = event.visibleTabs ?? []
  const shouldHonorServerTabs = visibleTabs.length > 0
  const isVisible = (tabId: Exclude<WizardTabId, 'buyer-attendee-info'>) =>
    !shouldHonorServerTabs || visibleTabs.includes(tabId)

  if (isVisible('description') && (event.description?.trim() || event.summary?.trim())) {
    tabs.push({ id: 'description', label: 'Description', icon: FileText })
  }

  tabs.push({ id: 'sessions', label: 'Sessions', icon: CalendarDays })

  tabs.push({ id: 'buyer-attendee-info', label: 'Buyer/Attendee info', icon: Users })

  if (hasSelectedAttendeeInfo || isVisible('attendee-info') && event.sessions.some((session) => session.requiresAttendeeInfo)) {
    tabs.push({ id: 'attendee-info', label: 'Attendee Info', icon: Users })
  }

  if (hasSelectedQuestions || isVisible('questionnaire') && event.sessions.some((session) => session.customForms.length > 0 || session.customQuestions.length > 0)) {
    tabs.push({ id: 'questionnaire', label: 'Questionnaire', icon: MessageSquareText })
  }

  tabs.push({ id: 'payment', label: 'Payment', icon: CreditCard })

  return tabs
}

function getStepIndex(tabs: Array<{ id: WizardTabId }>, stepId: WizardTabId) {
  return tabs.findIndex((item) => item.id === stepId)
}

export function EventRegisterWizard({ event, formAccent, onBack }: { event: EventRegisterWizardEvent; formAccent: string; onBack: () => void }) {
  const accentBackground = hexToRgba(formAccent, 0.18)
  const {
    cart,
    price: cartPrice,
    isSyncing: isCartSyncing,
    error: cartError,
    expiresAtUtc,
    lineByTicketTypeId,
    syncTicketSelection,
    resetCart,
  } = useRegistrationCart(event.uniqueId)
  const [buyerInfo, setBuyerInfo] = useState<BuyerAttendeeInfoState>(EMPTY_BUYER_INFO)
  const [buyerDetailsAlertMessage, setBuyerDetailsAlertMessage] = useState<string | null>(null)
  const [buyerDetailsAlertOpen, setBuyerDetailsAlertOpen] = useState(false)
  const [attendeeInfoBySlot, setAttendeeInfoBySlot] = useState<Record<string, AttendeeSlotState>>({})
  const [sessionSameAsBuyerById, setSessionSameAsBuyerById] = useState<Record<string, boolean>>({})
  const [ticketSameAsBuyerById, setTicketSameAsBuyerById] = useState<Record<string, boolean>>({})
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [expandedSessionIds, setExpandedSessionIds] = useState<string[]>([])
  const [activeSessionDescription, setActiveSessionDescription] = useState<{ title: string; description: string } | null>(null)
  const [sessionTicketSearch, setSessionTicketSearch] = useState<Record<string, string>>({})
  const [selectedTicketQuantities, setSelectedTicketQuantities] = useState<Record<string, number>>({})
  const tabs = useMemo(() => getVisibleTabs(event, selectedTicketQuantities), [event, selectedTicketQuantities])
  const firstTab = tabs[0]?.id ?? 'sessions'
  const [activeTab, setActiveTab] = useState<WizardTabId>(firstTab)
  const [highestUnlockedIndex, setHighestUnlockedIndex] = useState(0)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [isPurchaseReviewOpen, setIsPurchaseReviewOpen] = useState(false)
  const [purchaseReviewAttempted, setPurchaseReviewAttempted] = useState(false)
  const [purchaseReviewMessage, setPurchaseReviewMessage] = useState<string | null>(null)
  const [purchaseReviewScrollTarget, setPurchaseReviewScrollTarget] = useState<PurchaseReviewValidationTarget | null>(null)
  const [purchaseReviewScrollRequestId, setPurchaseReviewScrollRequestId] = useState(0)
  const [expandedPaymentMethod, setExpandedPaymentMethod] = useState<string | null>(null)
  const [purchaseTimerExpired, setPurchaseTimerExpired] = useState(false)
  const [purchaseTimerExpiryOpen, setPurchaseTimerExpiryOpen] = useState(false)
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)
  const [pendingDeleteAction, setPendingDeleteAction] = useState<PendingDeleteAction | null>(null)
  const [paymentIntent, setPaymentIntent] = useState<EventPaymentIntentResult | null>(null)
  const buyerAttendeeValidationRef = useRef<HTMLDivElement | null>(null)
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
  const [prevTabs, setPrevTabs] = useState(tabs)
  if (tabs !== prevTabs) {
    setPrevTabs(tabs)
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(firstTab)
    }
  }

  function restartPurchaseFlow() {
    window.location.reload()
  }

  const activeIndex = getStepIndex(tabs, activeTab)
  const isFinalStep = activeIndex >= 0 && activeIndex === tabs.length - 1
  const descriptionData = descriptionQuery.data ?? event
  const sessionsData = useMemo(
    () =>
      sessionsQuery.data?.sessions ??
      attendeeInfoQuery.data?.sessions ??
      questionnaireQuery.data?.sessions ??
      event.sessions ??
      [],
    [sessionsQuery.data, attendeeInfoQuery.data, questionnaireQuery.data, event.sessions],
  )
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
  // Server-priced net subtotal. Falls back to the catalog-derived figure only until the first
  // pricing round-trip lands, so the buyer never sees an empty total mid-flight.
  const selectedTicketTotal =
    cartPrice?.netSubtotal ?? selectedTicketSummary.reduce((total, item) => total + item.lineTotal, 0)
  const selectedSessionSummaries = useMemo(
    () => getSelectedSessionSummaries(sessionsData, selectedTicketQuantities),
    [sessionsData, selectedTicketQuantities],
  )
  const attendeeSessionGroups = useMemo<AttendeeSessionGroup[]>(
    () =>
      selectedSessionSummaries.map((sessionSummary) => ({
        key: sessionSummary.session.uniqueId,
        sessionId: sessionSummary.session.uniqueId,
        sessionName: sessionSummary.session.name,
        attendeeCount: sessionSummary.attendeeCount,
        requiresAttendeeInfo: sessionSummary.requiresAttendeeInfo,
        hasQuestions: sessionSummary.hasQuestions,
        tickets: sessionSummary.selectedTickets.map((selectedTicket) => {
          const slots = Array.from({ length: selectedTicket.quantity }, (_, index) => ({
            key: `${sessionSummary.session.uniqueId}:${selectedTicket.ticket.uniqueId}:${index + 1}`,
            attendeeLabel: `Attendee ${index + 1}`,
          }))

          return {
            key: `${sessionSummary.session.uniqueId}:${selectedTicket.ticket.uniqueId}`,
            sessionId: sessionSummary.session.uniqueId,
            sessionName: sessionSummary.session.name,
            ticketId: selectedTicket.ticket.uniqueId,
            ticketName: selectedTicket.ticket.name,
            attendeeCount: selectedTicket.quantity,
            requiresAttendeeInfo: sessionSummary.requiresAttendeeInfo,
            hasQuestions: sessionSummary.hasQuestions,
            slots,
          }
        }),
      })),
    [selectedSessionSummaries],
  )
  const attendeeSlotEntries = useMemo<AttendeeSlotEntry[]>(
    () =>
      attendeeSessionGroups.flatMap((sessionGroup) =>
        sessionGroup.tickets.flatMap((ticketGroup) =>
          ticketGroup.slots.map((slot) => ({
            key: slot.key,
            sessionId: sessionGroup.sessionId,
            sessionName: sessionGroup.sessionName,
            ticketId: ticketGroup.ticketId,
            ticketName: ticketGroup.ticketName,
            attendeeLabel: slot.attendeeLabel,
            requiresAttendeeInfo: sessionGroup.requiresAttendeeInfo,
            hasQuestions: sessionGroup.hasQuestions,
          })),
        ),
      ),
    [attendeeSessionGroups],
  )
  const attendeeSlotEntryByKey = useMemo(
    () =>
      attendeeSlotEntries.reduce<Record<string, AttendeeSlotEntry>>((entries, slot) => {
        entries[slot.key] = slot
        return entries
      }, {}),
    [attendeeSlotEntries],
  )
  const paymentMethodsData = useMemo(() => event.paymentMethods ?? [], [event.paymentMethods])
  const visiblePaymentMethods = useMemo(
    () => paymentMethodsData.filter((method) => !method.isOrganizerOnly || event.isOrganizer),
    [paymentMethodsData, event.isOrganizer],
  )
  // Totals, charges and the payable amount per method are all priced by the server.
  const paymentBreakdowns = useMemo(
    () => (cartPrice?.paymentBreakdowns ?? []).filter((breakdown) => !breakdown.isOrganizerOnly || event.isOrganizer),
    [cartPrice, event.isOrganizer],
  )
  const selectedPaymentBreakdown =
    paymentBreakdowns.find((breakdown) => breakdown.paymentMethod === selectedPaymentMethod) ??
    paymentBreakdowns[0] ??
    null
  const isSelectedPaymentMethodCard = Boolean(selectedPaymentBreakdown && isCardPaymentMethod(selectedPaymentBreakdown.paymentMethod))
  const paymentBreakdownSubtotal = selectedPaymentBreakdown?.subtotal ?? cartPrice?.netSubtotal ?? 0
  const eventData = useMemo(
    () => ({
      ...event,
      description: descriptionData.description ?? event.description,
      summary: descriptionData.summary ?? event.summary,
      termsConditions: descriptionData.termsConditions ?? event.termsConditions,
      sessions: sessionsData,
      paymentMethods: paymentMethodsData,
    }),
    [event, descriptionData.description, descriptionData.summary, descriptionData.termsConditions, sessionsData, paymentMethodsData],
  )
  const currentEvent = eventData
  const sessions = currentEvent.sessions
  const {
    getAnswer,
    setAnswer,
    getErrorMessage: getQuestionErrorMessage,
    buildQuestionResponses,
    missingRequiredCount,
    setShowValidation: setShowQuestionValidation,
    resetAnswers,
  } = useQuestionnaireAnswers(sessions)
  const submitAttendeesMutation = useSubmitLineAttendees(cart?.cartUniqueId)
  const submitAnswersMutation = useSubmitLineAnswers(cart?.cartUniqueId)
  const createPaymentIntentMutation = useCreateEventPaymentIntent(cart?.cartUniqueId)
  const confirmCheckoutMutation = useConfirmEventCheckout(cart?.cartUniqueId)
  const bannerSlides = useMemo(() => getSessionBannerSlides(currentEvent), [currentEvent])
  const sessionsLoading = sessionsQuery.isLoading || (sessionsQuery.isFetching && sessions.length === 0)
  const [prevSessions, setPrevSessions] = useState(sessions)
  if (sessions !== prevSessions) {
    setPrevSessions(sessions)
    setExpandedSessionIds(sessions.map((session) => session.uniqueId))
  }

  const [prevAttendeeSlotEntries, setPrevAttendeeSlotEntries] = useState(attendeeSlotEntries)
  if (attendeeSlotEntries !== prevAttendeeSlotEntries) {
    setPrevAttendeeSlotEntries(attendeeSlotEntries)
    setAttendeeInfoBySlot((current) => {
      const next: Record<string, AttendeeSlotState> = {}
      let hasChanges = false

      attendeeSlotEntries.forEach((slot) => {
        const existing = current[slot.key]

        if (existing) {
          next[slot.key] = existing
          return
        }

        next[slot.key] = EMPTY_BUYER_INFO
        hasChanges = true
      })

      if (Object.keys(current).length !== Object.keys(next).length) {
        hasChanges = true
      }

      return hasChanges ? next : current
    })
  }

  const [prevAttendeeSessionGroups, setPrevAttendeeSessionGroups] = useState(attendeeSessionGroups)
  if (attendeeSessionGroups !== prevAttendeeSessionGroups) {
    setPrevAttendeeSessionGroups(attendeeSessionGroups)

    const allowedSessionIds = new Set(attendeeSessionGroups.map((sessionGroup) => sessionGroup.sessionId))
    const allowedTicketIds = new Set(attendeeSessionGroups.flatMap((sessionGroup) => sessionGroup.tickets.map((ticket) => ticket.ticketId)))

    setSessionSameAsBuyerById((current) => {
      const next: Record<string, boolean> = {}
      let hasChanges = false

      Object.entries(current).forEach(([sessionId, isSameAsBuyer]) => {
        if (!allowedSessionIds.has(sessionId)) {
          hasChanges = true
          return
        }

        next[sessionId] = isSameAsBuyer
      })

      if (Object.keys(current).length !== Object.keys(next).length) {
        hasChanges = true
      }

      return hasChanges ? next : current
    })

    setTicketSameAsBuyerById((current) => {
      const next: Record<string, boolean> = {}
      let hasChanges = false

      Object.entries(current).forEach(([ticketId, isSameAsBuyer]) => {
        if (!allowedTicketIds.has(ticketId)) {
          hasChanges = true
          return
        }

        next[ticketId] = isSameAsBuyer
      })

      if (Object.keys(current).length !== Object.keys(next).length) {
        hasChanges = true
      }

      return hasChanges ? next : current
    })
  }
  // The hold deadline is the server's; the chip only counts down to it.
  const purchaseTimerVisible = Boolean(expiresAtUtc)

  const handlePurchaseTimerExpire = useCallback(() => {
    setPurchaseTimerExpired(true)
    setPurchaseTimerExpiryOpen(true)
  }, [])

  const [prevPaymentMethodDeps, setPrevPaymentMethodDeps] = useState({ activeTab, paymentBreakdowns, visiblePaymentMethods })
  const paymentMethodDepsChanged =
    prevPaymentMethodDeps.activeTab !== activeTab ||
    prevPaymentMethodDeps.paymentBreakdowns !== paymentBreakdowns ||
    prevPaymentMethodDeps.visiblePaymentMethods !== visiblePaymentMethods
  if (paymentMethodDepsChanged) {
    setPrevPaymentMethodDeps({ activeTab, paymentBreakdowns, visiblePaymentMethods })

    if (activeTab === 'payment') {
      const availableMethods = paymentBreakdowns.length > 0
        ? paymentBreakdowns.map((breakdown) => breakdown.paymentMethod)
        : visiblePaymentMethods.map((method) => method.paymentMethod)

      if (availableMethods.length === 0) {
        setSelectedPaymentMethod(null)
      } else {
        setSelectedPaymentMethod((current) => (current && availableMethods.includes(current) ? current : availableMethods[0]))
      }
    }
  }
  const [prevTabsLength, setPrevTabsLength] = useState(tabs.length)
  if (tabs.length !== prevTabsLength) {
    setPrevTabsLength(tabs.length)
    setHighestUnlockedIndex((current) => Math.min(current, Math.max(tabs.length - 1, 0)))
  }
  const shouldHighlightSummaryLauncher = selectedTicketCount > 0 || purchaseTimerVisible
  const isDescriptionStep = activeTab === 'description'
  const sessionsStepIndex = getStepIndex(tabs, 'sessions')
  const effectiveHighestUnlockedIndex =
    selectedTicketCount > 0 ? highestUnlockedIndex : Math.min(highestUnlockedIndex, sessionsStepIndex)
  const canContinueForward = !purchaseTimerExpired && (isDescriptionStep || selectedTicketCount > 0)
  const footerActionLabel = isFinalStep ? 'Review Purchase' : 'Continue'
  const FooterActionIcon = isFinalStep ? Check : ChevronRight
  const footerActionDisabled = !canContinueForward || (isFinalStep && selectedTicketCount <= 0)
  const requiresAttendeeInfo = selectedSessionSummaries.some((session) => session.requiresAttendeeInfo)
  const requiresQuestions = selectedSessionSummaries.some((session) => session.hasQuestions)

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

    if (activeTab === 'buyer-attendee-info') {
      const issues = getBuyerAttendeeInfoIssues()

      if (issues.length > 0) {
        applyPurchaseReviewIssues(issues)
        return
      }

      clearBuyerAttendeeValidation()
    }

    const nextIndex = activeIndex + 1
    const nextTabId = tabs[nextIndex].id
    setHighestUnlockedIndex((current) => Math.max(current, nextIndex))
    setActiveTab(nextTabId)

    if (nextTabId === 'buyer-attendee-info') {
      const issues = getBuyerAttendeeInfoIssues()

      if (issues.length > 0) {
        applyPurchaseReviewIssues(issues)
      } else {
        clearBuyerAttendeeValidation()
      }
    }
  }

  function getPurchaseReviewIssues() {
    const issues: PurchaseReviewIssue[] = []

    if (selectedTicketCount <= 0) {
      issues.push({ message: 'Select at least one ticket.', target: 'payment-method' })
    }

    const buyerFields: Array<[keyof BuyerAttendeeInfoState, string]> = [
      ['lastName', buyerInfo.lastName],
      ['email', buyerInfo.email],
    ]

    if (buyerFields.some(([, value]) => !value.trim())) {
      issues.push({ message: 'Complete the buyer details before continuing.', target: 'buyer-attendee-info' })
    }

    const attendeeIssues = attendeeSlotEntries.find((slot) => {
      if (!slot.requiresAttendeeInfo) {
        return false
      }

      if (isTicketSameAsBuyer(slot.sessionId, slot.ticketId)) {
        return false
      }

      const info = attendeeInfoBySlot[slot.key]
      if (!info) {
        return true
      }

      return ['firstName', 'lastName', 'email'].some((field) => !(info[field as keyof BuyerAttendeeInfoState] ?? '').trim())
    })

    if (attendeeIssues) {
      issues.push({
        message: `${attendeeIssues.sessionName} needs attendee details for ${attendeeIssues.ticketName}.`,
        target: 'buyer-attendee-info',
      })
    }

    if (missingRequiredCount > 0) {
      setShowQuestionValidation(true)
      issues.push({
        message:
          missingRequiredCount === 1
            ? 'Answer the required question before continuing.'
            : `Answer the ${missingRequiredCount} required questions before continuing.`,
        target: 'buyer-attendee-info',
      })
    }

    // Card field completeness is Stripe's to enforce at confirm time; pre-checking it here only
    // duplicated the check and drifted from what Stripe actually accepts.
    if (!selectedPaymentBreakdown) {
      issues.push({ message: 'Select a payment method.', target: 'payment-method' })
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
      purchaseReviewScrollTarget === 'buyer-attendee-info'
        ? buyerAttendeeValidationRef
        : purchaseReviewScrollTarget === 'payment-method'
          ? paymentMethodValidationRef
          : purchaseReviewScrollTarget === 'payment-card'
            ? paymentCardValidationRef
            : termsValidationRef

    const frame = window.requestAnimationFrame(() => {
      targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isPurchaseReviewOpen, purchaseReviewAttempted, purchaseReviewMessage, purchaseReviewScrollTarget, purchaseReviewScrollRequestId])

  function applyPurchaseReviewIssues(issues: PurchaseReviewIssue[]) {
    const firstIssue = issues[0] ?? null

    setPurchaseReviewAttempted(true)
    setPurchaseReviewMessage(firstIssue?.message ?? null)
    setPurchaseReviewScrollTarget(firstIssue?.target ?? null)
    setPurchaseReviewScrollRequestId((current) => current + 1)
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
    setPurchaseReviewScrollRequestId((current) => current + 1)
    setIsPurchaseReviewOpen(true)
  }

  function handlePrimaryAction() {
    if (isFinalStep) {
      handlePurchaseReview()
      return
    }

    handleContinue()
  }

  /**
   * Persists attendees and questionnaire answers against their cart lines, then asks the server for
   * a PaymentIntent. The card fields mount against the returned client secret; nothing is charged
   * until the buyer submits them.
   */
  async function handleConfirmPurchase() {
    const issues = getPurchaseReviewIssues()

    if (issues.length > 0) {
      applyPurchaseReviewIssues(issues)
      return
    }

    if (!cart || !selectedPaymentBreakdown) {
      return
    }

    try {
      await Promise.all(
        cart.lines.map(async (line) => {
          const slots = attendeeSlotEntries.filter((slot) => lineByTicketTypeId[slot.ticketId] === line.lineUniqueId)

          if (slots.length > 0) {
            await submitAttendeesMutation.mutateAsync({
              lineUniqueId: line.lineUniqueId,
              request: {
                attendees: slots.map((slot) => {
                  const info = isTicketSameAsBuyer(slot.sessionId, slot.ticketId)
                    ? buyerInfo
                    : (attendeeInfoBySlot[slot.key] ?? EMPTY_BUYER_INFO)

                  return {
                    name: `${info.firstName} ${info.lastName}`.trim(),
                    email: info.email || null,
                    phone: info.phone || null,
                  }
                }),
              },
            })
          }

          const questionResponses = buildQuestionResponses(line.sessionUniqueId)

          if (questionResponses.length > 0) {
            await submitAnswersMutation.mutateAsync({
              lineUniqueId: line.lineUniqueId,
              request: { formResponses: [], questionResponses },
            })
          }
        }),
      )

      const intent = await createPaymentIntentMutation.mutateAsync({
        paymentMethod: selectedPaymentBreakdown.paymentMethod as PaymentProduct,
        buyerName: `${buyerInfo.firstName} ${buyerInfo.lastName}`.trim() || null,
        buyerEmail: buyerInfo.email || null,
      })

      setPaymentIntent(intent)
      setIsPurchaseReviewOpen(false)
    } catch (error) {
      applyPurchaseReviewIssues([{ message: extractApiError(error), target: 'payment-method' }])
    }
  }

  /**
   * Runs after Stripe reports a successful confirm. The webhook is authoritative for settlement and
   * ticket issuance, so a non-settled result here is expected on the bank rails, not a failure.
   */
  async function handlePaymentSucceeded() {
    try {
      const confirmation = await confirmCheckoutMutation.mutateAsync()

      toaster.create({
        type: 'success',
        title: confirmation.isSettled ? 'Payment complete' : 'Payment received',
        description: confirmation.isSettled
          ? 'Your tickets have been issued.'
          : 'Your payment is processing. Your tickets will be issued once it settles.',
      })
    } catch (error) {
      toaster.create({ type: 'error', title: extractApiError(error) })
    }
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
  const isSessionSameAsBuyer = (sessionId: string) => Boolean(sessionSameAsBuyerById[sessionId])
  const isTicketSameAsBuyer = (sessionId: string, ticketId: string) =>
    isSessionSameAsBuyer(sessionId) || Boolean(ticketSameAsBuyerById[ticketId])
  const missingBuyerDetails = useMemo(
    () => [
      !buyerInfo.lastName.trim() ? 'Last name' : null,
      !buyerInfo.email.trim() ? 'Email' : null,
    ].filter((field): field is string => Boolean(field)),
    [buyerInfo.email, buyerInfo.lastName],
  )

  function getBuyerAttendeeInfoIssues() {
    const issues: PurchaseReviewIssue[] = []

    const buyerFields: Array<[keyof BuyerAttendeeInfoState, string]> = [
      ['lastName', buyerInfo.lastName],
      ['email', buyerInfo.email],
    ]

    if (buyerFields.some(([, value]) => !value.trim())) {
      issues.push({ message: 'Complete the buyer details before continuing.', target: 'buyer-attendee-info' })
    }

    const attendeeIssues = attendeeSlotEntries.find((slot) => {
      if (!slot.requiresAttendeeInfo) {
        return false
      }

      if (isTicketSameAsBuyer(slot.sessionId, slot.ticketId)) {
        return false
      }

      const info = attendeeInfoBySlot[slot.key]
      if (!info) {
        return true
      }

      return ['firstName', 'lastName', 'email'].some((field) => !(info[field as keyof BuyerAttendeeInfoState] ?? '').trim())
    })

    if (attendeeIssues) {
      issues.push({
        message: `${attendeeIssues.sessionName} needs attendee details for ${attendeeIssues.ticketName}.`,
        target: 'buyer-attendee-info',
      })
    }

    return issues
  }

  function updateBuyerField(field: keyof BuyerAttendeeInfoState, value: string) {
    const nextValue = field === 'phone' ? formatPhoneNumberInput(value) : value

    setBuyerInfo((current) => ({
      ...current,
      [field]: nextValue,
    }))
  }

  function updateAttendeeField(slotKey: string, field: keyof BuyerAttendeeInfoState, value: string) {
    const slot = attendeeSlotEntryByKey[slotKey]
    if (!slot || isTicketSameAsBuyer(slot.sessionId, slot.ticketId)) return

    setAttendeeInfoBySlot((current) => {
      const slotState = current[slotKey]
      if (!slotState) return current

      return {
        ...current,
        [slotKey]: {
          ...slotState,
          [field]: value,
        },
      }
    })
  }

  function handleBuyerDetailsMissing() {
    const message =
      missingBuyerDetails.length === 1
        ? `${missingBuyerDetails[0]} is required in Your Information before enabling Same As Buyer.`
        : `${missingBuyerDetails.join(' and ')} are required in Your Information before enabling Same As Buyer.`

    setBuyerDetailsAlertMessage(message)
    setBuyerDetailsAlertOpen(true)
  }

  function closeBuyerDetailsAlert() {
    setBuyerDetailsAlertOpen(false)
    setBuyerDetailsAlertMessage(null)
  }

  function toggleSessionSameAsBuyer(sessionId: string, checked: boolean) {
    if (checked && missingBuyerDetails.length > 0) {
      handleBuyerDetailsMissing()
      return
    }

    setSessionSameAsBuyerById((current) => ({
      ...current,
      [sessionId]: checked,
    }))

    if (!checked) {
      closeBuyerDetailsAlert()
    }
  }

  function toggleTicketSameAsBuyer(sessionId: string, ticketId: string, checked: boolean) {
    if (checked && missingBuyerDetails.length > 0) {
      handleBuyerDetailsMissing()
      return
    }

    if (isSessionSameAsBuyer(sessionId)) return

    setTicketSameAsBuyerById((current) => ({
      ...current,
      [ticketId]: checked,
    }))

    if (!checked) {
      closeBuyerDetailsAlert()
    }
  }

  function clearBuyerAttendeeValidation() {
    if (purchaseReviewScrollTarget !== 'buyer-attendee-info') {
      return
    }

    setPurchaseReviewAttempted(false)
    setPurchaseReviewMessage(null)
    setPurchaseReviewScrollTarget(null)
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
    const quantity = Math.max(nextQuantity, 0)
    const sessionUniqueId = sessionsData.find((session) =>
      session.ticketTypes.some((item) => item.uniqueId === ticket.uniqueId),
    )?.uniqueId

    if (!sessionUniqueId) return

    setSelectedTicketQuantities((current) => {
      if (quantity <= 0) {
        const next = { ...current }
        delete next[ticket.uniqueId]
        return next
      }

      return {
        ...current,
        [ticket.uniqueId]: quantity,
      }
    })

    // The server owns min/max/availability enforcement and the hold deadline; it rejects anything
    // it will not sell, and the rejection message is surfaced from the cart hook.
    void syncTicketSelection({
      sessionUniqueId,
      ticketTypeUniqueId: ticket.uniqueId,
      quantity,
    })
  }

  function handleRemoveTicket(ticket: EventRegistrationTicket) {
    handleTicketQuantityChange(ticket, 0)
  }

  function handleRemoveSession(items: SelectedTicketSummaryItem[]) {
    items.forEach((item) => {
      handleTicketQuantityChange(item.ticket, 0)
    })
  }

  function handleRemoveAllTickets() {
    const resetIndex = sessionsStepIndex >= 0 ? sessionsStepIndex : 0
    setSelectedTicketQuantities({})
    setSessionSameAsBuyerById({})
    setTicketSameAsBuyerById({})
    setSelectedPaymentMethod(null)
    setExpandedPaymentMethod(null)
    setBuyerInfo(EMPTY_BUYER_INFO)
    setAttendeeInfoBySlot({})
    setTermsAccepted(false)
    setTermsOpen(false)
    setPurchaseReviewAttempted(false)
    setPurchaseReviewMessage(null)
    setPurchaseReviewScrollTarget(null)
    setPurchaseTimerExpired(false)
    setPaymentIntent(null)
    resetAnswers()
    resetCart()
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

  const [prevSelectedTicketCount, setPrevSelectedTicketCount] = useState(selectedTicketCount)
  if (selectedTicketCount !== prevSelectedTicketCount) {
    setPrevSelectedTicketCount(selectedTicketCount)
    if (selectedTicketCount <= 0 && activeIndex > sessionsStepIndex && sessionsStepIndex >= 0) {
      setHighestUnlockedIndex((current) => Math.min(current, sessionsStepIndex))
      setActiveTab(tabs[sessionsStepIndex].id)
    }
  }

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
                          <HStack gap={3} align='start' px={4} py={3} borderBottomWidth='1px' borderBottomColor='gray.200'><Box color='gray.500' mt={0.5}><CalendarDays size={18} /></Box><Box><Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.12em'>Starts At</Text><Text mt={1} fontSize='sm' fontWeight='700' color='gray.900'>{formatRegistrationDateTime(event.startDate)}</Text></Box></HStack>
                          <HStack gap={3} align='start' px={4} py={3} borderBottomWidth='1px' borderBottomColor='gray.200'><Box color='gray.500' mt={0.5}><ChevronRight size={18} /></Box><Box><Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.12em'>Ends At</Text><Text mt={1} fontSize='sm' fontWeight='700' color='gray.900'>{formatRegistrationDateTime(event.endDate)}</Text></Box></HStack>
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

                          {cartError ? (
                            <Box borderWidth='1px' borderColor='red.200' bg='red.50' borderRadius='18px' p={4} mb={4}>
                              <Text fontSize='sm' color='red.700' fontWeight='600'>
                                {cartError}
                              </Text>
                            </Box>
                          ) : null}

                          {tab.id === 'sessions' ? (
                            <Stack gap={4}>
                              {sessionsLoading ? (
                                <SessionsTabSkeleton />
                              ) : sessions.length > 0 ? (
                                <>
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
                                          {session.requiresAttendeeInfo ? (
                                            <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} alignItems='center'>
                                              <HStack gap={2} minW={0} align='center'>
                                                <Tooltip.Root openDelay={250} closeDelay={100}>
                                                  <Tooltip.Trigger asChild>
                                                    <Badge
                                                      colorPalette='blue'
                                                      variant='subtle'
                                                      borderRadius='full'
                                                      px={3}
                                                      py={1}
                                                      fontSize='xs'
                                                      fontWeight='800'
                                                      letterSpacing='0.08em'
                                                      textTransform='uppercase'
                                                      cursor='help'
                                                    >
                                                      <HStack gap={1.5}>
                                                        <AlertCircle size={14} />
                                                        <Text as='span'>Requires Attendee Info</Text>
                                                      </HStack>
                                                    </Badge>
                                                  </Tooltip.Trigger>
                                                  <Tooltip.Positioner>
                                                    <Tooltip.Content>
                                                      Buying this session would require attendee info.
                                                    </Tooltip.Content>
                                                  </Tooltip.Positioner>
                                                </Tooltip.Root>
                                              </HStack>
                                              <Box position='relative' w='full' maxW={{ base: 'full', md: '280px' }} justifySelf={{ base: 'stretch', md: 'end' }}>
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
                                            </SimpleGrid>
                                          ) : (
                                            <Box position='relative' w='full' maxW={{ base: 'full', md: '280px' }} ml={{ md: 'auto' }}>
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
                                          )}
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
                                </>
                              ) : null}
                            </Stack>
                          ) : null}

                          {tab.id === 'buyer-attendee-info' ? (
                            <Box ref={buyerAttendeeValidationRef}>
                              <Stack gap={5}>
                                {purchaseReviewAttempted && purchaseReviewMessage && purchaseReviewScrollTarget === 'buyer-attendee-info' ? (
                                  <Box borderWidth='1px' borderColor='red.200' bg='red.50' borderRadius='18px' p={4}>
                                    <Text fontSize='sm' color='red.700' fontWeight='600'>
                                      {purchaseReviewMessage}
                                    </Text>
                                  </Box>
                                ) : null}

                                  <SupportCard
                                  title='Your Information'
                                  subtitle='Enter the buyer contact details for order confirmation and follow-up.'
                                  icon={<Users size={18} />}
                                  bg='gray.100'
                                  hasDivider
                                >
                                  <Stack gap={4}>
                                    <Text fontSize='sm' color='gray.600' lineHeight='1.6'>
                                      The buyer is the person placing the order and receiving the purchase confirmation.
                                    </Text>
                                    <ContactDetailsFields values={buyerInfo} onChange={updateBuyerField} />
                                  </Stack>
                                </SupportCard>

                                <SupportCard
                                  title='Session Attendees'
                                  subtitle='Each session is grouped once. Session toggles cover every attendee in the session, while ticket toggles only affect that ticket.'
                                  icon={<Users size={18} />}
                                >
                                  {attendeeSessionGroups.length > 0 ? (
                                    <Stack gap={4}>
                                      <Box borderWidth='1px' borderColor='blue.200' borderRadius='18px' bg='blue.50' p={4}>
                                        <Flex justify='space-between' gap={4} align='start' flexWrap='wrap'>
                                          <Stack gap={1} minW={0}>
                                            <Text fontSize='sm' fontWeight='800' color='gray.900'>
                                              Attendee details by session
                                            </Text>
                                            <Text fontSize='sm' color='gray.600' lineHeight='1.6'>
                                              Turn on Same As Buyer at the session level to copy buyer data for every attendee in that session. Use ticket-level toggles when only one ticket should follow the buyer.
                                            </Text>
                                          </Stack>
                                          <HStack gap={2} flexWrap='wrap' justify='flex-end'>
                                            {requiresAttendeeInfo ? (
                                              <Badge colorPalette='blue' variant='subtle' borderRadius='full' px={3} py={1}>
                                                Attendee info required
                                              </Badge>
                                            ) : null}
                                            {requiresQuestions ? (
                                              <Badge colorPalette='orange' variant='subtle' borderRadius='full' px={3} py={1}>
                                                Questions required
                                              </Badge>
                                            ) : null}
                                          </HStack>
                                        </Flex>
                                      </Box>

                                      <Stack gap={4}>
                                        {attendeeSessionGroups.map((sessionGroup) => {
                                          const sessionSameAsBuyer = isSessionSameAsBuyer(sessionGroup.sessionId)

                                          return (
                                            <Box
                                              key={sessionGroup.key}
                                              borderWidth='1px'
                                              borderColor='gray.200'
                                              borderRadius='20px'
                                              bg='white'
                                              p={4}
                                              boxShadow='0 10px 24px rgba(15, 23, 42, 0.04)'
                                            >
                                              <Stack gap={4}>
                                                <Flex
                                                  justify='space-between'
                                                  gap={4}
                                                  align={{ base: 'start', md: 'center' }}
                                                  direction={{ base: 'column', md: 'row' }}
                                                >
                                                  <Stack gap={1} minW={0}>
                                                    <Text fontSize='sm' fontWeight='800' color='gray.900' lineHeight='1.4'>
                                                      {sessionGroup.sessionName}
                                                    </Text>
                                                    <Text fontSize='sm' color='gray.600' lineHeight='1.4'>
                                                      {sessionGroup.attendeeCount} {sessionGroup.attendeeCount === 1 ? 'attendee' : 'attendees'} selected in this session.
                                                    </Text>
                                                  </Stack>

                                                  <HStack
                                                    gap={3}
                                                    align='center'
                                                    cursor='help'
                                                    title='Copy the buyer contact details into every attendee for this session.'
                                                  >
                                                    <Text fontSize='sm' fontWeight='700' color='gray.700'>
                                                      Same As Buyer
                                                    </Text>
                                                    <Switch.Root
                                                      checked={sessionSameAsBuyer}
                                                      onCheckedChange={(details) => toggleSessionSameAsBuyer(sessionGroup.sessionId, details.checked === true)}
                                                      colorPalette='brand'
                                                    >
                                                      <Switch.HiddenInput />
                                                      <Switch.Control />
                                                    </Switch.Root>
                                                  </HStack>
                                                </Flex>

                                                <Stack gap={4}>
                                                  {sessionGroup.tickets.map((ticketGroup) => (
                                                    <AttendeeTicketCard
                                                      key={ticketGroup.key}
                                                      group={ticketGroup}
                                                      buyerInfo={buyerInfo}
                                                      attendeeInfoBySlot={attendeeInfoBySlot}
                                                      sessionSameAsBuyer={sessionSameAsBuyer}
                                                      ticketSameAsBuyer={Boolean(ticketSameAsBuyerById[ticketGroup.ticketId])}
                                                      onToggleSameAsBuyer={toggleTicketSameAsBuyer}
                                                      onChangeField={updateAttendeeField}
                                                    />
                                                  ))}
                                                </Stack>
                                              </Stack>
                                            </Box>
                                          )
                                        })}
                                      </Stack>
                                    </Stack>
                                  ) : (
                                    <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='gray.50' p={4}>
                                      <Text fontSize='sm' color='gray.600' lineHeight='1.7'>
                                        No attendee details are required for the tickets you have selected yet.
                                      </Text>
                                    </Box>
                                  )}
                                </SupportCard>
                              </Stack>
                            </Box>
                          ) : null}

                          {tab.id === 'attendee-info' ? (
                            <SupportCard title='Attendee Info' subtitle='These selected sessions require attendee details before registration can continue.' icon={<Users size={18} />}>
                              <Stack gap={4}>
                                {selectedSessionSummaries.filter((session) => session.requiresAttendeeInfo).length > 0 ? (
                                  selectedSessionSummaries
                                    .filter((session) => session.requiresAttendeeInfo)
                                    .map((session) => (
                                      <Box key={session.session.uniqueId} borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='gray.50' p={4}>
                                        <HStack justify='space-between' gap={4} align='start' flexWrap='wrap'>
                                          <Stack gap={1}>
                                            <Text fontWeight='700' color='gray.900'>{session.session.name}</Text>
                                            <Text fontSize='sm' color='gray.600'>
                                              {session.attendeeCount} attendee {session.attendeeCount === 1 ? 'slot' : 'slots'} selected for this session.
                                            </Text>
                                          </Stack>
                                        </HStack>
                                        <Stack gap={2} mt={4}>
                                          {session.selectedTickets.map((ticket) => (
                                            <Flex key={ticket.ticket.uniqueId} justify='space-between' gap={4} align='center' bg='white' borderWidth='1px' borderColor='gray.200' borderRadius='14px' px={4} py={3}>
                                              <Stack gap={0.5} minW={0}>
                                                <HStack gap={2} align='baseline' flexWrap='wrap' minW={0}>
                                                  <Text fontWeight='700' color='gray.900' lineClamp={1}>
                                                    {ticket.ticket.name}
                                                  </Text>
                                                  <Text fontSize='sm' fontWeight='400' color='gray.600' whiteSpace='nowrap'>
                                                    | {ticket.quantity} {ticket.quantity === 1 ? 'ticket' : 'tickets'} added
                                                  </Text>
                                                </HStack>
                                                <Text fontSize='sm' color='gray.600'>
                                                  {ticket.quantity} {ticket.quantity === 1 ? 'attendee' : 'attendees'} needed for this ticket.
                                                </Text>
                                              </Stack>
                                              <Badge colorPalette='gray' variant='subtle' borderRadius='full' px={3} py={1}>
                                                {ticket.quantity}
                                              </Badge>
                                            </Flex>
                                          ))}
                                        </Stack>
                                      </Box>
                                    ))
                                ) : (
                                  <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='gray.50' p={4}>
                                    <Text fontSize='sm' color='gray.600'>
                                      No selected session currently requires attendee information.
                                    </Text>
                                  </Box>
                                )}
                              </Stack>
                            </SupportCard>
                          ) : null}

                          {tab.id === 'questionnaire' ? (
                            <SupportCard title='Questionnaire' subtitle='Custom forms and questions mapped to the selected sessions are rendered here.' icon={<MessageSquareText size={18} />}>
                              <Stack gap={5}>
                                {selectedSessionSummaries.filter((session) => session.hasQuestions).length > 0 ? (
                                  selectedSessionSummaries
                                    .filter((session) => session.hasQuestions)
                                    .map((session) => (
                                      <Box key={session.session.uniqueId} borderWidth='1px' borderColor='gray.200' borderRadius='20px' p={5} bg='gray.50'>
                                        <Stack gap={4}>
                                          <Box>
                                            <Text fontSize='lg' fontWeight='700' color='gray.900'>
                                              {session.session.name}
                                            </Text>
                                            <Text fontSize='sm' color='gray.600'>
                                              Questionnaire content mapped to this selected session.
                                            </Text>
                                          </Box>
                                          {session.session.customForms.length > 0 ? (
                                            <Stack gap={3}>
                                              <Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.14em'>
                                                Custom Forms
                                              </Text>
                                              <SimpleGrid columns={{ base: 1, lg: 2 }} gap={3}>
                                                {session.session.customForms.map((form) => (
                                                  <Box key={form.uniqueId} borderWidth='1px' borderColor='gray.200' borderRadius='16px' bg='white' p={4}>
                                                    <Text fontWeight='700' color='gray.900'>
                                                      {form.headerText ?? form.name}
                                                    </Text>
                                                    {form.description ? (
                                                      <Text mt={2} fontSize='sm' color='gray.600' lineHeight='1.7'>
                                                        {form.description}
                                                      </Text>
                                                    ) : null}
                                                  </Box>
                                                ))}
                                              </SimpleGrid>
                                            </Stack>
                                          ) : null}
                                          {session.session.customQuestions.length > 0 ? (
                                            <Stack gap={3}>
                                              <Text fontSize='xs' fontWeight='700' color='gray.500' textTransform='uppercase' letterSpacing='0.14em'>
                                                Custom Questions
                                              </Text>
                                              <Stack gap={4}>
                                                {session.session.customQuestions
                                                  .filter((question) => question.isActive)
                                                  .map((question) => (
                                                    <Box key={question.uniqueId} borderWidth='1px' borderColor='gray.200' borderRadius='16px' bg='white' p={4}>
                                                      <QuestionField
                                                        question={question}
                                                        value={getAnswer(session.session.uniqueId, question.uniqueId)}
                                                        errorMessage={getQuestionErrorMessage(session.session.uniqueId, question)}
                                                        onChange={(value) => setAnswer(session.session.uniqueId, question.uniqueId, value)}
                                                      />
                                                    </Box>
                                                  ))}
                                              </Stack>
                                            </Stack>
                                          ) : null}
                                        </Stack>
                                      </Box>
                                    ))
                                ) : (
                                  <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='gray.50' p={4}>
                                    <Text fontSize='sm' color='gray.600'>
                                      No selected session currently requires custom forms or questions.
                                    </Text>
                                  </Box>
                                )}
                              </Stack>
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

                                {isCartSyncing && paymentBreakdowns.length === 0 ? (
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
                                              <Stack gap={4} px={4} py={4} ref={paymentCardValidationRef}>
                                                {showPaymentControls && paymentIntent ? (
                                                  <StripeCardFields
                                                    intent={paymentIntent}
                                                    accentColor={formAccent}
                                                    isConfirming={confirmCheckoutMutation.isPending}
                                                    onPaid={handlePaymentSucceeded}
                                                  />
                                                ) : showPaymentControls ? (
                                                  <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='gray.50' p={4}>
                                                    <Text fontSize='sm' color='gray.600'>
                                                      Review your purchase to continue to card entry.
                                                    </Text>
                                                  </Box>
                                                ) : (
                                                  <Box borderWidth='1px' borderColor='gray.200' borderRadius='18px' bg='gray.50' p={4}>
                                                    <Text fontSize='sm' color='gray.600'>
                                                      You will be prompted to complete this payment after reviewing your purchase.
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
                expiresAtUtc={expiresAtUtc}
                accentColor={formAccent}
                onExpire={handlePurchaseTimerExpire}
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

      <Dialog.Root
        open={buyerDetailsAlertOpen}
        onOpenChange={(details) => {
          if (!details.open) {
            closeBuyerDetailsAlert()
          }
        }}
        size='sm'
      >
        <Dialog.Backdrop backdropFilter='blur(8px)' bg='blackAlpha.650' />
        <Dialog.Positioner alignItems='center' justifyContent='center' px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }}>
          <Dialog.Content borderRadius='28px' overflow='hidden' bg='white' boxShadow='0 30px 80px rgba(15, 23, 42, 0.28)'>
            <Box h='5px' bg='orange.400' />
            <Box px={{ base: 4, md: 5 }} py={{ base: 5, md: 6 }}>
              <Stack gap={5} align='center' textAlign='center'>
                <Box w='72px' h='72px' borderRadius='24px' display='grid' placeItems='center' bg='orange.50' color='orange.500'>
                  <AlertCircle size={30} />
                </Box>
                <Stack gap={2} maxW='2xl'>
                  <Heading fontSize={{ base: '2xl', md: '3xl' }} letterSpacing='-0.04em'>
                    Buyer details missing
                  </Heading>
                  <Text color='gray.600' lineHeight='1.7'>
                    {buyerDetailsAlertMessage}
                  </Text>
                </Stack>
                <Button
                  minH='12'
                  px={6}
                  borderRadius='16px'
                  color='white'
                  bg='orange.500'
                  _hover={{ bg: 'orange.600' }}
                  _active={{ bg: 'orange.700' }}
                  onClick={closeBuyerDetailsAlert}
                >
                  Ok
                </Button>
              </Stack>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

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
                      You will enter your card details securely on the next step.
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








