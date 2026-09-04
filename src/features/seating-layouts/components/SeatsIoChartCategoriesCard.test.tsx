import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { system } from "@/theme"
import { SeatsIoChartCategoriesCard } from "./SeatsIoChartCategoriesCard"

const CHART_UNIQUE_ID = "7a6c857d-ca04-4abe-a812-895496c8bea9"

const CATEGORY_IN_USE_MESSAGE = "This category can't be deleted because it is assigned to objects."

const seatsIoApi = vi.hoisted(() => ({
  fetchSeatsIoChartCategories: vi.fn(),
  deleteSeatsIoChartCategory: vi.fn(),
}))

vi.mock("@/api/seatsio", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/seatsio")>()
  return { ...actual, ...seatsIoApi }
})

vi.mock("@/lib/toaster", () => ({ toaster: { create: vi.fn() } }))

/** The refusal the API answers a delete with while seats are still drawn against the category. */
function categoryInUseFailure() {
  return Object.assign(new Error("Request failed"), {
    isAxiosError: true,
    response: { status: 400, data: { message: CATEGORY_IN_USE_MESSAGE, errorCode: "CategoryInUse" } },
  })
}

/** Renders the card with its own query client, so one test's cache never decides another's result. */
function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <SeatsIoChartCategoriesCard chartUniqueId={CHART_UNIQUE_ID} chartName="Grand Ballroom" />
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

describe("SeatsIoChartCategoriesCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    seatsIoApi.fetchSeatsIoChartCategories.mockResolvedValue([
      { uniqueId: "category-1", name: "Stalls", color: "#7551FF" },
    ])
  })

  /**
   * The delete is destructive and reaches Seats.io, so it must ask before it acts. A confirmation that
   * only appears on a second press reads as a dead button, and the press that finally opens it is the
   * one the organizer made while no longer expecting anything to happen.
   */
  it("asks for confirmation on the first press of delete", async () => {
    const user = userEvent.setup()
    renderCard()

    await screen.findByText("Stalls")
    await user.click(screen.getByRole("button", { name: "Delete category Stalls" }))

    expect(await screen.findByText('Delete "Stalls" from Seats.io and our database.')).toBeInTheDocument()
  })

  /**
   * A refused delete has to say why on the dialog the organizer is looking at. Closing the dialog as if
   * it had worked would leave them believing a category is gone while Seats.io still holds it.
   */
  it("keeps the dialog open and shows why when the category is still assigned to seats", async () => {
    const user = userEvent.setup()
    seatsIoApi.deleteSeatsIoChartCategory.mockRejectedValue(categoryInUseFailure())

    renderCard()

    await screen.findByText("Stalls")
    await user.click(screen.getByRole("button", { name: "Delete category Stalls" }))
    await user.click(await screen.findByRole("button", { name: "Delete" }))

    expect(await screen.findByText(CATEGORY_IN_USE_MESSAGE)).toBeInTheDocument()
    expect(screen.getByText('Delete "Stalls" from Seats.io and our database.')).toBeInTheDocument()
  })

  /**
   * Once the seats behind the refusal are known, pressing delete again can only produce the same refusal. The
   * action is withdrawn instead of being left on screen inviting a press that cannot work.
   */
  it("withdraws the delete once the category is known to be assigned to seats", async () => {
    const user = userEvent.setup()
    seatsIoApi.deleteSeatsIoChartCategory.mockRejectedValue(categoryInUseFailure())

    renderCard()

    await screen.findByText("Stalls")
    await user.click(screen.getByRole("button", { name: "Delete category Stalls" }))
    await user.click(await screen.findByRole("button", { name: "Delete" }))
    await screen.findByText(CATEGORY_IN_USE_MESSAGE)

    await waitFor(() => expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument())
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument()
    expect(
      screen.getByText("Move its seats to another category in the designer, then delete it."),
    ).toBeInTheDocument()
  })

  /**
   * The refusal outlives the dialog: the seats are still assigned after it closes, so the row's delete stops
   * being offered too rather than walking the organizer back into the same dead end.
   */
  it("stops offering the row delete for a category the seats are still assigned to", async () => {
    const user = userEvent.setup()
    seatsIoApi.deleteSeatsIoChartCategory.mockRejectedValue(categoryInUseFailure())

    renderCard()

    await screen.findByText("Stalls")
    const rowDelete = screen.getByRole("button", { name: "Delete category Stalls" })
    await user.click(rowDelete)
    await user.click(await screen.findByRole("button", { name: "Delete" }))
    await screen.findByText(CATEGORY_IN_USE_MESSAGE)
    await user.click(screen.getByRole("button", { name: "Close" }))

    await waitFor(() => expect(rowDelete).toHaveAttribute("aria-disabled", "true"))

    await user.click(rowDelete)

    expect(screen.queryByText('Delete "Stalls" from Seats.io and our database.')).not.toBeInTheDocument()
    expect(seatsIoApi.deleteSeatsIoChartCategory).toHaveBeenCalledTimes(1)
  })

  /** A category nothing is drawn against is deleted, and the dialog closes rather than lingering. */
  it("closes the dialog once the category is deleted", async () => {
    const user = userEvent.setup()
    seatsIoApi.deleteSeatsIoChartCategory.mockResolvedValue(undefined)

    renderCard()

    await screen.findByText("Stalls")
    await user.click(screen.getByRole("button", { name: "Delete category Stalls" }))
    await user.click(await screen.findByRole("button", { name: "Delete" }))

    await waitFor(() =>
      expect(screen.queryByText('Delete "Stalls" from Seats.io and our database.')).not.toBeInTheDocument(),
    )
    expect(seatsIoApi.deleteSeatsIoChartCategory).toHaveBeenCalledWith(CHART_UNIQUE_ID, "category-1")
  })
})
