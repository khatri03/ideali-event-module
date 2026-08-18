import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { system } from "@/theme"
import type { SessionWizardETicketing } from "@/api/sessions"
import { SessionWizardActionsProvider, useSessionWizardActions } from "../hooks/useSessionWizardActions"
import { SessionETicketingStep } from "./SessionETicketingStep"

const { fetchSessionWizardETicketingMock, updateSessionWizardETicketingMock } = vi.hoisted(() => ({
  fetchSessionWizardETicketingMock: vi.fn(),
  updateSessionWizardETicketingMock: vi.fn(),
}))

vi.mock("@/api/sessions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/sessions")>()
  return {
    ...actual,
    fetchSessionWizardETicketing: fetchSessionWizardETicketingMock,
    updateSessionWizardETicketing: updateSessionWizardETicketingMock,
  }
})

const SESSION_ID = "session-1"

function ticketing(overrides: Partial<SessionWizardETicketing> = {}): SessionWizardETicketing {
  return {
    enableDigitalTicket: true,
    requiresAttendeeInfo: true,
    checkInOpensBeforeMinutes: null,
    checkInClosesAfterMinutes: null,
    ...overrides,
  }
}

/** The wizard footer button lives outside the step, so the test drives the action the step registers. */
function SaveButton() {
  const { runPrimaryAction, isPrimaryActionReady } = useSessionWizardActions()

  return (
    <button type="button" disabled={!isPrimaryActionReady} onClick={() => void runPrimaryAction()}>
      Save
    </button>
  )
}

function renderStep() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

  render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <SessionWizardActionsProvider>
          <SessionETicketingStep sessionId={SESSION_ID} />
          <SaveButton />
        </SessionWizardActionsProvider>
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

async function saveButton() {
  return screen.findByRole("button", { name: "Save" })
}

describe("SessionETicketingStep", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchSessionWizardETicketingMock.mockResolvedValue(ticketing())
    updateSessionWizardETicketingMock.mockImplementation((_id: string, payload: SessionWizardETicketing) =>
      Promise.resolve(payload),
    )
  })

  it("ShowsAnUnsetCheckInWindowAsUsingThePlatformDefault", async () => {
    renderStep()

    expect(await screen.findByLabelText("Opens before start")).toHaveValue("default")
    expect(screen.getByLabelText("Closes after end")).toHaveValue("default")
    expect(screen.getByRole("option", { name: "Platform default (2 hours)" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Platform default (3 hours)" })).toBeInTheDocument()
  })

  it("ShowsTheWindowTheSessionAlreadyDeclared", async () => {
    fetchSessionWizardETicketingMock.mockResolvedValue(
      ticketing({ checkInOpensBeforeMinutes: 480, checkInClosesAfterMinutes: 60 }),
    )

    renderStep()

    expect(await screen.findByLabelText("Opens before start")).toHaveValue("480")
    expect(screen.getByLabelText("Closes after end")).toHaveValue("60")
  })

  /** A value no preset covers still has to come back readable rather than snapping to the first option. */
  it("ShowsAnOffPresetWindowInTheCustomField", async () => {
    fetchSessionWizardETicketingMock.mockResolvedValue(ticketing({ checkInOpensBeforeMinutes: 45 }))

    renderStep()

    expect(await screen.findByLabelText("Opens before start")).toHaveValue("custom")
    expect(screen.getByLabelText("Opens before start in minutes")).toHaveValue(45)
  })

  it("OffersTheWholeRangeOfRoundWindowsWithoutTyping", async () => {
    renderStep()

    await screen.findByLabelText("Opens before start")

    expect(screen.getAllByRole("option", { name: "8 hours" })).toHaveLength(1)
    expect(screen.getAllByRole("option", { name: "1 day" })).toHaveLength(2)
  })

  /** A thousand-seat hall must be able to open its doors hours before a hundred-seat room does. */
  it("SavesAWiderDoorWindowForABusierSession", async () => {
    renderStep()

    await userEvent.selectOptions(await screen.findByLabelText("Opens before start"), "480")
    await userEvent.click(await saveButton())

    await waitFor(() =>
      expect(updateSessionWizardETicketingMock).toHaveBeenCalledWith(
        SESSION_ID,
        expect.objectContaining({ checkInOpensBeforeMinutes: 480, checkInClosesAfterMinutes: null }),
      ),
    )
  })

  it("SendsThePlatformDefaultBackWhenTheSessionGivesUpItsOwnWindow", async () => {
    fetchSessionWizardETicketingMock.mockResolvedValue(ticketing({ checkInOpensBeforeMinutes: 480 }))

    renderStep()

    await userEvent.selectOptions(await screen.findByLabelText("Opens before start"), "default")
    await userEvent.click(await saveButton())

    await waitFor(() =>
      expect(updateSessionWizardETicketingMock).toHaveBeenCalledWith(
        SESSION_ID,
        expect.objectContaining({ checkInOpensBeforeMinutes: null }),
      ),
    )
  })

  it("SavesAWindowNoPresetCovers", async () => {
    renderStep()

    await userEvent.selectOptions(await screen.findByLabelText("Closes after end"), "custom")
    await userEvent.type(screen.getByLabelText("Closes after end in minutes"), "45")
    await userEvent.click(await saveButton())

    await waitFor(() =>
      expect(updateSessionWizardETicketingMock).toHaveBeenCalledWith(
        SESSION_ID,
        expect.objectContaining({ checkInClosesAfterMinutes: 45 }),
      ),
    )
  })

  it("RefusesToSaveACustomWindowLongerThanAWeek", async () => {
    renderStep()

    await userEvent.selectOptions(await screen.findByLabelText("Closes after end"), "custom")
    await userEvent.type(screen.getByLabelText("Closes after end in minutes"), "10081")

    expect(await screen.findByText(/Enter a whole number between 0 and 10080 minutes\./)).toBeInTheDocument()
    expect(await saveButton()).toBeDisabled()
    expect(updateSessionWizardETicketingMock).not.toHaveBeenCalled()
  })

  it("RefusesToSaveANegativeCustomWindow", async () => {
    renderStep()

    await userEvent.selectOptions(await screen.findByLabelText("Opens before start"), "custom")
    await userEvent.type(screen.getByLabelText("Opens before start in minutes"), "-5")

    expect(await screen.findByText(/Enter a whole number between 0 and 10080 minutes\./)).toBeInTheDocument()
    expect(await saveButton()).toBeDisabled()
    expect(updateSessionWizardETicketingMock).not.toHaveBeenCalled()
  })

  it("KeepsSavingPossibleWhenTheWindowIsCorrectedBack", async () => {
    renderStep()

    await userEvent.selectOptions(await screen.findByLabelText("Opens before start"), "custom")
    const minutesField = screen.getByLabelText("Opens before start in minutes")
    await userEvent.type(minutesField, "-5")
    await userEvent.clear(minutesField)
    await userEvent.type(minutesField, "45")

    await waitFor(async () => expect(await saveButton()).toBeEnabled())
  })
})
