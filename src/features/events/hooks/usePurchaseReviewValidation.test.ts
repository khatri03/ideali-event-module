import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { usePurchaseReviewValidation } from "./usePurchaseReviewValidation"
import type { PurchaseReviewIssue } from "@/features/events/components/registration/types"

const createToast = vi.fn()

vi.mock("@/lib/toaster", () => ({
  toaster: {
    create: (options: unknown) => createToast(options),
  },
}))

const TERMS_ISSUE: PurchaseReviewIssue = {
  message: "Accept the registration terms and conditions.",
  target: "terms",
}

describe("usePurchaseReviewValidation", () => {
  beforeEach(() => {
    createToast.mockClear()
  })

  it("ToastsUnacceptedTerms_BecauseTheTermsCardShowsNoInlineError", () => {
    const { result } = renderHook(() => usePurchaseReviewValidation())

    act(() => result.current.applyIssues([TERMS_ISSUE]))

    expect(createToast).toHaveBeenCalledTimes(1)
    expect(createToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error", description: TERMS_ISSUE.message }),
    )
  })

  it("ToastsUnacceptedRefundPolicy_BecauseThatCardShowsNoInlineErrorEither", () => {
    const { result } = renderHook(() => usePurchaseReviewValidation())

    act(() =>
      result.current.applyIssues([{ message: "Accept the refund policy.", target: "refund-policy" }]),
    )

    expect(createToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Accept the refund policy." }),
    )
  })

  it("ReusesOneToastId_SoRepeatedAttemptsDoNotStackToasts", () => {
    const { result } = renderHook(() => usePurchaseReviewValidation())

    act(() => result.current.applyIssues([TERMS_ISSUE]))
    act(() => result.current.applyIssues([TERMS_ISSUE]))

    const [firstCall, secondCall] = createToast.mock.calls
    expect(firstCall[0].id).toBe(secondCall[0].id)
  })

  it("SkipsTheToastForStepsThatRenderTheirOwnBanner", () => {
    const { result } = renderHook(() => usePurchaseReviewValidation())

    act(() =>
      result.current.applyIssues([{ message: "Enter the buyer details.", target: "buyer-attendee-info" }]),
    )

    expect(createToast).not.toHaveBeenCalled()
  })

  it("ReportsOnlyTheFirstIssue_SoTheBuyerIsGivenOneThingToFix", () => {
    const { result } = renderHook(() => usePurchaseReviewValidation())

    act(() =>
      result.current.applyIssues([TERMS_ISSUE, { message: "Accept the refund policy.", target: "refund-policy" }]),
    )

    expect(createToast).toHaveBeenCalledTimes(1)
    expect(result.current.message).toBe(TERMS_ISSUE.message)
    expect(result.current.scrollTarget).toBe("terms")
  })

  it("ToastsNothing_WhenTheReviewPassesAndTheDialogOpens", () => {
    const { result } = renderHook(() => usePurchaseReviewValidation())

    act(() => result.current.openReview())

    expect(createToast).not.toHaveBeenCalled()
    expect(result.current.isReviewOpen).toBe(true)
  })
})
