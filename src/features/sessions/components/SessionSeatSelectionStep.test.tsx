import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { system } from "@/theme"
import { SessionWizardActionsProvider, useSessionWizardActions } from "../hooks/useSessionWizardActions"
import { SessionWizardPreviewProvider } from "../hooks/useSessionWizardPreview"
import { SessionWizardPreviewPanel } from "./SessionWizardPreviewPanel"
import { SessionSeatSelectionStep } from "./SessionSeatSelectionStep"

const {
  fetchOrganizerVenuesMock,
  fetchSessionWizardNameMock,
  fetchSessionWizardVenueMock,
  fetchSessionWizardSeatSelectionMock,
  fetchSeatsIoVenueChartsMock,
  fetchSeatsIoChartEventsMock,
} = vi.hoisted(() => ({
  fetchOrganizerVenuesMock: vi.fn(),
  fetchSessionWizardNameMock: vi.fn(),
  fetchSessionWizardVenueMock: vi.fn(),
  fetchSessionWizardSeatSelectionMock: vi.fn(),
  fetchSeatsIoVenueChartsMock: vi.fn(),
  fetchSeatsIoChartEventsMock: vi.fn(),
}))

vi.mock("@/api/organizer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/organizer")>()
  return { ...actual, fetchOrganizerVenues: fetchOrganizerVenuesMock }
})

vi.mock("@/api/sessions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/sessions")>()
  return {
    ...actual,
    fetchSessionWizardName: fetchSessionWizardNameMock,
    fetchSessionWizardVenue: fetchSessionWizardVenueMock,
    fetchSessionWizardSeatSelection: fetchSessionWizardSeatSelectionMock,
  }
})

vi.mock("@/api/seatsio", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/seatsio")>()
  return {
    ...actual,
    fetchSeatsIoVenueCharts: fetchSeatsIoVenueChartsMock,
    fetchSeatsIoChartEvents: fetchSeatsIoChartEventsMock,
  }
})

const SESSION_ID = "session-1"
const VENUE_UNIQUE_ID = "venue-1"
const GROUND_FLOOR_ID = "chart-ground-floor"
const GROUND_FLOOR_NAME = "Ground Floor"
const GALLERY_ID = "chart-gallery"
const GALLERY_NAME = "Gallery"
const SAVED_EVENT_ID = "seatsio-event-1"
const GROUND_FLOOR_THUMBNAIL = "https://cdn.seatsio.net/charts/ground-floor.png"

/** A chart as the venue chart list returns it, published or not. */
function chart(overrides: {
  uniqueId: string
  name: string
  thumbnailUrl: string | null
  previewUrl: string | null
}) {
  return {
    id: 1,
    venueUniqueId: VENUE_UNIQUE_ID,
    venueName: "Royal Hall",
    seatsIoChartKey: "chart-key",
    ...overrides,
  }
}

/**
 * Mounts the step beside the wizard's preview panel, the way the wizard does. The step names the layout and the panel
 * pictures it, so neither half proves on its own that the organizer sees the right room.
 */
function renderStep({ withCachedSeatSelection = false } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  if (withCachedSeatSelection) {
    queryClient.setQueryData(["sessions", { sessionId: SESSION_ID, step: "seat-selection" }], {
      offerPickingSeats: true,
      seatsIoEventUniqueId: SAVED_EVENT_ID,
      seatsIoChartUniqueId: GROUND_FLOOR_ID,
      seatsIoChartName: GROUND_FLOOR_NAME,
      seatsIoEventLabel: "Opening Night",
    })
  }

  render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <SessionWizardActionsProvider>
          <SessionWizardPreviewProvider>
            <SessionSeatSelectionStep sessionId={SESSION_ID} />
            <SessionWizardPreviewPanel />
            <PrimaryActionProbe />
          </SessionWizardPreviewProvider>
        </SessionWizardActionsProvider>
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

/**
 * Reports the state the wizard's Save button reads. The button lives in the wizard layout, so the step's effect on it
 * is otherwise invisible to a test that mounts the step alone.
 */
function PrimaryActionProbe() {
  const { isPrimaryActionReady } = useSessionWizardActions()

  return <span data-testid="primary-action-state">{isPrimaryActionReady ? "ready" : "busy"}</span>
}

/** The control the session layout is chosen from, named by the label sitting above it. */
function chartPicker() {
  return screen.getAllByRole("combobox")[0]
}

/** Opens the chart list and picks the named chart, the way an organizer changes the layout of a session. */
async function selectChart(name: string) {
  await userEvent.click(await screen.findByText("Select chart"))
  await userEvent.click(await screen.findByRole("option", { name: new RegExp(name, "i") }))
}

describe("SessionSeatSelectionStep chart preview", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchOrganizerVenuesMock.mockResolvedValue([{ uniqueId: VENUE_UNIQUE_ID, name: "Royal Hall" }])
    fetchSessionWizardNameMock.mockResolvedValue({ name: "Opening Night" })
    fetchSessionWizardVenueMock.mockResolvedValue({ venueUniqueId: VENUE_UNIQUE_ID, venueName: "Royal Hall" })
    fetchSessionWizardSeatSelectionMock.mockResolvedValue({
      offerPickingSeats: true,
      seatsIoEventUniqueId: null,
      seatsIoChartUniqueId: null,
      seatsIoChartName: null,
      seatsIoEventLabel: null,
    })
    fetchSeatsIoChartEventsMock.mockResolvedValue([])
    fetchSeatsIoVenueChartsMock.mockResolvedValue([
      chart({
        uniqueId: GROUND_FLOOR_ID,
        name: GROUND_FLOOR_NAME,
        thumbnailUrl: GROUND_FLOOR_THUMBNAIL,
        previewUrl: "https://app.seats.io/preview/ground-floor",
      }),
      chart({
        uniqueId: GALLERY_ID,
        name: GALLERY_NAME,
        thumbnailUrl: null,
        previewUrl: null,
      }),
    ])
  })

  /**
   * Chart names alone do not say which room they draw, so an organizer picking between them is guessing. The picture
   * of the chart they chose is what confirms the session was pointed at the right layout before tickets are sized
   * against it.
   */
  it("shows the picture of the chart the organizer picked", async () => {
    renderStep()

    await selectChart(GROUND_FLOOR_NAME)

    const preview = await screen.findByAltText(`Seating layout preview for ${GROUND_FLOOR_NAME}`)
    expect(preview).toHaveAttribute("src", GROUND_FLOOR_THUMBNAIL)
  })

  /**
   * The preview belongs to whichever chart is selected now. A picture left behind from the previous choice would
   * confirm a layout the session no longer points at.
   */
  it("replaces the picture when the chart is changed", async () => {
    renderStep()

    await selectChart(GROUND_FLOOR_NAME)
    await screen.findByAltText(`Seating layout preview for ${GROUND_FLOOR_NAME}`)

    await userEvent.click(chartPicker())
    await userEvent.click(await screen.findByRole("option", { name: new RegExp(GALLERY_NAME, "i") }))

    expect(await screen.findByText("Not published yet")).toBeInTheDocument()
    expect(screen.queryByAltText(`Seating layout preview for ${GROUND_FLOOR_NAME}`)).not.toBeInTheDocument()
  })

  /**
   * Seats.io renders a picture only for a published chart. A blank space there reads as a broken image, so the
   * absence is named and the organizer is told publishing is what produces one.
   */
  it("says the chart is unpublished rather than leaving an empty space", async () => {
    renderStep()

    await selectChart(GALLERY_NAME)

    expect(await screen.findByText("Not published yet")).toBeInTheDocument()
  })

  /** With no chart chosen there is nothing to picture, and a placeholder would suggest a choice had been made. */
  it("shows no preview until a chart is chosen", async () => {
    renderStep()

    await screen.findByText("Select chart")

    expect(screen.queryByText("Not published yet")).not.toBeInTheDocument()
    expect(screen.queryByAltText(`Seating layout preview for ${GROUND_FLOOR_NAME}`)).not.toBeInTheDocument()
  })

  /**
   * A step revisited inside the same wizard answers from the cache, so nothing arrives on the wire and the saved
   * answer is already present on the first render. Missing it leaves the organizer looking at an empty step that
   * contradicts what they saved a moment ago.
   */
  it("restores the saved answer when the step is revisited from the cache", async () => {
    renderStep({ withCachedSeatSelection: true })

    expect(await screen.findByAltText(`Seating layout preview for ${GROUND_FLOOR_NAME}`)).toBeInTheDocument()
  })

  /**
   * The wizard's Save button reads its pending state from the step. A step that never finishes hydrating leaves that
   * button disabled and spinning "Saving...", so the organizer cannot move on and nothing explains why.
   */
  it("hands the wizard a usable Save button when revisited from the cache", async () => {
    renderStep({ withCachedSeatSelection: true })

    expect(await screen.findByAltText(`Seating layout preview for ${GROUND_FLOOR_NAME}`)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId("primary-action-state")).toHaveTextContent("ready"))
  })

  /**
   * The Seats.io event key is an internal identifier the organizer never types, quotes or acts on. Printed under the
   * event name it reads as something they must understand, and pushes the name they do recognise off the row.
   */
  it("names an event without printing its Seats.io key", async () => {
    fetchSeatsIoChartEventsMock.mockResolvedValue([
      {
        uniqueId: SAVED_EVENT_ID,
        label: "CME 2026",
        seatsIoEventKey: "session-1ac62399e7634b7ead580c6aad72ebce-2365a22a1c9b4a41a9854797945c54a7",
      },
    ])
    renderStep({ withCachedSeatSelection: true })

    expect(await screen.findAllByText("CME 2026")).not.toHaveLength(0)
    expect(screen.queryByText(/^session-[0-9a-f]/)).not.toBeInTheDocument()
  })
})
