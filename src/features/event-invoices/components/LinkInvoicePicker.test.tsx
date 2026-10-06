import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import type { CustomInvoiceLinkCandidate, CustomInvoiceLinkCandidatesPage } from "@/api/customInvoices"
import { system } from "@/theme"
import { LinkInvoicePicker } from "./LinkInvoicePicker"

const { useLinkCandidatesMock, refetchMock } = vi.hoisted(() => ({ useLinkCandidatesMock: vi.fn(), refetchMock: vi.fn() }))

vi.mock("../hooks/useCustomInvoiceAuthoringOptions", () => ({
  useCustomInvoiceLinkCandidates: useLinkCandidatesMock,
}))

function candidate(invoiceNo: string, invoiceStatus: string, invoiceStatusLabel: string): CustomInvoiceLinkCandidate {
  return {
    invoiceUniqueId: `id-${invoiceNo}`,
    invoiceNo,
    companyName: "Contoso Ltd",
    buyerFirstName: "Sam",
    buyerMiddleName: null,
    buyerLastName: "Lee",
    buyerName: "Sam Lee",
    buyerEmail: "sam@contoso.test",
    invoiceDateUtc: "2026-09-01T00:00:00Z",
    invoiceStatus,
    invoiceStatusLabel,
  }
}

const EVERY_STATUS = [
  candidate("INV-1", "PendingPayment", "Pending Payment"),
  candidate("INV-2", "PartiallyPaid", "Partially Paid"),
  candidate("INV-3", "Paid", "Paid"),
  candidate("INV-4", "Cancelled", "Cancelled"),
]

function mockQuery(state: { data?: CustomInvoiceLinkCandidatesPage; isError?: boolean; error?: unknown }) {
  useLinkCandidatesMock.mockReturnValue({
    data: state.data,
    isFetching: false,
    isError: state.isError ?? false,
    error: state.error ?? null,
    refetch: refetchMock,
  })
}

function lastRequest() {
  return useLinkCandidatesMock.mock.calls.at(-1)?.[0]
}

function renderPicker(onSelect = vi.fn()) {
  return render(
    <ChakraProvider value={system}>
      <LinkInvoicePicker moduleType="Donation" excludeInvoiceUniqueId="inv-self" selectedInvoiceUniqueId={null} onSelect={onSelect} />
    </ChakraProvider>,
  )
}

describe("LinkInvoicePicker", () => {
  beforeEach(() => {
    useLinkCandidatesMock.mockReset()
    refetchMock.mockReset()
    mockQuery({ data: { items: EVERY_STATUS, total: 45, totalPages: 3 } })
  })

  /** The server pages the candidates for the given module and leaves the invoice itself out (D-09). */
  it("LinkInvoicePicker_RequestsTheModuleFromPageOneExcludingTheInvoice", () => {
    renderPicker()

    expect(lastRequest()).toMatchObject({ moduleType: "Donation", excludeInvoiceUniqueId: "inv-self", pageNo: 1, searchTerm: "" })
  })

  /** A new search starts again from the first page, so a later page of an older search never hides the matches. */
  it("LinkInvoicePicker_SearchResetsToFirstPage", async () => {
    const user = userEvent.setup()
    renderPicker()
    await user.click(screen.getByRole("button", { name: /next/i }))
    await waitFor(() => expect(lastRequest()).toMatchObject({ pageNo: 2 }))

    await user.type(screen.getByPlaceholderText("Search by invoice no, buyer name or email"), "INV")

    await waitFor(() => expect(lastRequest()).toMatchObject({ searchTerm: "INV", pageNo: 1 }))
  })

  /** Every status may be linked, and each row shows its status badge so the organizer knows what they pick (D-10). */
  it("LinkInvoicePicker_ListsEveryStatusWithBadge", () => {
    renderPicker()

    for (const [invoiceNo, label] of [
      ["INV-1", "Pending Payment"],
      ["INV-2", "Partially Paid"],
      ["INV-3", "Paid"],
      ["INV-4", "Cancelled"],
    ]) {
      const row = screen.getByRole("radio", { name: `Select invoice ${invoiceNo}` }).closest("tr") as HTMLElement
      expect(within(row).getByText(label)).toBeInTheDocument()
    }
  })

  /** Picking a row hands back the whole candidate, so the editor can copy its buyer. */
  it("LinkInvoicePicker_Pick_HandsBackTheCandidate", async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    renderPicker(onSelect)

    await user.click(screen.getByRole("radio", { name: "Select invoice INV-3" }))

    expect(onSelect).toHaveBeenCalledWith(EVERY_STATUS[2])
  })

  /** A failed load explains itself and offers a retry rather than an empty list that looks like "nothing to link". */
  it("LinkInvoicePicker_LoadError_ShowsRetry", async () => {
    mockQuery({ isError: true, error: new Error("forbidden") })
    const user = userEvent.setup()
    renderPicker()

    expect(screen.getByText("Could not load invoices")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /try again|retry/i }))

    expect(refetchMock).toHaveBeenCalledTimes(1)
  })
})
