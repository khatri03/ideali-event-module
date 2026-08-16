import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { SessionListItem } from "@/api/sessions"
import { SessionListTable } from "./SessionListTable"

function session(overrides: Partial<SessionListItem> = {}): SessionListItem {
  return {
    uniqueId: "session-1",
    name: "Opening Night",
    eventUniqueId: "event-1",
    eventName: "Launch Summit",
    venueName: "Main Hall",
    offerPickingSeats: false,
    bookingStatus: "Started",
    startDate: "2026-08-17T18:00:00Z",
    endDate: "2026-08-17T21:00:00Z",
    totalAvailableTickets: 80,
    ticketsSold: 20,
    genreNames: [],
    ...overrides,
  }
}

function renderTable(sessions: SessionListItem[]) {
  const onOpenSession = vi.fn()
  const onCheckInSession = vi.fn()

  render(
    <ChakraProvider value={system}>
      <SessionListTable
        sessions={sessions}
        isLoading={false}
        isError={false}
        errorMessage=""
        page={1}
        totalPages={1}
        pageNumbers={[1]}
        sortBy={null}
        sortOrder="asc"
        onPageChange={vi.fn()}
        onSort={vi.fn()}
        onClearSort={vi.fn()}
        onOpenSession={onOpenSession}
        onCheckInSession={onCheckInSession}
      />
    </ChakraProvider>,
  )

  return { onOpenSession, onCheckInSession }
}

async function openRowActions(sessionName: string) {
  await userEvent.click(screen.getByRole("button", { name: `Actions for ${sessionName}` }))
}

describe("SessionListTable", () => {
  it("OpensTheDoorScreenForTheSessionAndItsOwningEvent", async () => {
    const { onCheckInSession } = renderTable([session()])

    await openRowActions("Opening Night")
    await userEvent.click(await screen.findByText("Check in attendees"))

    expect(onCheckInSession).toHaveBeenCalledWith("event-1", "session-1")
  })

  it("HidesCheckInWhenTheOwningEventIsUnknownRatherThanLinkingNowhere", async () => {
    renderTable([session({ eventUniqueId: "" })])

    await openRowActions("Opening Night")

    expect(await screen.findByText("Edit")).toBeInTheDocument()
    expect(screen.queryByText("Check in attendees")).not.toBeInTheDocument()
  })

  it("KeepsEditSeparateFromCheckIn", async () => {
    const { onOpenSession, onCheckInSession } = renderTable([session()])

    await openRowActions("Opening Night")
    await userEvent.click(await screen.findByText("Edit"))

    expect(onOpenSession).toHaveBeenCalledWith("session-1")
    expect(onCheckInSession).not.toHaveBeenCalled()
  })
})
