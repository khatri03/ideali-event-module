import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { system } from "@/theme"
import { SessionWizardActionsProvider } from "../hooks/useSessionWizardActions"
import { SessionTicketStep } from "./SessionTicketStep"

const {
  fetchSessionWizardTicketsMock,
  fetchSessionWizardSeatSelectionMock,
  fetchSessionWizardBookingMock,
  fetchSeatsIoChartCategoriesMock,
  fetchSeatsIoChartCategoryCapacityMock,
} = vi.hoisted(() => ({
  fetchSessionWizardTicketsMock: vi.fn(),
  fetchSessionWizardSeatSelectionMock: vi.fn(),
  fetchSessionWizardBookingMock: vi.fn(),
  fetchSeatsIoChartCategoriesMock: vi.fn(),
  fetchSeatsIoChartCategoryCapacityMock: vi.fn(),
}))

vi.mock("@/api/sessions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/sessions")>()
  return {
    ...actual,
    fetchSessionWizardTickets: fetchSessionWizardTicketsMock,
    fetchSessionWizardSeatSelection: fetchSessionWizardSeatSelectionMock,
    fetchSessionWizardBooking: fetchSessionWizardBookingMock,
  }
})

vi.mock("@/api/seatsio", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/seatsio")>()
  return {
    ...actual,
    fetchSeatsIoChartCategories: fetchSeatsIoChartCategoriesMock,
    fetchSeatsIoChartCategoryCapacity: fetchSeatsIoChartCategoryCapacityMock,
  }
})

const SESSION_ID = "session-1"
const CHART_UNIQUE_ID = "chart-1"
const CATEGORY_ID = 7
const CATEGORY_NAME = "Balcony"

function renderStep() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

  render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <SessionWizardActionsProvider>
          <SessionTicketStep sessionId={SESSION_ID} />
        </SessionWizardActionsProvider>
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

/** Opens the ticket modal and picks the seating category the counts are read for. */
async function openModalWithCategory() {
  renderStep()

  await userEvent.click(await screen.findByRole("button", { name: /add ticket/i }))
  await userEvent.click(await screen.findByText("Select category"))
  await userEvent.click(await screen.findByRole("option", { name: new RegExp(CATEGORY_NAME, "i") }))
}

/** The field the layout count lands in. */
function totalTicketsField() {
  return screen.getByPlaceholderText("Total ticket count")
}

/** The count Seats.io reports for the seeded category. */
function capacity(objectCount: number | null) {
  return [
    {
      categoryId: CATEGORY_ID,
      categoryUniqueId: "category-1",
      key: "cat-balcony",
      name: CATEGORY_NAME,
      objectCount,
    },
  ]
}

describe("SessionTicketStep seat count", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchSessionWizardTicketsMock.mockResolvedValue([])
    fetchSessionWizardBookingMock.mockResolvedValue({ bookingStartDate: null, bookingEndDate: null })
    fetchSessionWizardSeatSelectionMock.mockResolvedValue({
      offerPickingSeats: true,
      seatsIoEventUniqueId: "event-1",
      seatsIoChartUniqueId: CHART_UNIQUE_ID,
      seatsIoChartName: "Ground Floor",
      seatsIoEventLabel: "Opening Night",
    })
    fetchSeatsIoChartCategoriesMock.mockResolvedValue([
      {
        id: CATEGORY_ID,
        uniqueId: "category-1",
        chartUniqueId: CHART_UNIQUE_ID,
        key: "cat-balcony",
        name: CATEGORY_NAME,
        color: "#112233",
        displayOrder: 1,
      },
    ])
  })

  /**
   * The count the layout already knows is the number the organizer would otherwise reach by counting seats in the
   * designer, so an untouched field takes it without further ceremony.
   */
  it("fills an empty total from the layout count", async () => {
    fetchSeatsIoChartCategoryCapacityMock.mockResolvedValue(capacity(148))

    await openModalWithCategory()
    await userEvent.click(screen.getByRole("button", { name: /use layout count/i }))

    await waitFor(() => expect(totalTicketsField()).toHaveValue("148"))
    expect(fetchSeatsIoChartCategoryCapacityMock).toHaveBeenCalledWith(CHART_UNIQUE_ID)
  })

  /**
   * A number the organizer typed is theirs. Replacing it without asking would discard a deliberate figure — an
   * agreed cap, or a hold kept back — and nothing on screen would say it had gone.
   */
  it("asks before replacing a total the organizer already typed", async () => {
    fetchSeatsIoChartCategoryCapacityMock.mockResolvedValue(capacity(148))

    await openModalWithCategory()
    await userEvent.type(totalTicketsField(), "120")
    await userEvent.click(screen.getByRole("button", { name: /use layout count/i }))

    expect(await screen.findByText("Replace the total tickets?")).toBeInTheDocument()
    expect(totalTicketsField()).toHaveValue("120")

    await userEvent.click(screen.getByRole("button", { name: "Use layout count" }))
    await waitFor(() => expect(totalTicketsField()).toHaveValue("148"))
  })

  /** Dismissing the question is an answer: the organizer's own figure stands. */
  it("keeps the typed total when the replacement is declined", async () => {
    fetchSeatsIoChartCategoryCapacityMock.mockResolvedValue(capacity(148))

    await openModalWithCategory()
    await userEvent.type(totalTicketsField(), "120")
    await userEvent.click(screen.getByRole("button", { name: /use layout count/i }))

    await userEvent.click(await screen.findByRole("button", { name: "Keep mine" }))

    expect(totalTicketsField()).toHaveValue("120")
  })

  /**
   * A category with nothing drawn against it cannot size a ticket. Writing the zero would leave a ticket that
   * fails its own validation, so the screen says what is missing instead.
   */
  it("says nothing is assigned rather than writing a zero total", async () => {
    fetchSeatsIoChartCategoryCapacityMock.mockResolvedValue(capacity(0))

    await openModalWithCategory()
    await userEvent.click(screen.getByRole("button", { name: /use layout count/i }))

    expect(
      await screen.findByText("No seats are assigned to this category on the published layout."),
    ).toBeInTheDocument()
    expect(totalTicketsField()).toHaveValue("")
  })

  /**
   * An unread count is not a count of zero. The refusal has to reach the organizer with the field left exactly as
   * they had it, so a Seats.io outage never quietly resizes a ticket.
   */
  it("surfaces the refusal and leaves the total untouched when the count cannot be read", async () => {
    fetchSeatsIoChartCategoryCapacityMock.mockRejectedValue(
      Object.assign(new Error("Request failed"), {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: "Publish this seating layout in the designer before pulling seat counts." },
        },
      }),
    )

    await openModalWithCategory()
    await userEvent.type(totalTicketsField(), "120")
    await userEvent.click(screen.getByRole("button", { name: /use layout count/i }))

    expect(
      await screen.findByText("Publish this seating layout in the designer before pulling seat counts."),
    ).toBeInTheDocument()
    expect(totalTicketsField()).toHaveValue("120")
  })

  /**
   * A standing area with no capacity set makes the category unlimited, so no number can be filled in honestly. The
   * screen says so and leaves the field alone rather than writing a figure that would cap an uncapped section.
   */
  it("asks for the total itself when the category holds an unlimited standing area", async () => {
    fetchSeatsIoChartCategoryCapacityMock.mockResolvedValue(capacity(null))

    await openModalWithCategory()
    await userEvent.click(screen.getByRole("button", { name: /use layout count/i }))

    expect(
      await screen.findByText(
        "This category includes a standing area with no capacity set, so it has no exact number. Enter the total yourself.",
      ),
    ).toBeInTheDocument()
    expect(totalTicketsField()).toHaveValue("")
  })
})
