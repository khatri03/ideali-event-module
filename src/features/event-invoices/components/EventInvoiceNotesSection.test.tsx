import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { EventInvoiceNote } from "@/api/eventInvoices"
import { EventInvoiceNotesSection } from "./EventInvoiceNotesSection"

const { useAddEventInvoiceNoteMock, mutateAsyncMock } = vi.hoisted(() => ({
  useAddEventInvoiceNoteMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
}))

vi.mock("../hooks/useEventInvoices", () => ({
  useAddEventInvoiceNote: useAddEventInvoiceNoteMock,
}))

const NOTES: EventInvoiceNote[] = [
  { note: "Newest note", createdBy: "tester", createdOnUtc: "2026-08-02T10:00:00Z" },
  { note: "Older note", createdBy: "tester", createdOnUtc: "2026-08-01T10:00:00Z" },
]

function renderSection(notes: EventInvoiceNote[] = NOTES) {
  return render(
    <ChakraProvider value={system}>
      <EventInvoiceNotesSection invoiceUniqueId="invoice-1" notes={notes} />
    </ChakraProvider>,
  )
}

describe("EventInvoiceNotesSection", () => {
  beforeEach(() => {
    mutateAsyncMock.mockReset().mockResolvedValue(undefined)
    useAddEventInvoiceNoteMock.mockReset().mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
      error: null,
    })
  })

  it("NotesPresent_ShowsTheAccordionWithNewestNoteFirst", () => {
    renderSection()

    const newest = screen.getByText("Newest note")
    const older = screen.getByText("Older note")

    expect(screen.getByRole("button", { name: /invoice notes 2/i })).toHaveAttribute("aria-expanded", "true")
    expect(newest.compareDocumentPosition(older) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("NoNotes_HidesTheAccordionButStillAllowsAddingANote", () => {
    renderSection([])

    expect(screen.queryByRole("button", { name: /invoice notes/i })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /add note/i })).toBeInTheDocument()
  })

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

  it("BlankNote_DisablesSave", async () => {
    const user = userEvent.setup()
    renderSection([])

    await user.click(screen.getByRole("button", { name: /add note/i }))

    expect(await screen.findByRole("button", { name: /save note/i })).toBeDisabled()
  })
})
