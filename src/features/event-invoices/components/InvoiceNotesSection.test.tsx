import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { EventInvoiceNote } from "@/api/eventInvoices"
import { InvoiceNotesSection } from "./InvoiceNotesSection"

const mutateAsyncMock = vi.fn()

const NOTES: EventInvoiceNote[] = [
  { note: "Newest note", createdBy: "tester", createdOnUtc: "2026-08-02T10:00:00Z" },
  { note: "Older note", createdBy: "tester", createdOnUtc: "2026-08-01T10:00:00Z" },
]

function renderSection(notes: EventInvoiceNote[] = NOTES, addNoteError: unknown = null) {
  return render(
    <ChakraProvider value={system}>
      <InvoiceNotesSection
        notes={notes}
        addNote={{ mutateAsync: mutateAsyncMock, reset: vi.fn(), isPending: false, error: addNoteError }}
      />
    </ChakraProvider>,
  )
}

describe("InvoiceNotesSection", () => {
  beforeEach(() => {
    mutateAsyncMock.mockReset().mockResolvedValue(undefined)
  })

  /** The trail reads newest first and opens expanded, so the latest context is the first thing the organizer sees. */
  it("NotesPresent_ShowsTheAccordionWithNewestNoteFirst", () => {
    renderSection()

    const newest = screen.getByText("Newest note")
    const older = screen.getByText("Older note")

    expect(screen.getByRole("button", { name: /invoice notes 2/i })).toHaveAttribute("aria-expanded", "true")
    expect(newest.compareDocumentPosition(older) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  /** An invoice with no notes yet still offers the way to add the first one. */
  it("NoNotes_HidesTheAccordionButStillAllowsAddingANote", () => {
    renderSection([])

    expect(screen.queryByRole("button", { name: /invoice notes/i })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /add note/i })).toBeInTheDocument()
  })

  /** The note handed to the page's mutation is trimmed, and the dialog closes once it is saved. */
  it("AddNoteDialog_TrimsAndSubmitsTheNote", async () => {
    const user = userEvent.setup()
    renderSection([])

    await user.click(screen.getByRole("button", { name: /add note/i }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText(/^note$/i), { target: { value: "  Call finance.  " } })
    const saveButton = await screen.findByRole("button", { name: /save note/i })
    await waitFor(() => expect(saveButton).toBeEnabled())
    await user.click(saveButton)

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledWith("Call finance."))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  /** A blank note can never be submitted. */
  it("BlankNote_DisablesSave", async () => {
    const user = userEvent.setup()
    renderSection([])

    await user.click(screen.getByRole("button", { name: /add note/i }))

    expect(await screen.findByRole("button", { name: /save note/i })).toBeDisabled()
  })

  /** A refused note keeps the dialog open with the reason the page's mutation reports, so the text is not lost. */
  it("SaveRefused_KeepsTheDialogOpenWithTheError", async () => {
    mutateAsyncMock.mockRejectedValue(new Error("refused"))
    const user = userEvent.setup()
    renderSection([], new Error("refused"))

    await user.click(screen.getByRole("button", { name: /add note/i }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText(/^note$/i), { target: { value: "Call finance." } })
    const saveButton = within(dialog).getByRole("button", { name: /save note/i })
    await waitFor(() => expect(saveButton).toBeEnabled())
    await user.click(saveButton)

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledWith("Call finance."))
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/^note$/i)).toHaveValue("Call finance.")
    expect(within(dialog).getByRole("alert")).toHaveTextContent("An unexpected error occurred.")
  })
})
