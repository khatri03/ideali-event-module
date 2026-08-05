import { useEffect, useRef, useState } from "react"
import type { RefObject } from "react"
import type {
  PurchaseReviewIssue,
  PurchaseReviewValidationTarget,
} from "@/features/events/components/registration/types"
import { toaster } from "@/lib/toaster"

/**
 * Targets whose card carries no inline error of its own, so a scroll alone leaves the buyer looking
 * at a card with nothing marked wrong. The buyer/attendee and payment steps render their own banner.
 */
const TOASTED_TARGETS: PurchaseReviewValidationTarget[] = ["terms", "refund-policy"]

const TOAST_ID_BY_TARGET: Record<string, string> = {
  terms: "purchase-review-terms",
  "refund-policy": "purchase-review-refund-policy",
}

interface PurchaseReviewValidation {
  isReviewOpen: boolean
  setIsReviewOpen: (isOpen: boolean) => void
  attempted: boolean
  message: string | null
  scrollTarget: PurchaseReviewValidationTarget | null
  buyerAttendeeRef: RefObject<HTMLDivElement | null>
  questionnaireRef: RefObject<HTMLDivElement | null>
  paymentMethodRef: RefObject<HTMLDivElement | null>
  paymentCardRef: RefObject<HTMLDivElement | null>
  termsRef: RefObject<HTMLDivElement | null>
  refundPolicyRef: RefObject<HTMLDivElement | null>
  /** Reports the first issue and keeps the review dialog shut. */
  applyIssues: (issues: PurchaseReviewIssue[]) => void
  /** Clears any reported issue and opens the review dialog. */
  openReview: () => void
  /** Drops a buyer/attendee complaint once those fields have been filled in. */
  clearBuyerAttendeeIssue: () => void
  /** Clears every reported issue, for when the whole purchase flow restarts. */
  reset: () => void
}

/**
 * Owns how a failed purchase review is reported: which message is shown, and which part of the page
 * the buyer is sent to. The request id is what makes a repeated attempt scroll again even when the
 * offending field has not changed.
 */
export function usePurchaseReviewValidation(): PurchaseReviewValidation {
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [scrollTarget, setScrollTarget] = useState<PurchaseReviewValidationTarget | null>(null)
  const [scrollRequestId, setScrollRequestId] = useState(0)

  const buyerAttendeeRef = useRef<HTMLDivElement | null>(null)
  const questionnaireRef = useRef<HTMLDivElement | null>(null)
  const paymentMethodRef = useRef<HTMLDivElement | null>(null)
  const paymentCardRef = useRef<HTMLDivElement | null>(null)
  const termsRef = useRef<HTMLDivElement | null>(null)
  const refundPolicyRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!attempted || !message || isReviewOpen) return
    if (!scrollTarget) return

    // Exhaustive by type: a new target that forgets its section fails the build rather than silently
    // scrolling the buyer to whichever branch happened to be last.
    const targetRef: RefObject<HTMLDivElement | null> = {
      "buyer-attendee-info": buyerAttendeeRef,
      questionnaire: questionnaireRef,
      "payment-method": paymentMethodRef,
      "payment-card": paymentCardRef,
      terms: termsRef,
      "refund-policy": refundPolicyRef,
    }[scrollTarget]

    const frame = window.requestAnimationFrame(() => {
      targetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isReviewOpen, attempted, message, scrollTarget, scrollRequestId])

  function applyIssues(issues: PurchaseReviewIssue[]) {
    const firstIssue = issues[0] ?? null

    setAttempted(true)
    setMessage(firstIssue?.message ?? null)
    setScrollTarget(firstIssue?.target ?? null)
    setScrollRequestId((current) => current + 1)
    setIsReviewOpen(false)

    if (firstIssue && TOASTED_TARGETS.includes(firstIssue.target)) {
      // Fixed id per target: hammering the pay button re-raises the same toast, never stacks them.
      toaster.create({
        id: TOAST_ID_BY_TARGET[firstIssue.target],
        type: "error",
        title: "One more step",
        description: firstIssue.message,
      })
    }
  }

  function openReview() {
    setAttempted(true)
    setMessage(null)
    setScrollTarget(null)
    setScrollRequestId((current) => current + 1)
    setIsReviewOpen(true)
  }

  function reset() {
    setAttempted(false)
    setMessage(null)
    setScrollTarget(null)
  }

  function clearBuyerAttendeeIssue() {
    if (scrollTarget !== "buyer-attendee-info") {
      return
    }

    setAttempted(false)
    setMessage(null)
    setScrollTarget(null)
  }

  return {
    isReviewOpen,
    setIsReviewOpen,
    attempted,
    message,
    scrollTarget,
    buyerAttendeeRef,
    questionnaireRef,
    paymentMethodRef,
    paymentCardRef,
    termsRef,
    refundPolicyRef,
    applyIssues,
    openReview,
    reset,
    clearBuyerAttendeeIssue,
  }
}
