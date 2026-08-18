import { beforeEach, describe, expect, it, vi } from "vitest"
import { fetchEventWizardAdvancedSettings, updateEventWizardAdvancedSettings } from "./events"

const { getMock, postMock } = vi.hoisted(() => ({ getMock: vi.fn(), postMock: vi.fn() }))

vi.mock("./client", () => ({ client: { get: getMock, post: postMock } }))

const EVENT_ID = "event-1"

beforeEach(() => {
  getMock.mockReset()
  postMock.mockReset()
})

describe("fetchEventWizardAdvancedSettings", () => {
  it("reads the payment method charge opt-in from a PascalCase payload", async () => {
    getMock.mockResolvedValue({
      data: {
        PurchaseTimeLimit: 15,
        Visibility: "Public",
        ChargeRuleUniqueIds: [],
        ApplyPaymentMethodCharges: true,
      },
    })

    const settings = await fetchEventWizardAdvancedSettings(EVENT_ID)

    expect(settings.applyPaymentMethodCharges).toBe(true)
  })

  it("treats a response without the opt-in as off so no buyer is quoted an unagreed fee", async () => {
    getMock.mockResolvedValue({ data: { purchaseTimeLimit: 15, visibility: "Public" } })

    const settings = await fetchEventWizardAdvancedSettings(EVENT_ID)

    expect(settings.applyPaymentMethodCharges).toBe(false)
  })
})

describe("updateEventWizardAdvancedSettings", () => {
  it("sends the opt-in with the step payload", async () => {
    postMock.mockResolvedValue({ data: { purchaseTimeLimit: 20, visibility: "Public", applyPaymentMethodCharges: true } })

    const result = await updateEventWizardAdvancedSettings(EVENT_ID, {
      purchaseTimeLimit: 20,
      visibility: "Public",
      chargeRuleUniqueIds: [],
      applyPaymentMethodCharges: true,
      blockEntryUntilPaid: false,
    })

    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining("advanced-settings"),
      expect.objectContaining({ applyPaymentMethodCharges: true }),
      { params: { stepNo: 14 } },
    )
    expect(result.applyPaymentMethodCharges).toBe(true)
  })

  it("rejects a response whose opt-in is not a boolean", async () => {
    postMock.mockResolvedValue({ data: { purchaseTimeLimit: 20, visibility: "Public", applyPaymentMethodCharges: "yes" } })

    await expect(
      updateEventWizardAdvancedSettings(EVENT_ID, {
        purchaseTimeLimit: 20,
        visibility: "Public",
        chargeRuleUniqueIds: [],
        applyPaymentMethodCharges: true,
        blockEntryUntilPaid: false,
      }),
    ).rejects.toThrow()
  })

  it("SendsTheUnpaidEntryPolicyWithTheStepPayload", async () => {
    postMock.mockResolvedValue({
      data: { purchaseTimeLimit: 20, visibility: "Public", applyPaymentMethodCharges: false, blockEntryUntilPaid: true },
    })

    const result = await updateEventWizardAdvancedSettings(EVENT_ID, {
      purchaseTimeLimit: 20,
      visibility: "Public",
      chargeRuleUniqueIds: [],
      applyPaymentMethodCharges: false,
      blockEntryUntilPaid: true,
    })

    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining("advanced-settings"),
      expect.objectContaining({ blockEntryUntilPaid: true }),
      { params: { stepNo: 14 } },
    )
    expect(result.blockEntryUntilPaid).toBe(true)
  })
})
