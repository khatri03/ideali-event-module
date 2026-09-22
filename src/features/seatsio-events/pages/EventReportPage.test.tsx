import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { system } from "@/theme"
import { APP_ROUTES } from "@/utils/routes"
import { EventReportPage } from "./EventReportPage"

const { renderContextMock, summaryMock } = vi.hoisted(() => ({
  renderContextMock: vi.fn(),
  summaryMock: vi.fn(),
}))

vi.mock("@/api/seatsio", () => ({
  fetchSeatsIoEventRenderContext: renderContextMock,
  fetchSeatsIoEventSummary: summaryMock,
}))

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
    summaryMock.mockReset().mockResolvedValue({ totalObjects: 0, unavailableObjects: 0, availableObjects: 0, byStatus: [], byCategory: [] })
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

  /**
   * The venue, session and chart facts link out so the organizer jumps straight to the map, the session wizard or the
   * layout — each in a new tab, so following one never loses the open report.
   */
  it("links the venue, session and chart facts, each opening in a new tab", async () => {
    const sessionUniqueId = "11111111-1111-1111-1111-111111111111"
    const chartUniqueId = "22222222-2222-2222-2222-222222222222"
    renderContextMock.mockResolvedValue({
      eventKey: "ek",
      publicKey: "pk",
      region: "eu",
      eventLabel: "CME 2026",
      chartName: "Court Room",
      chartUniqueId,
      venueName: "PC Hotel",
      venueMapUrl: "https://maps.example/pc-hotel",
      sessionName: "Saturday Matinee",
      sessionUniqueId,
      sessionStatus: "published",
    })

    renderPage()

    const venue = await screen.findByRole("link", { name: "PC Hotel (opens in new tab)" })
    expect(venue).toHaveAttribute("href", "https://maps.example/pc-hotel")
    expect(venue).toHaveAttribute("target", "_blank")
    expect(venue).toHaveAttribute("rel", "noopener noreferrer")

    const session = screen.getByRole("link", { name: /Saturday Matinee/ })
    expect(session).toHaveAttribute("href", APP_ROUTES.sessionWizard.edit(sessionUniqueId))
    expect(session).toHaveAttribute("target", "_blank")

    const chart = screen.getByRole("link", { name: "Court Room (opens in new tab)" })
    expect(chart).toHaveAttribute("href", APP_ROUTES.seatingLayouts.edit(chartUniqueId))
    expect(chart).toHaveAttribute("target", "_blank")
  })

  /** A venue map URL that is not http(s) is never turned into a link, so a stored javascript: scheme cannot run. */
  it("does not link a venue whose map URL is not an http(s) address", async () => {
    renderContextMock.mockResolvedValue({
      eventKey: "ek",
      publicKey: "pk",
      region: "eu",
      eventLabel: "CME 2026",
      chartName: "Court Room",
      venueName: "PC Hotel",
      venueMapUrl: "javascript:alert(1)",
      sessionName: "",
    })

    renderPage()

    expect(await screen.findByText("PC Hotel")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /PC Hotel/ })).not.toBeInTheDocument()
  })

  /**
   * The booked-vs-available meter rides in the header hero, not inside a tab, so the "how full is this event" figure is
   * the first thing an organizer sees. Available is Seats.io's own figure, not total minus booked.
   */
  it("shows the booked progress meter in the header with Seats.io's available figure", async () => {
    renderContextMock.mockResolvedValue({
      eventKey: "ek",
      publicKey: "pk",
      region: "eu",
      eventLabel: "Friday Dinner & Entertainment 2026",
      chartName: "Court Room",
      sessionName: "",
    })
    summaryMock.mockResolvedValue({
      totalObjects: 40,
      unavailableObjects: 12,
      availableObjects: 25,
      byStatus: [{ key: "booked", label: "Booked", count: 12 }],
      byCategory: [],
    })

    renderPage()

    const bar = await screen.findByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", "12")
    expect(bar).toHaveAttribute("aria-valuemax", "40")
    expect(screen.getByText("12 booked · 25 available")).toBeInTheDocument()
  })

  /** With no objects on the event there is nothing to be booked, so the header omits the meter rather than showing 0 of 0. */
  it("omits the progress meter when the event has no objects", async () => {
    renderContextMock.mockResolvedValue({
      eventKey: "ek",
      publicKey: "pk",
      region: "eu",
      eventLabel: "Friday Dinner & Entertainment 2026",
      chartName: "Court Room",
      sessionName: "",
    })

    renderPage()

    expect(await screen.findByText("Friday Dinner & Entertainment 2026")).toBeInTheDocument()
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
  })
})
