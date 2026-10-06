import { beforeEach, describe, expect, it, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AxiosError } from "axios"
import { toaster } from "@/lib/toaster"
import { API_ROUTES } from "@/utils/routes"
import { moduleListResponse, renderWithProviders } from "../testHarness"
import { CustomInvoicingModulesManager } from "./CustomInvoicingModulesManager"

const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock("@/api/client", () => ({ client: http }))
vi.mock("@/lib/toaster", () => ({ toaster: { create: vi.fn() } }))

type ModuleName = "Event" | "Membership" | "Donation"

let store: Record<ModuleName, boolean>

function serveStore() {
  http.get.mockImplementation(async () =>
    moduleListResponse(
      (Object.keys(store) as ModuleName[]).map((moduleType) => ({ moduleType, isEnabled: store[moduleType] })),
    ),
  )
}

function acceptSaves() {
  http.put.mockImplementation(async (url: string, body: { isEnabled: boolean }) => {
    const moduleType = url.split("/").pop() as ModuleName
    store = { ...store, [moduleType]: body.isEnabled }
    return {
      data: {
        success: true,
        message: `Custom invoicing turned ${body.isEnabled ? "on" : "off"} for ${moduleType}.`,
        data: { moduleType, isEnabled: body.isEnabled, updatedAtUtc: "2026-10-06T12:00:00Z", updatedByName: "Ayesha Khan" },
      },
    }
  })
}

function refusal(message: string): AxiosError {
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 400,
    statusText: "Bad Request",
    headers: {},
    // extractApiError reads only response.data, so the request config is irrelevant here.
    config: {} as never,
    data: { success: false, message },
  })
}

async function renderManager() {
  renderWithProviders(<CustomInvoicingModulesManager />)
  return screen.findByLabelText("Custom invoicing for Event")
}

function switchFor(name: string) {
  return screen.getByLabelText(`Custom invoicing for ${name}`)
}

async function flip(name: string) {
  await userEvent.click(switchFor(name), { pointerEventsCheck: 0 })
}

describe("CustomInvoicingModulesManager", () => {
  beforeEach(() => {
    http.get.mockReset()
    http.put.mockReset()
    vi.mocked(toaster.create).mockReset()
    store = { Event: true, Membership: false, Donation: false }
    serveStore()
    acceptSaves()
  })

  /** Turning a module on is harmless, so it saves at once and reports the server's own wording. */
  it("Manager_TurnOn_SavesImmediatelyAndToastsServerMessage", async () => {
    await renderManager()

    await flip("Membership")

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith({ type: "success", title: "Custom invoicing turned on for Membership." }),
    )
    expect(http.put).toHaveBeenCalledWith(API_ROUTES.adminCustomInvoicingModule("Membership"), { isEnabled: true })
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  /** Turning a module off asks first and names what stops and what keeps working. */
  it("Manager_TurnOff_OpensConfirmNamingConsequence", async () => {
    await renderManager()

    await flip("Event")

    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent("Turn off custom invoicing for Event?")
    expect(dialog).toHaveTextContent("will not be able to create new Event custom invoices")
    expect(dialog).toHaveTextContent("viewable, payable through their link and settleable")
    expect(http.put).not.toHaveBeenCalled()
  })

  /** Backing out of the confirm leaves the module on and sends nothing to the server. */
  it("Manager_TurnOffCancelled_StaysOnAndSendsNothing", async () => {
    await renderManager()
    await flip("Event")
    await screen.findByRole("alertdialog")

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }), { pointerEventsCheck: 0 })

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
    expect(switchFor("Event")).toBeChecked()
    expect(http.put).not.toHaveBeenCalled()
  })

  /** Confirming saves the off state and tells the admin it took effect. */
  it("Manager_TurnOffConfirmed_SavesAndToastsTurnedOff", async () => {
    await renderManager()
    await flip("Event")
    await screen.findByRole("alertdialog")

    await userEvent.click(screen.getByRole("button", { name: "Turn off" }), { pointerEventsCheck: 0 })

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith({ type: "success", title: "Custom invoicing turned off for Event." }),
    )
    expect(http.put).toHaveBeenCalledWith(API_ROUTES.adminCustomInvoicingModule("Event"), { isEnabled: false })
    await waitFor(() => expect(switchFor("Event")).not.toBeChecked())
  })

  /** A refused save must not leave the switch showing a state the server never accepted. */
  it("Manager_SaveFails_RevertsSwitchAndToastsError", async () => {
    http.put.mockRejectedValue(refusal("Custom invoicing cannot be turned on or off for this module."))
    await renderManager()

    await flip("Donation")

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith({
        type: "error",
        title: "Custom invoicing cannot be turned on or off for this module.",
      }),
    )
    await waitFor(() => expect(switchFor("Donation")).not.toBeChecked())
  })

  /** While a module is saving its switch is locked, so a second tap cannot race the first. */
  it("Manager_SavePending_DisablesThatRowSwitch", async () => {
    http.put.mockReturnValue(new Promise(() => {}))
    await renderManager()

    await flip("Membership")

    await waitFor(() => expect(switchFor("Membership")).toBeDisabled())
    expect(switchFor("Event")).not.toBeDisabled()
  })

  /** A module not offered yet can never reach the server, whatever the admin taps. */
  it("Manager_ComingSoonSwitch_NeverCallsApi", async () => {
    await renderManager()

    await flip("Auction")

    expect(switchFor("Auction")).toBeDisabled()
    expect(http.put).not.toHaveBeenCalled()
  })
})
