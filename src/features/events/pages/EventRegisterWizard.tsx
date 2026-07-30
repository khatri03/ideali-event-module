import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  Link,
  Portal,
  SimpleGrid,
  Table,
  Stack,
  Tabs,
  Text,
} from '@chakra-ui/react'
import { toaster } from '@/lib/toaster'
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
import { CartSummaryPanel } from '@/features/events/components/registration/CartSummaryPanel'
import { PaymentStep } from '@/features/events/components/registration/PaymentStep'
import { QuestionnaireStep } from '@/features/events/components/registration/QuestionnaireStep'
import {
  BuyerDetailsMissingDialog,
  ConfirmRemoveDialog,
  ContentDialog,
  PurchaseExpiredDialog,
} from '@/features/events/components/registration/RegistrationDialogs'
import type { EventPaymentIntentResult, PaymentProduct } from '@/features/events/schemas/eventCart.schemas'
import { extractApiError } from '@/utils/errors'

import { AutoImageCarousel } from '@/features/events/components/registration/AutoImageCarousel'
import { BuyerAttendeeStep } from '@/features/events/components/registration/BuyerAttendeeStep'
import { RichTextBlock, SupportCard } from '@/features/events/components/registration/SupportCard'
import { SessionsStep } from '@/features/events/components/registration/SessionsStep'
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
    setBuyerIdentity,
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

  // The server refuses to open a cart without a buyer, so hand the identity over as soon as it is
  // complete; tickets picked beforehand are replayed against the newly opened cart.
  useEffect(() => {
    const name = `${buyerInfo.firstName} ${buyerInfo.lastName}`.trim()

    if (!name || !buyerInfo.email.trim()) {
      return
    }

    void setBuyerIdentity({ name, email: buyerInfo.email })
  }, [buyerInfo.firstName, buyerInfo.lastName, buyerInfo.email, setBuyerIdentity])

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

    setBuyerInfo((current) => ({ ...current, [field]: nextValue }))
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

            <CartSummaryPanel
              isOpen={isSummaryOpen}
              onToggle={() => setIsSummaryOpen((current) => !current)}
              sessionGroups={selectedTicketSummaryBySession}
              selectedTicketCount={selectedTicketCount}
              total={selectedTicketTotal}
              currencyCode={event.paymentAccountCurrency}
              formAccent={formAccent}
              onChangeQuantity={handleTicketQuantityChange}
              onRequestRemoveTicket={requestRemoveTicket}
              onRequestRemoveSession={requestRemoveSession}
            />

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
                              <SessionsStep
                                sessions={sessions}
                                isLoading={sessionsLoading}
                                selectedTicketQuantities={selectedTicketQuantities}
                                selectedTicketCount={selectedTicketCount}
                                expandedSessionIds={expandedSessionIds}
                                ticketSearchBySession={sessionTicketSearch}
                                currencyCode={event.paymentAccountCurrency}
                                areAllExpanded={areAllSessionsExpanded}
                                onToggleSession={handleSessionToggle}
                                onExpandAll={handleExpandAllSessions}
                                onCollapseAll={handleCollapseAllSessions}
                                onSearchChange={handleSessionTicketSearchChange}
                                onOpenDescription={(title, description) => setActiveSessionDescription({ title, description })}
                                onChangeQuantity={handleTicketQuantityChange}
                                onRequestRemoveAll={requestRemoveAllTickets}
                              />
                            </Stack>
                          ) : null}

                          {tab.id === 'buyer-attendee-info' ? (
                            <Box ref={buyerAttendeeValidationRef}>
                              <BuyerAttendeeStep
                                buyerInfo={buyerInfo}
                                onChangeBuyerField={updateBuyerField}
                                attendeeSessionGroups={attendeeSessionGroups}
                                attendeeInfoBySlot={attendeeInfoBySlot}
                                ticketSameAsBuyerById={ticketSameAsBuyerById}
                                isSessionSameAsBuyer={isSessionSameAsBuyer}
                                onToggleSessionSameAsBuyer={toggleSessionSameAsBuyer}
                                onToggleTicketSameAsBuyer={toggleTicketSameAsBuyer}
                                onChangeAttendeeField={updateAttendeeField}
                                requiresAttendeeInfo={requiresAttendeeInfo}
                                requiresQuestions={requiresQuestions}
                                validationMessage={
                                  purchaseReviewAttempted && purchaseReviewScrollTarget === 'buyer-attendee-info'
                                    ? purchaseReviewMessage
                                    : null
                                }
                              />
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
                              <QuestionnaireStep
                                sessionSummaries={selectedSessionSummaries}
                                getAnswer={getAnswer}
                                getErrorMessage={getQuestionErrorMessage}
                                onChangeAnswer={setAnswer}
                              />
                            </SupportCard>
                          ) : null}

                          {tab.id === 'payment' ? (
                            <SupportCard title='Payment' subtitle='Show the mapped payment methods and protect organizer-only cheque payments.' icon={<CreditCard size={18} />}>
                              <PaymentStep
                                breakdowns={paymentBreakdowns}
                                selectedBreakdown={selectedPaymentBreakdown}
                                expandedPaymentMethod={expandedPaymentMethod}
                                onSelectMethod={setSelectedPaymentMethod}
                                onToggleExpanded={(method) =>
                                  setExpandedPaymentMethod((current) => (current === method ? null : method))
                                }
                                sessionGroups={selectedTicketSummaryBySession}
                                subtotal={paymentBreakdownSubtotal}
                                ticketSubtotal={selectedTicketTotal}
                                currencyCode={currentEvent.paymentAccountCurrency}
                                formAccent={formAccent}
                                isLoading={isCartSyncing}
                                hasVisiblePaymentMethods={visiblePaymentMethods.length > 0}
                                paymentIntent={paymentIntent}
                                isConfirming={confirmCheckoutMutation.isPending}
                                onPaid={handlePaymentSucceeded}
                                validationMessage={
                                  isFinalStep && purchaseReviewAttempted ? purchaseReviewMessage : null
                                }
                                methodValidationRef={paymentMethodValidationRef}
                                cardValidationRef={paymentCardValidationRef}
                                onChangeQuantity={handleTicketQuantityChange}
                                onRequestRemove={requestRemoveTicket}
                              />
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

      <ContentDialog
        isOpen={termsOpen}
        onClose={() => setTermsOpen(false)}
        eyebrow='Terms & Conditions'
        title='Registration agreement'
        body={currentEvent.termsConditions}
      />

      <BuyerDetailsMissingDialog
        isOpen={buyerDetailsAlertOpen}
        message={buyerDetailsAlertMessage}
        onDismiss={closeBuyerDetailsAlert}
      />

      <ContentDialog
        isOpen={Boolean(activeSessionDescription)}
        onClose={() => setActiveSessionDescription(null)}
        eyebrow='Session Description'
        title={activeSessionDescription?.title ?? ''}
        body={activeSessionDescription?.description ?? null}
      />

      <ConfirmRemoveDialog
        isOpen={Boolean(pendingDeleteAction)}
        title={pendingDeleteAction?.title}
        description={pendingDeleteAction?.description}
        onCancel={() => setPendingDeleteAction(null)}
        onConfirm={confirmDeleteAction}
      />

      <PurchaseExpiredDialog
        isOpen={purchaseTimerExpiryOpen}
        accentColor={formAccent}
        onRestart={restartPurchaseFlow}
      />

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








