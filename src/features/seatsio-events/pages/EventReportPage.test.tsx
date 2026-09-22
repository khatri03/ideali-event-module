import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { system } from "@/theme"
import { EventReportPage } from "./EventReportPage"

const { renderContextMock } = vi.hoisted(() => ({ renderContextMock: vi.fn() }))

vi.mock("@/api/seatsio", () => ({ fetchSeatsIoEventRenderContext: renderContextMock }))

vi.mock("../components/EventReportTabs", () => ({
  EventReportTabs: () => <div>report tabs</div>,
}))

const EVENT_UNIQUE_ID = "7a6c857d-ca04-4abe-a812-895496c8bea9"

function renderPage(state?: { eventLabel?: string; chartUniqueId?: string }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[{ pathname: `/organizer/seatsio/events/${EVENT_UNIQUE_ID}`, state }]}>
          <Routes>
            <Route path="/organizer/seatsio/events/:eventUniqueId" element={<EventReportPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

describe("EventReportPage header", () => {
  beforeEach(() => {
    renderContextMock.mockReset()
  })

  /**
   * On a direct link or refresh there is no router state, so the header must name the event and its layout from the
   * server. Without this the organizer cannot tell which event, or which seating layout, they are looking at.
   */
  it("names the event and its layout from the render context when opened without router state", async () => {
    renderContextMock.mockResolvedValue({
      eventKey: "ek",
      publicKey: "pk",
      region: "eu",
      eventLabel: "Friday Dinner & Entertainment 2026",
      chartName: "Main Banquet Hall",
      sessionName: "",
    })

    renderPage()

    expect(await screen.findByText("Friday Dinner & Entertainment 2026")).toBeInTheDocument()
    expect(await screen.findByText(/Main Banquet Hall/)).toBeInTheDocument()
  })

  /**
   * Two events can share one chart, so the header names the bound Ideali session — with its start date — to tell them
   * apart. A same-named session on a different date is a different event, so the date must ride with the name.
   */
  it("names the bound session with its start date from the render context", async () => {
    renderContextMock.mockResolvedValue({
      eventKey: "ek",
      publicKey: "pk",
      region: "eu",
      eventLabel: "Friday Dinner & Entertainment 2026",
      chartName: "Main Banquet Hall",
      venueName: "PC Hotel",
      sessionName: "Saturday Matinee",
      sessionStartUtc: "2026-03-21T12:00:00Z",
      sessionStatus: "published",
    })

    renderPage()

    expect(await screen.findByText("Session:")).toBeInTheDocument()
    expect(await screen.findByText(/Saturday Matinee · Sat 21 Mar 2026/)).toBeInTheDocument()
  })

  /** The venue the chart belongs to is named as its own labelled fact, separate from the chart, so neither is guessed. */
  it("names the venue and chart as separate facts", async () => {
    renderContextMock.mockResolvedValue({
      eventKey: "ek",
      publicKey: "pk",
      region: "eu",
      eventLabel: "Friday Dinner & Entertainment 2026",
      chartName: "Court Room",
      venueName: "PC Hotel",
      sessionName: "",
    })

    renderPage()

    expect(await screen.findByText("Venue:")).toBeInTheDocument()
    expect(await screen.findByText("PC Hotel")).toBeInTheDocument()
    expect(await screen.findByText("Chart:")).toBeInTheDocument()
    expect(await screen.findByText("Court Room")).toBeInTheDocument()
  })

  /** The session lifecycle status shows as a badge beside the title, so the organizer sees the event's state at a glance. */
  it("shows the session status as a badge", async () => {
    renderContextMock.mockResolvedValue({
      eventKey: "ek",
      publicKey: "pk",
      region: "eu",
      eventLabel: "Friday Dinner & Entertainment 2026",
      chartName: "Court Room",
      sessionName: "Saturday Matinee",
      sessionStatus: "published",
    })

    renderPage()

    expect(await screen.findByText("Published")).toBeInTheDocument()
  })

  /** An unknown or empty status must not render a badge, so a session with no mapped state shows no stray chip. */
  it("shows no status badge for an unmapped status", async () => {
    renderContextMock.mockResolvedValue({
      eventKey: "ek",
      publicKey: "pk",
      region: "eu",
      eventLabel: "Friday Dinner & Entertainment 2026",
      chartName: "Court Room",
      sessionName: "Saturday Matinee",
      sessionStatus: "unknown",
    })

    renderPage()

    expect(await screen.findByText("Saturday Matinee")).toBeInTheDocument()
    expect(screen.queryByText("Published")).not.toBeInTheDocument()
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument()
  })

  /** With no session bound the header simply omits the session line rather than printing an empty "Session:" label. */
  it("omits the session line when no session is bound", async () => {
    renderContextMock.mockResolvedValue({
      eventKey: "ek",
      publicKey: "pk",
      region: "eu",
      eventLabel: "Friday Dinner & Entertainment 2026",
      chartName: "Main Banquet Hall",
      sessionName: "",
    })

    renderPage()

    expect(await screen.findByText(/Main Banquet Hall/)).toBeInTheDocument()
    expect(screen.queryByText("Session:")).not.toBeInTheDocument()
  })

  /** The label passed via navigation shows immediately, so the header is never blank while the render context loads. */
  it("falls back to the label carried in router state", async () => {
    renderContextMock.mockResolvedValue({ eventKey: "", publicKey: "", region: "", eventLabel: "", chartName: "" })

    renderPage({ eventLabel: "Saturday Gala 2026" })

    expect(await screen.findByText("Saturday Gala 2026")).toBeInTheDocument()
  })
})
