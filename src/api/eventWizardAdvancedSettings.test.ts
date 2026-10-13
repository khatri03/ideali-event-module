import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  fetchEventWizardAdvancedSettings,
  fetchEventWizardVisibilityOptions,
  updateEventWizardAdvancedSettings,
} from "./events"

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

describe("fetchEventWizardVisibilityOptions", () => {
  /**
   * The organizer-only choice must survive response validation, otherwise the whole advanced
   * settings step fails to load as soon as the backend offers it.
   */
  it("OffersTheOrganizerOnlyChoice", async () => {
    getMock.mockResolvedValue({
      data: [
        { value: "Public", label: "Public", description: "Anyone can view and register for the event." },
        { value: "Organizer", label: "Organizer Only", description: "Only the organizer can view and register for the event." },
      ],
    })

    const options = await fetchEventWizardVisibilityOptions()

    expect(options.map((option) => option.value)).toEqual(["Public", "Organizer"])
    expect(options[1].label).toBe("Organizer Only")
  })

  /**
   * A value the app does not know must be rejected at the boundary rather than rendered as a
   * choice the organizer could save and the backend would refuse.
   */
  it("RejectsAnUnknownVisibilityValue", async () => {
    getMock.mockResolvedValue({
      data: [{ value: "Everyone", label: "Everyone", description: "Not a real choice." }],
    })

    await expect(fetchEventWizardVisibilityOptions()).rejects.toThrow()
  })
})

describe("updateEventWizardAdvancedSettings", () => {
  /**
   * Saving organizer-only visibility must round-trip, so reopening the step shows the choice the
   * organizer saved instead of failing validation.
   */
  it("SavesTheOrganizerOnlyVisibility", async () => {
    postMock.mockResolvedValue({
      data: { purchaseTimeLimit: 20, visibility: "Organizer", applyPaymentMethodCharges: false },
    })

    const result = await updateEventWizardAdvancedSettings(EVENT_ID, {
      purchaseTimeLimit: 20,
      visibility: "Organizer",
      chargeRuleUniqueIds: [],
      applyPaymentMethodCharges: false,
      blockEntryUntilPaid: false,
    })

    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining("advanced-settings"),
      expect.objectContaining({ visibility: "Organizer" }),
      { params: { stepNo: 14 } },
    )
    expect(result.visibility).toBe("Organizer")
  })

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
