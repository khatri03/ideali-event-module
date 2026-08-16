import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { CheckInAttempt } from "@/api/eventCheckIn"
import { CheckInOutcomeCard } from "./CheckInOutcomeCard"

function renderCard(attempt: CheckInAttempt, isReversing = false) {
  const onUndo = vi.fn()

  render(
    <ChakraProvider value={system}>
      <CheckInOutcomeCard attempt={attempt} isReversing={isReversing} onUndo={onUndo} />
    </ChakraProvider>,
  )

  return onUndo
}

const ADMITTED: CheckInAttempt = {
  outcome: "Success",
  ticketCode: "TKT-1",
  message: "Ticket checked in successfully.",
  checkedInAtUtc: "2026-08-17T18:00:00Z",
}

describe("CheckInOutcomeCard", () => {
  it("TellsTheOperatorToAdmitAnAcceptedTicket", () => {
    renderCard(ADMITTED)

    expect(screen.getByText("Admit")).toBeInTheDocument()
    expect(screen.getByText("TKT-1")).toBeInTheDocument()
  })

  it("SeparatesATicketAlreadyInsideFromOneThatWasJustAdmitted", () => {
    renderCard({ ...ADMITTED, outcome: "AlreadyCheckedIn" })

    expect(screen.getByText("Already inside")).toBeInTheDocument()
  })

  it("RefusesEntryLoudlyForAnInvalidTicket", () => {
    renderCard({ outcome: "Invalid", ticketCode: "TKT-9", message: "Ticket code is invalid.", checkedInAtUtc: null })

    expect(screen.getByText("Do not admit")).toBeInTheDocument()
  })

  /** The toast carries the server's wording; repeating it here is what made this strip noise. */
  it("LeavesTheServerMessageToTheToast", () => {
    renderCard(ADMITTED)

    expect(screen.queryByText("Ticket checked in successfully.")).not.toBeInTheDocument()
  })

  it("OffersNoReversalForATicketThatWasNeverAdmitted", () => {
    renderCard({ outcome: "Invalid", ticketCode: "TKT-9", message: "Ticket code is invalid.", checkedInAtUtc: null })

    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument()
  })

  it("ReversesTheAdmissionItJustReported", async () => {
    const onUndo = renderCard(ADMITTED)

    await userEvent.click(screen.getByRole("button", { name: "Undo" }))

    expect(onUndo).toHaveBeenCalledWith("TKT-1")
  })

  it("BlocksASecondReversalWhileTheFirstIsInFlight", () => {
    renderCard(ADMITTED, true)

    expect(screen.getByRole("button", { name: /Reversing/ })).toBeDisabled()
  })
})
