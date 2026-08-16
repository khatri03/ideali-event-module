import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { ManualTicketCodeEntry } from "./ManualTicketCodeEntry"

function renderEntry({ isSubmitting = false, isDisabled = false } = {}) {
  const onSubmit = vi.fn()

  render(
    <ChakraProvider value={system}>
      <ManualTicketCodeEntry isSubmitting={isSubmitting} isDisabled={isDisabled} onSubmit={onSubmit} />
    </ChakraProvider>,
  )

  return onSubmit
}

async function submitCode(code: string) {
  await userEvent.type(screen.getByLabelText("Ticket code"), code)
  await userEvent.click(screen.getByRole("button", { name: "Check in" }))

  return screen.findByRole("alertdialog")
}

describe("ManualTicketCodeEntry", () => {
  it("SubmitsTheTypedCodeWithoutSurroundingSpace", async () => {
    const onSubmit = renderEntry()

    const dialog = await submitCode("  TKT-1  ")
    await userEvent.click(within(dialog).getByRole("button", { name: /^check in$/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("TKT-1"))
  })

  /** Typing a code is one keystroke away from checking in the wrong guest, so it is asked about first. */
  it("AsksBeforeCheckingInATypedCode", async () => {
    const onSubmit = renderEntry()

    const dialog = await submitCode("TKT-1")

    expect(within(dialog).getByText(/TKT-1/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("LeavesTheTypedCodeInPlaceWhenTheCheckInIsCancelled", async () => {
    const onSubmit = renderEntry()

    const dialog = await submitCode("TKT-1")
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Ticket code")).toHaveValue("TKT-1")
  })

  it("RefusesAnEmptyCodeAndSaysWhy", async () => {
    const onSubmit = renderEntry()

    await userEvent.click(screen.getByRole("button", { name: "Check in" }))

    expect(await screen.findByText("Enter the ticket code printed on the ticket.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("ClearsTheFieldSoTheNextGuestStartsFromEmpty", async () => {
    renderEntry()

    const dialog = await submitCode("TKT-1")
    await userEvent.click(within(dialog).getByRole("button", { name: /^check in$/i }))

    await waitFor(() => expect(screen.getByLabelText("Ticket code")).toHaveValue(""))
  })

  it("StopsAcceptingCodesWhileTheDoorIsOffline", () => {
    renderEntry({ isDisabled: true })

    expect(screen.getByLabelText("Ticket code")).toBeDisabled()
    expect(screen.getByRole("button", { name: "Check in" })).toBeDisabled()
  })
})
