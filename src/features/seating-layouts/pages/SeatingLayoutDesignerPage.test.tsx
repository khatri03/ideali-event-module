import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { system } from "@/theme"
import { SeatingLayoutDesignerPage } from "./SeatingLayoutDesignerPage"

const CHART_UNIQUE_ID = "7a6c857d-ca04-4abe-a812-895496c8bea9"
const CHART_KEY = "90be2528-9292-4337-86d9-5ef4a64b7980"

const seatsIoApi = vi.hoisted(() => ({
  fetchSeatsIoSeatingLayoutDetail: vi.fn(),
  fetchSeatsIoChartCategories: vi.fn(),
  createSeatsIoWorkspace: vi.fn(),
  saveSeatsIoSeatingLayout: vi.fn(),
}))

/** Counts how many times the designer has been mounted, so a remount is distinguishable from a re-render. */
const designer = vi.hoisted(() => ({ mountCount: 0 }))

vi.mock("@/api/seatsio", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/seatsio")>()
  return { ...actual, ...seatsIoApi }
})

vi.mock("@/api/organizer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/organizer")>()
  return { ...actual, fetchOrganizerVenues: vi.fn().mockResolvedValue([]) }
})

vi.mock("@seatsio/seatsio-react", async () => {
  const { useEffect } = await import("react")

  return {
    SeatsioDesigner: () => {
      useEffect(() => {
        designer.mountCount += 1
      }, [])

      return <div data-testid="seatsio-designer" />
    },
  }
})

/**
 * Renders the designer at a route, mirroring how the router mounts it: a layout id in the path is
 * the only signal the page gets that it is editing rather than creating.
 */
function renderAt(path: string, { withCachedDetail = false } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  if (withCachedDetail) {
    queryClient.setQueryData(["seatsio", "seating-layout-detail", { chartUniqueId: CHART_UNIQUE_ID }], {
      uniqueId: CHART_UNIQUE_ID,
      venueUniqueId: null,
      name: "E2E Phase7 Verification Hall",
      seatsIoChartKey: CHART_KEY,
      categories: [],
    })
  }

  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/organizer/seatsio/seating-layouts/new" element={<SeatingLayoutDesignerPage />} />
            <Route
              path="/organizer/seatsio/seating-layouts/:chartUniqueId"
              element={<SeatingLayoutDesignerPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

describe("SeatingLayoutDesignerPage", () => {
  beforeEach(() => {
    seatsIoApi.fetchSeatsIoSeatingLayoutDetail.mockReset().mockResolvedValue({
      uniqueId: CHART_UNIQUE_ID,
      venueUniqueId: null,
      name: "E2E Phase7 Verification Hall",
      seatsIoChartKey: CHART_KEY,
      categories: [],
    })
    seatsIoApi.fetchSeatsIoChartCategories.mockReset().mockResolvedValue([])
    seatsIoApi.createSeatsIoWorkspace.mockReset().mockResolvedValue({
      secretKey: "workspace-secret",
      designerKey: "workspace-designer",
      region: "eu",
    })
    seatsIoApi.saveSeatsIoSeatingLayout.mockReset().mockResolvedValue({
      uniqueId: CHART_UNIQUE_ID,
      venueUniqueId: null,
      name: "E2E Phase7 Verification Hall",
      seatsIoChartKey: CHART_KEY,
      categories: [],
    })
    designer.mountCount = 0
  })

  /**
   * A saved layout opened straight from its own URL is editable. The page only ever learns it is
   * editing from the route, so a layout reached by reload, bookmark or the list's Edit action would
   * otherwise present the empty create form and offer to make a second chart.
   */
  it("opens an existing layout in edit mode when loaded directly from its route", async () => {
    renderAt(`/organizer/seatsio/seating-layouts/${CHART_UNIQUE_ID}`)

    expect(await screen.findByRole("button", { name: "Save details" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Create chart layout" })).not.toBeInTheDocument()
  })

  /**
   * Edit mode is what unlocks the chart's categories, so opening a saved layout has to surface them
   * rather than the first-save placeholder that stands in before a chart exists.
   */
  it("shows the chart categories of an existing layout loaded directly from its route", async () => {
    renderAt(`/organizer/seatsio/seating-layouts/${CHART_UNIQUE_ID}`)

    expect(await screen.findByText("Chart categories")).toBeInTheDocument()
    expect(screen.queryByText("Chart designer will open after the first save")).not.toBeInTheDocument()
  })

  /**
   * The designer needs workspace credentials, which are requested only in edit mode. A layout that
   * stayed in create mode would render a page with no designer and no error explaining why.
   */
  it("requests Seats.io designer credentials for an existing layout loaded directly from its route", async () => {
    renderAt(`/organizer/seatsio/seating-layouts/${CHART_UNIQUE_ID}`)

    await waitFor(() => expect(seatsIoApi.createSeatsIoWorkspace).toHaveBeenCalledTimes(1))
  })

  /**
   * The create route still creates. Deriving the mode from the route must not turn the new-layout
   * page into an editor for a layout that does not exist yet.
   */
  it("opens the create form when no layout id is in the route", async () => {
    renderAt("/organizer/seatsio/seating-layouts/new")

    expect(await screen.findByRole("button", { name: "Create chart layout" })).toBeInTheDocument()
    expect(seatsIoApi.fetchSeatsIoSeatingLayoutDetail).not.toHaveBeenCalled()
    expect(seatsIoApi.createSeatsIoWorkspace).not.toHaveBeenCalled()
  })
  /**
   * The page names the job it is doing. An editor headed "Create seating layout" reads as a second
   * layout about to be made, which is the opposite of what the screen does.
   */
  it("heads an existing layout as an edit rather than a creation", async () => {
    renderAt(`/organizer/seatsio/seating-layouts/${CHART_UNIQUE_ID}`)

    expect(await screen.findByRole("heading", { name: "Edit seating layout" })).toBeInTheDocument()
  })

  /**
   * A layout opened a second time answers from the cache, so no request is made and the answer is
   * already present on the first render. The page has to read it then, or reopening a layout leaves
   * an empty name, an unsavable form and a designer that never appears — with nothing on the wire to
   * explain it.
   */
  it("opens a layout whose details were already loaded once", async () => {
    renderAt(`/organizer/seatsio/seating-layouts/${CHART_UNIQUE_ID}`, { withCachedDetail: true })

    expect(await screen.findByDisplayValue("E2E Phase7 Verification Hall")).toBeInTheDocument()
    expect(await screen.findByTestId("seatsio-designer")).toBeInTheDocument()
  })

  /**
   * Saving the name and venue leaves the designer alone. The drawing lives in the designer and is
   * saved from its own toolbar, so tearing the designer down on an unrelated save blanks the canvas
   * and takes any drawing that has not been saved there with it.
   */
  it("keeps the designer mounted when only the layout details are saved", async () => {
    const user = userEvent.setup()
    renderAt(`/organizer/seatsio/seating-layouts/${CHART_UNIQUE_ID}`)

    await screen.findByTestId("seatsio-designer")
    await waitFor(() => expect(designer.mountCount).toBe(1))

    await user.click(screen.getByRole("button", { name: "Save details" }))

    await waitFor(() => expect(seatsIoApi.saveSeatsIoSeatingLayout).toHaveBeenCalledTimes(1))
    expect(designer.mountCount).toBe(1)
  })
})
