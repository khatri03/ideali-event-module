import { beforeEach, describe, expect, it, vi } from "vitest"
import { fetchEventWizardReviewSummary } from "./events"

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock("./client", () => ({ client: { get: getMock } }))

const EVENT_ID = "event-1"

beforeEach(() => {
  getMock.mockReset()
})

describe("fetchEventWizardReviewSummary", () => {
  it("ReadsBothAdvancedPoliciesFromAPascalCasePayload", async () => {
    getMock.mockResolvedValue({
      data: {
        Name: "Summit",
        Visibility: "Public",
        PurchaseTimeLimit: 15,
        ApplyPaymentMethodCharges: true,
        BlockEntryUntilPaid: true,
      },
    })

    const summary = await fetchEventWizardReviewSummary(EVENT_ID)

    expect(summary.applyPaymentMethodCharges).toBe(true)
    expect(summary.blockEntryUntilPaid).toBe(true)
  })

  it("ReadsBothAdvancedPoliciesFromACamelCasePayload", async () => {
    getMock.mockResolvedValue({
      data: { name: "Summit", visibility: "Public", applyPaymentMethodCharges: true, blockEntryUntilPaid: true },
    })

    const summary = await fetchEventWizardReviewSummary(EVENT_ID)

    expect(summary.applyPaymentMethodCharges).toBe(true)
    expect(summary.blockEntryUntilPaid).toBe(true)
  })

  /** A server that has not shipped the fields yet must read as the safe default, not as an enabled policy. */
  it("TreatsMissingAdvancedPoliciesAsOff", async () => {
    getMock.mockResolvedValue({ data: { name: "Summit", visibility: "Public" } })

    const summary = await fetchEventWizardReviewSummary(EVENT_ID)

    expect(summary.applyPaymentMethodCharges).toBe(false)
    expect(summary.blockEntryUntilPaid).toBe(false)
  })

  it("RejectsAResponseWhoseDoorPolicyIsNotABoolean", async () => {
    getMock.mockResolvedValue({ data: { name: "Summit", blockEntryUntilPaid: "yes" } })

    await expect(fetchEventWizardReviewSummary(EVENT_ID)).rejects.toThrow()
  })
})
