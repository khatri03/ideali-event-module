import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { system } from "@/theme"
import type { SeatsIoEventStatusChange, SeatsIoEventStatusChangePage } from "@/api/seatsio"
import { StatusChangesPanel } from "./StatusChangesPanel"

const { statusChangesMock } = vi.hoisted(() => ({ statusChangesMock: vi.fn() }))

vi.mock("@/api/seatsio", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/seatsio")>()),
  fetchSeatsIoEventStatusChanges: statusChangesMock,
}))

vi.mock("@/hooks/useDebounce", () => ({ useDebounce: <T,>(value: T) => value }))

const EVENT_UNIQUE_ID = "7a6c857d-ca04-4abe-a812-895496c8bea9"

/** Builds one status-change row; overrides name only what the test is about. */
function change(overrides: Partial<SeatsIoEventStatusChange> = {}): SeatsIoEventStatusChange {
  return {
    objectLabel: "18-1",
    status: "reservedByToken",
    quantity: 1,
    holdToken: "6193077f-2931-4435-b8ba-42a67a2d88e7",
    orderId: "",
    origin: "Hold by end user",
    dateUtc: "2026-09-16T11:23:31.613Z",
    ...overrides,
  }
}

/** Builds one page of the log with the cursor for the page after it (null on the last page). */
function page(items: SeatsIoEventStatusChange[], nextPageStartsAfter: number | null): SeatsIoEventStatusChangePage {
  return { items, nextPageStartsAfter }
}

/** Renders the panel inside the providers it needs, with retries off so a failure surfaces at once. */
function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <StatusChangesPanel eventUniqueId={EVENT_UNIQUE_ID} />
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

/** The filters the panel sent on its most recent read. */
function lastFilters() {
  return statusChangesMock.mock.calls.at(-1)?.[1] as {
    search: string
    exactMatch: boolean
    sort: string
    pageSize: number
  }
}

beforeEach(() => {
  statusChangesMock.mockReset()
})

describe("StatusChangesPanel", () => {
  /** The raw Seats.io status is shown as-is, matching the Seats.io portal row for row. */
  it("shows the raw Seats.io status and a millisecond timestamp", async () => {
    statusChangesMock.mockResolvedValue(page([change()], null))

    renderPanel()

    expect(await screen.findByText("reservedByToken")).toBeInTheDocument()
    const fraction = screen.getByText(".613")
    expect(fraction.parentElement?.textContent).toMatch(/^\d{2}:\d{2}:\d{2}\.613$/)
  })

  /**
   * Load more appends the next page under the rows already shown, using the cursor the last page returned, and the
   * button goes away once the server reports no further page.
   */
  it("appends the next page on Load more and ends when the cursor runs out", async () => {
    statusChangesMock
      .mockResolvedValueOnce(page([change({ objectLabel: "21-9" })], 500))
      .mockResolvedValueOnce(page([change({ objectLabel: "19-8" })], null))

    renderPanel()
    await userEvent.click(await screen.findByRole("button", { name: "Load more" }))

    expect(await screen.findByText("19-8")).toBeInTheDocument()
    expect(screen.getByText("21-9")).toBeInTheDocument()
    expect(statusChangesMock).toHaveBeenLastCalledWith(EVENT_UNIQUE_ID, expect.anything(), 500)
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument()
    expect(screen.getByText("End of history · 2 changes")).toBeInTheDocument()
  })

  /** A failed Load more keeps the rows already read and offers a retry rather than blanking the log. */
  it("keeps loaded rows and offers a retry when Load more fails", async () => {
    statusChangesMock
      .mockResolvedValueOnce(page([change({ objectLabel: "21-9" })], 500))
      .mockRejectedValueOnce(new Error("network"))

    renderPanel()
    await userEvent.click(await screen.findByRole("button", { name: "Load more" }))

    expect(await screen.findByText("We couldn't load more changes.")).toBeInTheDocument()
    expect(screen.getByText("21-9")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
  })

  /** Typing a label sends it to the server as a contains search, not a filter over the rows already loaded. */
  it("sends the typed label as a contains search", async () => {
    statusChangesMock.mockResolvedValue(page([change()], null))

    renderPanel()
    await userEvent.type(await screen.findByLabelText("Search by object label"), "18-1")

    await waitFor(() => expect(lastFilters()).toMatchObject({ search: "18-1", exactMatch: false }))
  })

  /**
   * Clicking an object label narrows the log to that object's own history, like the label link in the Seats.io
   * portal, and sorting is switched off because the per-object history reads newest first only.
   */
  it("narrows to one object on label click and disables sorting", async () => {
    statusChangesMock.mockResolvedValue(page([change({ objectLabel: "7-10" })], null))

    renderPanel()
    await userEvent.click(await screen.findByRole("button", { name: "Show the history of 7-10" }))

    await waitFor(() => expect(lastFilters()).toMatchObject({ search: "7-10", exactMatch: true }))
    expect(screen.getByLabelText("Search by object label")).toHaveValue("7-10")
    expect(screen.getByRole("button", { name: /^Date/ })).toBeDisabled()
    expect(screen.getByText(/Sorting is off for an exact match/)).toBeInTheDocument()
  })

  /** Clicking a column header asks the server for that order; a second click reverses it. */
  it("sorts by the clicked column on the server and reverses on a second click", async () => {
    statusChangesMock.mockResolvedValue(page([change()], null))

    renderPanel()
    const statusHeader = await screen.findByRole("button", { name: /^Status/ })
    await userEvent.click(statusHeader)
    await waitFor(() => expect(lastFilters().sort).toBe("StatusAsc"))

    await userEvent.click(screen.getByRole("button", { name: /^Status/ }))
    await waitFor(() => expect(lastFilters().sort).toBe("StatusDesc"))
  })

  /** Choosing a page size re-reads the log at that size, so the organizer's 10/25/50 pick drives how much loads. */
  it("re-reads the log at the chosen page size", async () => {
    statusChangesMock.mockResolvedValue(page([change()], null))

    renderPanel()
    await screen.findByText("reservedByToken")
    await userEvent.selectOptions(screen.getByLabelText("Changes to load per page"), "25")

    await waitFor(() => expect(lastFilters().pageSize).toBe(25))
  })

  /** A search that matches nothing names the search and offers a way back to the full log. */
  it("names the search when nothing matches and clears it on request", async () => {
    statusChangesMock.mockImplementation((_id: string, filters: { search: string }) =>
      Promise.resolve(page(filters.search ? [] : [change()], null)),
    )

    renderPanel()
    await userEvent.type(await screen.findByLabelText("Search by object label"), "Z-99")

    expect(await screen.findByText("No changes match “Z-99”")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }))
    expect(await screen.findByText("reservedByToken")).toBeInTheDocument()
  })

  /** An event with no history at all says so, instead of showing an empty table. */
  it("shows the empty state for an event with no changes", async () => {
    statusChangesMock.mockResolvedValue(page([], null))

    renderPanel()

    expect(await screen.findByText("No status changes yet")).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  /** A failed first read shows a plain-language error with a retry that reads the log again. */
  it("shows an error with a working retry when the first read fails", async () => {
    statusChangesMock.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(page([change()], null))

    renderPanel()
    const alert = await screen.findByRole("alert")
    expect(within(alert).getByText("We couldn't load the status history")).toBeInTheDocument()

    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }))

    expect(await screen.findByText("reservedByToken")).toBeInTheDocument()
  })
})
