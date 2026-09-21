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
    })

    renderPage()

    expect(await screen.findByText("Friday Dinner & Entertainment 2026")).toBeInTheDocument()
    expect(await screen.findByText(/Main Banquet Hall/)).toBeInTheDocument()
  })

  /** The label passed via navigation shows immediately, so the header is never blank while the render context loads. */
  it("falls back to the label carried in router state", async () => {
    renderContextMock.mockResolvedValue({ eventKey: "", publicKey: "", region: "", eventLabel: "", chartName: "" })

    renderPage({ eventLabel: "Saturday Gala 2026" })

    expect(await screen.findByText("Saturday Gala 2026")).toBeInTheDocument()
  })
})
