import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Portal,
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
  FileText,
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
import { useTicketSelectionSummary } from '@/features/events/hooks/useTicketSelectionSummary'
import { usePurchaseReviewValidation } from '@/features/events/hooks/usePurchaseReviewValidation'
import { useBuyerAttendeeInfo } from '@/features/events/hooks/useBuyerAttendeeInfo'
import { useQuestionnaireAnswers } from '@/features/events/hooks/useQuestionnaireAnswers'
import { useCreateEventPaymentIntent, useRecordEventChequePayment } from '@/features/events/hooks/useEventCheckout'
import {
  useSubmitLineAttendees,
  useSubmitOrderAnswers,
  useUploadAnswerFile,
} from '@/features/events/hooks/useEventCartAttendees'
import { PurchaseTimerChip } from '@/features/events/components/registration/PurchaseTimerChip'
import { CartSummaryPanel } from '@/features/events/components/registration/CartSummaryPanel'
import { PaymentStep } from '@/features/events/components/registration/PaymentStep'
import { RegistrationPaymentConfirmation } from '@/features/events/components/registration/RegistrationPaymentConfirmation'
import { RegistrationStripeProvider } from '@/features/events/components/registration/RegistrationStripeProvider'
import { QuestionnaireStep } from '@/features/events/components/registration/QuestionnaireStep'
import type { RegistrationFieldDescriptor } from '@/features/events/utils/registrationFields'
import {
  BuyerDetailsMissingDialog,
  ConfirmRemoveDialog,
  ContentDialog,
  PurchaseExpiredDialog,
  SessionUnavailableDialog,
} from '@/features/events/components/registration/RegistrationDialogs'
import type { PaymentProduct } from '@/features/events/schemas/eventCart.schemas'
import {
  clearPendingOrderId,
  readPendingOrderId,
  storePendingOrderId,
} from '@/features/events/utils/registrationOrderCookie'
import { extractApiError } from '@/utils/errors'
import { isRoutableEmail } from '@/utils/email'
import { APP_ROUTES } from '@/utils/routes'

import { EventHeroCard } from '@/features/events/components/registration/EventHeroCard'
import { RegistrationAcknowledgementCard } from '@/features/events/components/registration/RegistrationAcknowledgementCard'
import { BuyerAttendeeStep } from '@/features/events/components/registration/BuyerAttendeeStep'
import { RichTextBlock, SupportCard } from '@/features/events/components/registration/SupportCard'
import { SessionsStep } from '@/features/events/components/registration/SessionsStep'
import type {
  EventRegisterWizardEvent,
  PendingDeleteAction,
  PurchaseReviewIssue,
  PurchaseReviewValidationTarget,
  SelectedTicketSummaryItem,
  WizardTabId,
} from '@/features/events/components/registration/types'
import {
  hexToRgba,
} from '@/features/events/utils/registrationFormat'
import {
  getSelectedSessionSummaries,
  getSessionBannerSlides,
  hasTicketOnHold,
  isCardPaymentMethod,
  isChequePaymentMethod,
  isHtmlContent,
} from '@/features/events/utils/ticketSelection'
import { getPaymentFieldIssues } from '@/features/events/utils/paymentFieldIssues'

export type { EventRegisterWizardEvent }

/**
 * How often availability is re-read while another buyer is holding every seat. Short enough that the
 * seats appear soon after they are released, long enough that a busy on-sale does not turn every
 * waiting browser into a source of load.
 */
const HELD_SEAT_POLL_INTERVAL_MS = 15_000

function getVisibleTabs(event: EventRegisterWizardEvent, selectedTicketQuantities: Record<string, number>) {
  const tabs: Array<{ id: WizardTabId; label: string; icon: typeof FileText }> = []
  const selectedSessionSummaries = getSelectedSessionSummaries(event.sessions, selectedTicketQuantities)
  const hasSelectedAttendeeInfo = selectedSessionSummaries.some((session) => session.requiresAttendeeInfo)
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

  // Event-scoped: the buyer answers these once regardless of which sessions they picked.
  if (isVisible('questionnaire') && (event.customForms.length > 0 || event.customQuestions.length > 0)) {
    tabs.push({ id: 'questionnaire', label: 'Questionnaire', icon: MessageSquareText })
  }

  tabs.push({ id: 'payment', label: 'Payment', icon: CreditCard })

  return tabs
}

function getStepIndex(tabs: Array<{ id: WizardTabId }>, stepId: WizardTabId) {
  return tabs.findIndex((item) => item.id === stepId)
}

/**
 * The cart rides along so the confirmation page can run the checkout confirm fast-path - the buyer
 * may reach that page through a bank redirect, where this wizard never gets the chance to.
 */
function buildOrderPath(orderUniqueId: string, handoffCartUniqueId: string | null) {
  const path = APP_ROUTES.eventOrder(orderUniqueId)
  return handoffCartUniqueId ? `${path}?cart=${encodeURIComponent(handoffCartUniqueId)}` : path
}

export function EventRegisterWizard({ event, formAccent, onBack }: { event: EventRegisterWizardEvent; formAccent: string; onBack: () => void }) {
  const accentBackground = hexToRgba(formAccent, 0.18)
  const {
    cart,
    price: cartPrice,
    isSyncing: isCartSyncing,
    error: cartError,
    isSessionLost: isCartSessionLost,
    expiresAtUtc,
    lineByTicketTypeId,
    restoredCart,
    syncTicketSelection,
    setBuyerIdentity,
    appliedCouponCode,
    applyCoupon,
    resetCart,
    completeCart,
  } = useRegistrationCart(event.uniqueId)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [refundPolicyAccepted, setRefundPolicyAccepted] = useState(false)
  const [refundPolicyOpen, setRefundPolicyOpen] = useState(false)
  const [expandedSessionIds, setExpandedSessionIds] = useState<string[]>([])
  const [activeSessionDescription, setActiveSessionDescription] = useState<{ title: string; description: string } | null>(null)
  const [sessionTicketSearch, setSessionTicketSearch] = useState<Record<string, string>>({})
  const [selectedTicketQuantities, setSelectedTicketQuantities] = useState<Record<string, number>>({})
  const tabs = useMemo(() => getVisibleTabs(event, selectedTicketQuantities), [event, selectedTicketQuantities])
  const firstTab = tabs[0]?.id ?? 'sessions'
  const [activeTab, setActiveTab] = useState<WizardTabId>(firstTab)
  const [highestUnlockedIndex, setHighestUnlockedIndex] = useState(0)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const {
    isReviewOpen: isPurchaseReviewOpen,
    setIsReviewOpen: setIsPurchaseReviewOpen,
    attempted: purchaseReviewAttempted,
    message: purchaseReviewMessage,
    scrollTarget: purchaseReviewScrollTarget,
    buyerAttendeeRef: buyerAttendeeValidationRef,
    questionnaireRef: questionnaireValidationRef,
    paymentMethodRef: paymentMethodValidationRef,
    termsRef: termsValidationRef,
    refundPolicyRef: refundPolicyValidationRef,
    applyIssues: applyPurchaseReviewIssues,
    openReview,
    clearBuyerAttendeeIssue: clearBuyerAttendeeValidation,
    reset: resetPurchaseReview,
  } = usePurchaseReviewValidation()
  const [purchaseTimerExpired, setPurchaseTimerExpired] = useState(false)
  const [purchaseTimerExpiryOpen, setPurchaseTimerExpiryOpen] = useState(false)
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)
  const [pendingDeleteAction, setPendingDeleteAction] = useState<PendingDeleteAction | null>(null)
  const [cardHolderName, setCardHolderName] = useState('')
  const [chequeReferenceNo, setChequeReferenceNo] = useState('')
  const [chequeNotes, setChequeNotes] = useState('')
  const [invoiceNote, setInvoiceNote] = useState('')
  /** Set the moment an intent is minted, so the buyer can be sent to their order once it is paid. */
  const [orderUniqueId, setOrderUniqueId] = useState<string | null>(null)
  const navigate = useNavigate()
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
    // Seats another buyer is holding come back without the buyer here doing anything, so the page has
    // to go and look. Only while something is actually held: an event with seats on sale never polls,
    // and a backgrounded tab does not poll at all (refetchIntervalInBackground stays off).
    refetchInterval: (query) =>
      hasTicketOnHold(query.state.data?.sessions ?? []) ? HELD_SEAT_POLL_INTERVAL_MS : false,
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

  // A payment was already in flight when this tab last closed. The order outlives the cart, so the
  // buyer is taken to it rather than dropped back into a wizard whose cart may already be paid for.
  useEffect(() => {
    const pendingOrderUniqueId = readPendingOrderId()
    if (!pendingOrderUniqueId) return

    clearPendingOrderId()
    navigate(buildOrderPath(pendingOrderUniqueId, null), {
      replace: true,
      state: { registerPath: APP_ROUTES.eventRegister(event.uniqueId) },
    })
  }, [navigate, event.uniqueId])

  function restartPurchaseFlow() {
    // Drop the stored cart first, or the reload resumes the very cart that just expired.
    resetCart()
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
  const {
    selectedTicketSummaryBySession,
    selectedTicketCount,
    selectedTicketTotal,
    selectedSessionSummaries,
    attendeeSessionGroups,
    attendeeSlotEntries,
    attendeeSlotEntryByKey,
    requiresAttendeeInfo,
  } = useTicketSelectionSummary(sessionsData, selectedTicketQuantities, cartPrice)
  const {
    buyerInfo,
    attendeeInfoBySlot,
    ticketSameAsBuyerById,
    alertMessage: buyerDetailsAlertMessage,
    isAlertOpen: buyerDetailsAlertOpen,
    isSessionSameAsBuyer,
    getAttendeeInfo,
    updateBuyerField,
    updateAttendeeField,
    toggleSessionSameAsBuyer,
    toggleTicketSameAsBuyer,
    closeAlert: closeBuyerDetailsAlert,
    getIssues: getBuyerAttendeeInfoIssues,
    reset: resetBuyerAttendeeInfo,
  } = useBuyerAttendeeInfo({ attendeeSlotEntries, attendeeSlotEntryByKey, attendeeSessionGroups })
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
  const isSelectedPaymentMethodCheque = Boolean(selectedPaymentBreakdown && isChequePaymentMethod(selectedPaymentBreakdown.paymentMethod))
  // Gross on purpose. A breakdown's own subtotal is already net of the coupon, and the table lists
  // the coupon on its own line underneath - showing the net figure above it reads as a second deduction.
  const paymentBreakdownGrossSubtotal = cartPrice?.subTotal ?? selectedPaymentBreakdown?.subtotal ?? 0
  const eventData = useMemo(
    () => ({
      ...event,
      description: descriptionData.description ?? event.description,
      summary: descriptionData.summary ?? event.summary,
      termsConditions: descriptionData.termsConditions ?? event.termsConditions,
      refundPolicy: descriptionData.refundPolicy ?? event.refundPolicy,
      sessions: sessionsData,
      paymentMethods: paymentMethodsData,
      // The questionnaire endpoint carries the authoritative form and question definitions.
      customForms: questionnaireQuery.data?.customForms ?? event.customForms,
      customQuestions: questionnaireQuery.data?.customQuestions ?? event.customQuestions,
    }),
    [
      event,
      descriptionData.description,
      descriptionData.summary,
      descriptionData.termsConditions,
      descriptionData.refundPolicy,
      sessionsData,
      paymentMethodsData,
      questionnaireQuery.data,
    ],
  )
  const currentEvent = eventData
  const sessions = currentEvent.sessions
  const {
    formSections,
    questions: customQuestionFields,
    hasQuestionnaire,
    getAnswer,
    setAnswer,
    getFile,
    setFile,
    getErrorMessage: getQuestionErrorMessage,
    buildAnswersRequest,
    missingRequiredCount,
    setShowValidation: setShowQuestionValidation,
    resetAnswers,
  } = useQuestionnaireAnswers(currentEvent)
  const submitAttendeesMutation = useSubmitLineAttendees(cart?.cartUniqueId)
  const submitAnswersMutation = useSubmitOrderAnswers(cart?.cartUniqueId)
  const uploadAnswerFileMutation = useUploadAnswerFile(cart?.cartUniqueId)
  const createPaymentIntentMutation = useCreateEventPaymentIntent(cart?.cartUniqueId)
  const recordChequePaymentMutation = useRecordEventChequePayment(cart?.cartUniqueId)
  const bannerSlides = useMemo(() => getSessionBannerSlides(currentEvent), [currentEvent])
  const sessionsLoading = sessionsQuery.isLoading || (sessionsQuery.isFetching && sessions.length === 0)
  const attendeeInfoLoading = attendeeInfoQuery.isLoading && !attendeeInfoQuery.data
  const questionnaireLoading = questionnaireQuery.isLoading && !questionnaireQuery.data
  const [prevSessions, setPrevSessions] = useState(sessions)
  if (sessions !== prevSessions) {
    setPrevSessions(sessions)
    setExpandedSessionIds(sessions.map((session) => session.uniqueId))
  }

  // The hold deadline is the server's; the chip only counts down to it.
  const purchaseTimerVisible = Boolean(expiresAtUtc)

  // A cart that survived a refresh brings its lines back with it. Seeding the quantities rebuilds
  // the whole selection, because that one map drives the visible tabs, the summary and the
  // attendee slots. Buyer and attendee details are only sent at confirm time, so they are retyped.
  const [prevRestoredCart, setPrevRestoredCart] = useState(restoredCart)
  if (restoredCart !== prevRestoredCart) {
    setPrevRestoredCart(restoredCart)

    if (restoredCart) {
      setSelectedTicketQuantities(
        restoredCart.lines.reduce<Record<string, number>>((quantities, line) => {
          quantities[line.ticketTypeUniqueId] = line.quantity
          return quantities
        }, {}),
      )
    }
  }

  // The server refuses to open a cart without a buyer, so hand the identity over as soon as it is
  // complete; tickets picked beforehand are replayed against the newly opened cart.
  useEffect(() => {
    const name = `${buyerInfo.firstName} ${buyerInfo.lastName}`.trim()

    // A malformed address is rejected by the cart endpoint, so it is not worth a round trip until
    // the buyer has finished typing one that could route.
    if (!name || !isRoutableEmail(buyerInfo.email)) {
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
  const questionnaireStepIndex = getStepIndex(tabs, 'questionnaire')
  // An unanswered required question pins the buyer to the questionnaire: every later tab locks while
  // earlier ones stay open, so they can go back and change a ticket without losing what they typed.
  const questionnaireLockIndex =
    questionnaireStepIndex >= 0 && missingRequiredCount > 0 ? questionnaireStepIndex : tabs.length - 1
  const effectiveHighestUnlockedIndex = Math.min(
    selectedTicketCount > 0 ? highestUnlockedIndex : Math.min(highestUnlockedIndex, sessionsStepIndex),
    questionnaireLockIndex,
  )
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

    if (activeTab === 'buyer-attendee-info') {
      const issues = getBuyerAttendeeInfoIssues()

      if (issues.length > 0) {
        applyPurchaseReviewIssues(issues)
        return
      }

      clearBuyerAttendeeValidation()
    }

    if (activeTab === 'questionnaire') {
      const issues = getQuestionnaireIssues()

      if (issues.length > 0) {
        applyPurchaseReviewIssues(issues)
        return
      }
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

  /**
   * The questionnaire's own rule, asked both when leaving the step and again at review - the buyer can
   * reach payment on a cart opened before the organizer added a required question.
   */
  function getQuestionnaireIssues(): PurchaseReviewIssue[] {
    if (missingRequiredCount <= 0) {
      return []
    }

    setShowQuestionValidation(true)

    return [
      {
        message:
          missingRequiredCount === 1
            ? 'Answer the required question before continuing.'
            : `Answer the ${missingRequiredCount} required questions before continuing.`,
        target: 'questionnaire',
      },
    ]
  }

  function getPurchaseReviewIssues() {
    const issues: PurchaseReviewIssue[] = []

    if (selectedTicketCount <= 0) {
      issues.push({ message: 'Select at least one ticket.', target: 'payment-method' })
    }

    // The step that owns these fields owns the rules for them. A second copy here drifted once
    // already and told the buyer a completed form was incomplete.
    issues.push(...getBuyerAttendeeInfoIssues())

    issues.push(...getQuestionnaireIssues())

    issues.push(
      ...getPaymentFieldIssues({
        hasSelectedMethod: Boolean(selectedPaymentBreakdown),
        isCardMethod: isSelectedPaymentMethodCard,
        cardHolderName,
        isChequeMethod: isSelectedPaymentMethodCheque,
        chequeReferenceNo,
      }),
    )

    if (currentEvent.termsConditions && !termsAccepted) {
      issues.push({ message: 'Accept the registration terms and conditions.', target: 'terms' })
    }

    if (currentEvent.refundPolicy && !refundPolicyAccepted) {
      issues.push({ message: 'Accept the refund policy.', target: 'refund-policy' })
    }

    return issues
  }

  /**
   * Whether this acknowledgement is the one the last pay attempt stopped on. Ticking it clears the
   * highlight immediately, without waiting for another attempt.
   */
  function isAcknowledgementBlocking(
    target: Extract<PurchaseReviewValidationTarget, 'terms' | 'refund-policy'>,
    isAccepted: boolean,
  ) {
    return purchaseReviewAttempted && purchaseReviewScrollTarget === target && !isAccepted
  }

  function handlePurchaseReview() {
    const issues = getPurchaseReviewIssues()

    if (issues.length > 0) {
      applyPurchaseReviewIssues(issues)
      return
    }

    openReview()
  }

  function handleSelectPaymentMethod(method: string) {
    // A complaint raised against the previous method - a decline, a missing field - no longer
    // applies once the buyer switches to a different one.
    if (method !== selectedPaymentMethod) {
      resetPurchaseReview()
    }

    setSelectedPaymentMethod(method)
  }

  function handlePrimaryAction() {
    if (isFinalStep) {
      handlePurchaseReview()
      return
    }

    handleContinue()
  }

  /**
   * Uploads happen while the buyer is still filling the form so the answer only ever carries a
   * stored file id. The upload is scoped to the open cart, which is why a ticket must be selected
   * first.
   */
  async function handleUploadAnswerFile(descriptor: RegistrationFieldDescriptor, file: File) {
    if (!cart) {
      throw new Error('Add a ticket before attaching files.')
    }

    const uploaded = await uploadAnswerFileMutation.mutateAsync({ fieldUniqueId: descriptor.key, file })
    setFile(descriptor.key, uploaded)
    return uploaded
  }

  /**
   * Validates the review, writes attendees against their cart lines and the questionnaire answers
   * against the order. Returns false when the purchase must not go ahead, leaving the complaint on
   * screen.
   */
  async function preparePurchaseAsync() {
    const issues = getPurchaseReviewIssues()

    if (issues.length > 0) {
      applyPurchaseReviewIssues(issues)
      return false
    }

    if (!cart || !selectedPaymentBreakdown) {
      return false
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
                  const info = getAttendeeInfo(slot)

                  return {
                    name: `${info.firstName} ${info.lastName}`.trim(),
                    email: info.email || null,
                    phone: info.phone || null,
                  }
                }),
              },
            })
          }
        }),
      )

      const answers = buildAnswersRequest()
      if (answers.formResponses.length > 0 || answers.questionResponses.length > 0) {
        await submitAnswersMutation.mutateAsync(answers)
      }

      return true
    } catch (error) {
      applyPurchaseReviewIssues([{ message: extractApiError(error), target: 'payment-method' }])
      return false
    }
  }

  /**
   * Mints the PaymentIntent for the chosen method. Called only once the buyer has confirmed, so an
   * abandoned review never leaves a half-open payment attached to the cart.
   *
   * The order id is written down before the buyer is handed to Stripe: from here on the money can
   * move at any moment, and a tab that dies in between must still have a way back to the order.
   */
  async function createPaymentIntentAsync() {
    if (!selectedPaymentBreakdown) {
      throw new Error('Select a payment method.')
    }

    const intent = await createPaymentIntentMutation.mutateAsync({
      paymentMethod: selectedPaymentBreakdown.paymentMethod as PaymentProduct,
      buyerName: `${buyerInfo.firstName} ${buyerInfo.lastName}`.trim() || null,
      buyerEmail: buyerInfo.email || null,
      invoiceNote: invoiceNote.trim() || null,
    })

    setOrderUniqueId(intent.invoiceUniqueId)
    storePendingOrderId(intent.invoiceUniqueId)

    return {
      clientSecret: intent.clientSecret,
      returnUrl: `${window.location.origin}${buildOrderPath(intent.invoiceUniqueId, cart?.cartUniqueId ?? null)}`,
    }
  }

  /**
   * The cheque counterpart to createPaymentIntentAsync. One call records the payment and issues the
   * tickets, so there is no Stripe step and nothing to poll for — the organizer goes straight to the
   * order, which is where the ticket codes and the amount still owing are shown.
   */
  async function recordChequePaymentAsync() {
    const receipt = await recordChequePaymentMutation.mutateAsync({
      chequeReferenceNo: chequeReferenceNo.trim(),
      notes: chequeNotes.trim() || undefined,
      invoiceNote: invoiceNote.trim() || null,
    })

    // Written down before anything else can fail: the tickets already exist on the server, so a tab
    // that dies here must still have a way back to the order.
    setOrderUniqueId(receipt.invoiceUniqueId)
    storePendingOrderId(receipt.invoiceUniqueId)

    const handoffCartUniqueId = cart?.cartUniqueId ?? null
    completeCart()

    navigate(buildOrderPath(receipt.invoiceUniqueId, handoffCartUniqueId), {
      replace: true,
      state: { registerPath: APP_ROUTES.eventRegister(event.uniqueId) },
    })
  }

  /** Stripe rejected the payment, so the buyer goes back to the fields to correct it. */
  function handlePaymentFailed(message: string) {
    applyPurchaseReviewIssues([{ message, target: 'payment-method' }])
  }

  /**
   * Runs after Stripe reports a successful confirm. Nothing is decided here: the buyer is handed to
   * the order page, which owns the confirm fast-path and polls the server for settlement. That is
   * the same page a bank redirect returns to, so both routes into a paid order behave identically.
   */
  async function handlePaymentSucceeded() {
    const handoffCartUniqueId = cart?.cartUniqueId ?? null
    const paidOrderUniqueId = orderUniqueId ?? readPendingOrderId()

    // The money has already moved, so the cart must stop being resumable and the hold deadline must
    // stop counting - a paid order cannot expire.
    completeCart()
    setIsPurchaseReviewOpen(false)

    if (!paidOrderUniqueId) {
      // The intent that just paid carried the order id, so this should be unreachable - but a buyer
      // whose money has moved is never left staring at a payment form.
      toaster.create({
        type: 'success',
        title: 'Payment received',
        description: 'Your confirmation is on its way by email.',
      })
      return
    }

    // Replaced, not pushed: back must never land on a live payment form for an order already paid.
    // The registration link travels with it so a buyer who wants more tickets is not left hunting.
    navigate(buildOrderPath(paidOrderUniqueId, handoffCartUniqueId), {
      replace: true,
      state: { registerPath: APP_ROUTES.eventRegister(event.uniqueId) },
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

  function handleApplyCoupon(code: string) {
    void applyCoupon(code)
  }

  function handleRemoveCoupon() {
    void applyCoupon(null)
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
    setSelectedPaymentMethod(null)
    resetBuyerAttendeeInfo()
    setTermsAccepted(false)
    setTermsOpen(false)
    setRefundPolicyAccepted(false)
    setRefundPolicyOpen(false)
    setCardHolderName('')
    resetPurchaseReview()
    setPurchaseTimerExpired(false)
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
    <RegistrationStripeProvider
      paymentAccountUniqueId={event.paymentAccountUniqueId}
      amount={selectedPaymentBreakdown?.grandTotal ?? 0}
      currencyCode={currentEvent.paymentAccountCurrency}
    >
      <Box minH='100dvh' bg={accentBackground} color='gray.900'>
      <Flex minH='100dvh' align='center' justify='center' px={{ base: 3, md: 6, xl: 8 }} py={{ base: 5, md: 8 }}>
        <Container maxW='8xl' p={0}>
          <Stack gap={6}>
            <EventHeroCard
              title={event.title}
              organizer={event.organizer}
              summary={currentEvent.summary ?? null}
              startDate={event.startDate}
              endDate={event.endDate}
              location={event.location}
              locationMapUrl={event.locationMapUrl ?? null}
              bannerSlides={bannerSlides}
              accentColor={formAccent}
            />

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
              <RegistrationAcknowledgementCard
                label='I accept the registration terms and conditions.'
                actionLabel='View terms'
                isAccepted={termsAccepted}
                isInvalid={isAcknowledgementBlocking('terms', termsAccepted)}
                onAcceptedChange={setTermsAccepted}
                onViewContent={() => setTermsOpen(true)}
                accentColor={formAccent}
                validationRef={termsValidationRef}
              />
            ) : null}

            {currentEvent.refundPolicy ? (
              <RegistrationAcknowledgementCard
                label='I accept the refund policy.'
                actionLabel='View refund policy'
                isAccepted={refundPolicyAccepted}
                isInvalid={isAcknowledgementBlocking('refund-policy', refundPolicyAccepted)}
                onAcceptedChange={setRefundPolicyAccepted}
                onViewContent={() => setRefundPolicyOpen(true)}
                accentColor={formAccent}
                validationRef={refundPolicyValidationRef}
              />
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
                                onHoldRelease={sessionsQuery.refetch}
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
                                isLoading={attendeeInfoLoading}
                                requiresAttendeeInfo={requiresAttendeeInfo}
                                requiresQuestions={hasQuestionnaire}
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
                            <Box ref={questionnaireValidationRef}>
                              <SupportCard title='Questionnaire' subtitle='Custom forms and questions this event asks every buyer to answer.' icon={<MessageSquareText size={18} />}>
                                <QuestionnaireStep
                                  formSections={formSections}
                                  questions={customQuestionFields}
                                  isLoading={questionnaireLoading}
                                  getAnswer={getAnswer}
                                  getFile={getFile}
                                  getErrorMessage={getQuestionErrorMessage}
                                  onChangeAnswer={setAnswer}
                                  onUploadFile={handleUploadAnswerFile}
                                  onClearFile={(key) => setFile(key, null)}
                                />
                              </SupportCard>
                            </Box>
                          ) : null}

                          {tab.id === 'payment' ? (
                            <SupportCard title='Payment' subtitle='Show the mapped payment methods and protect organizer-only cheque payments.' icon={<CreditCard size={18} />}>
                              <PaymentStep
                                breakdowns={paymentBreakdowns}
                                selectedBreakdown={selectedPaymentBreakdown}
                                onSelectMethod={handleSelectPaymentMethod}
                                isCardMethodSelected={isSelectedPaymentMethodCard}
                                cardHolderName={cardHolderName}
                                isChequeMethodSelected={isSelectedPaymentMethodCheque}
                                chequeReferenceNo={chequeReferenceNo}
                                onChequeReferenceNoChange={setChequeReferenceNo}
                                chequeNotes={chequeNotes}
                                onChequeNotesChange={setChequeNotes}
                                onCardHolderNameChange={setCardHolderName}
                                sessionGroups={selectedTicketSummaryBySession}
                                grossSubtotal={paymentBreakdownGrossSubtotal}
                                ticketSubtotal={selectedTicketTotal}
                                discountAmount={cartPrice?.discountAmount ?? 0}
                                acceptsDiscountCoupons={currentEvent.acceptsDiscountCoupons}
                                appliedCouponCode={appliedCouponCode}
                                onApplyCoupon={handleApplyCoupon}
                                onRemoveCoupon={handleRemoveCoupon}
                                isCouponSyncing={isCartSyncing}
                                currencyCode={currentEvent.paymentAccountCurrency}
                                formAccent={formAccent}
                                isLoading={isCartSyncing}
                                hasVisiblePaymentMethods={visiblePaymentMethods.length > 0}
                                validationMessage={
                                  isFinalStep && purchaseReviewAttempted ? purchaseReviewMessage : null
                                }
                                methodValidationRef={paymentMethodValidationRef}
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

      <ContentDialog
        isOpen={refundPolicyOpen}
        onClose={() => setRefundPolicyOpen(false)}
        eyebrow='Refund Policy'
        title='Refund policy'
        body={currentEvent.refundPolicy}
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

      <SessionUnavailableDialog
        isOpen={isCartSessionLost}
        accentColor={formAccent}
        onRestart={restartPurchaseFlow}
      />

      <RegistrationPaymentConfirmation
        isOpen={isPurchaseReviewOpen}
        onOpenChange={setIsPurchaseReviewOpen}
        eventTitle={currentEvent.title}
        currencyCode={currentEvent.paymentAccountCurrency}
        accentColor={formAccent}
        selectedTicketCount={selectedTicketCount}
        paymentMethodLabel={selectedPaymentMethodLabel}
        isCardPayment={isSelectedPaymentMethodCard}
        isChequePayment={isSelectedPaymentMethodCheque}
        cardHolderName={cardHolderName}
        validationMessage={purchaseReviewAttempted ? purchaseReviewMessage : null}
        ticketRows={purchaseReviewTicketRows}
        grossSubtotal={paymentBreakdownGrossSubtotal}
        discountAmount={cartPrice?.discountAmount ?? 0}
        netSubtotal={selectedPaymentBreakdown?.subtotal ?? paymentBreakdownGrossSubtotal}
        chargeRows={purchaseReviewChargeRows}
        grandTotal={selectedPaymentBreakdown?.grandTotal ?? selectedTicketTotal}
        invoiceNote={invoiceNote}
        isBusy={createPaymentIntentMutation.isPending || recordChequePaymentMutation.isPending}
        onInvoiceNoteChange={setInvoiceNote}
        onPrepare={preparePurchaseAsync}
        onCreateIntent={createPaymentIntentAsync}
        onRecordCheque={recordChequePaymentAsync}
        onPaid={handlePaymentSucceeded}
        onFailed={handlePaymentFailed}
      />

      </Box>
    </RegistrationStripeProvider>
  )
}








