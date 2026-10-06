import { beforeEach, describe, expect, it, vi } from "vitest"
import { fetchCustomInvoicingModules, setCustomInvoicingModule } from "./adminCustomInvoicingModules"
import { ServiceResponseError } from "./serviceResponse"
import { API_ROUTES } from "@/utils/routes"

const { getMock, putMock } = vi.hoisted(() => ({ getMock: vi.fn(), putMock: vi.fn() }))

vi.mock("./client", () => ({ client: { get: getMock, put: putMock } }))

describe("adminCustomInvoicingModules", () => {
  beforeEach(() => {
    getMock.mockReset()
    putMock.mockReset()
  })

  /** The admin list is read from the service envelope and normalised, so a never-changed module reads null rather than undefined. */
  it("fetchCustomInvoicingModules_ParsesEnvelope_ReturnsStates", async () => {
    getMock.mockResolvedValue({
      data: {
        Success: true,
        Data: [
          { ModuleType: "Event", IsEnabled: true, UpdatedAtUtc: null, UpdatedByName: null },
          { ModuleType: "Membership", IsEnabled: false, UpdatedAtUtc: "2026-10-01T09:00:00Z", UpdatedByName: "Ayesha Khan" },
        ],
      },
    })

    const states = await fetchCustomInvoicingModules()

    expect(getMock).toHaveBeenCalledWith(API_ROUTES.adminCustomInvoicingModules)
    expect(states).toEqual([
      { moduleType: "Event", isEnabled: true, updatedAtUtc: null, updatedByName: null },
      { moduleType: "Membership", isEnabled: false, updatedAtUtc: "2026-10-01T09:00:00Z", updatedByName: "Ayesha Khan" },
    ])
  })

  /** A module the frontend does not know is refused at the boundary instead of rendering a row nobody can reason about. */
  it("fetchCustomInvoicingModules_UnknownModuleType_Throws", async () => {
    getMock.mockResolvedValue({
      data: { success: true, data: [{ moduleType: "Auction", isEnabled: true, updatedAtUtc: null, updatedByName: null }] },
    })

    await expect(fetchCustomInvoicingModules()).rejects.toThrow()
  })

  /** A toggle sends only the new state to the module's own URL and hands back the server's wording for the toast. */
  it("setCustomInvoicingModule_Success_ReturnsStateAndServerMessage", async () => {
    putMock.mockResolvedValue({
      data: {
        success: true,
        message: "Custom invoicing turned on for Membership.",
        data: { moduleType: "Membership", isEnabled: true, updatedAtUtc: "2026-10-06T10:00:00Z", updatedByName: "Ayesha Khan" },
      },
    })

    const result = await setCustomInvoicingModule("Membership", true)

    expect(putMock).toHaveBeenCalledWith(API_ROUTES.adminCustomInvoicingModule("Membership"), { isEnabled: true })
    expect(result).toEqual({
      state: { moduleType: "Membership", isEnabled: true, updatedAtUtc: "2026-10-06T10:00:00Z", updatedByName: "Ayesha Khan" },
      message: "Custom invoicing turned on for Membership.",
    })
  })

  /** A 200 that reports its own failure must surface the server's plain message, not pass as a save. */
  it("setCustomInvoicingModule_EnvelopeReportsFailure_ThrowsServerMessage", async () => {
    putMock.mockResolvedValue({
      data: { success: false, message: "Custom invoicing cannot be turned on or off for this module.", data: null },
    })

    await expect(setCustomInvoicingModule("Donation", true)).rejects.toEqual(
      new ServiceResponseError("Custom invoicing cannot be turned on or off for this module."),
    )
  })
})
