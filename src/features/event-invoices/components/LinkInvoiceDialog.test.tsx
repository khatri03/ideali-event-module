import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import type { EventInvoiceListItem, Page } from "@/api/eventInvoices"
import { system } from "@/theme"
import { LinkInvoiceDialog } from "./LinkInvoiceDialog"

const { useEventInvoicesMock, useLinkEventInvoiceMock, linkMock, refetchMock } = vi.hoisted(() => ({
  useEventInvoicesMock: vi.fn(),
  useLinkEventInvoiceMock: vi.fn(),
  linkMock: vi.fn(),
  refetchMock: vi.fn(),
}))

vi.mock("../hooks/useEventInvoices", () => ({
  useEventInvoices: useEventInvoicesMock,
  useLinkEventInvoice: useLinkEventInvoiceMock,
}))

function listItem(invoiceUniqueId: string, invoiceNo: string, buyerName: string): EventInvoiceListItem {
  return {
    invoiceUniqueId,
    invoiceNo,
    eventUniqueId: "event-1",
    eventName: "Annual Convention",
    buyerName,
    buyerEmail: null,
    invoiceStatus: "PendingPayment",
    invoiceStatusLabel: "Pending Payment",
    invoiceType: "Regular",
    dueDateUtc: null,
    companyName: null,
    isOverdue: false,
    canMarkAsPaid: true,
    canCancel: true,
    canSend: true,
    canEdit: false,
    invoiceDateUtc: "2026-08-01T10:00:00Z",
    totalAmount: "100",
    balanceAmount: "100",
    paymentMethod: null,
    paymentSource: null,
    currencySymbol: "$",
    ticketCount: 1,
  }
}

function pageOf(items: EventInvoiceListItem[]): Page<EventInvoiceListItem> {
  return { items, total: items.length, page: 1, pageSize: 10, totalPages: 1 }
}

const CURRENT = listItem("invoice-1", "INV-2001", "Northwind Traders")
const OTHER = listItem("invoice-2", "INV-2002", "Jane Doe")

function mockQuery(state: { data?: Page<EventInvoiceListItem>; isFetching?: boolean; isError?: boolean; error?: unknown }) {
  useEventInvoicesMock.mockReturnValue({
    data: state.data,
    isFetching: state.isFetching ?? false,
    isError: state.isError ?? false,
    error: state.error ?? null,
    refetch: refetchMock,
  })
}

function mockLink(state: { isPending?: boolean; error?: unknown } = {}) {
  useLinkEventInvoiceMock.mockReturnValue({ mutateAsync: linkMock, isPending: state.isPending ?? false, error: state.error ?? null })
}

function dialog(onClose = vi.fn()) {
  return (
    <ChakraProvider value={system}>
      <LinkInvoiceDialog open invoiceUniqueId="invoice-1" onClose={onClose} />
    </ChakraProvider>
  )
}

function lastRequestedSearchTerm() {
  const calls = useEventInvoicesMock.mock.calls
  return calls[calls.length - 1][0].searchTerm
}

describe("LinkInvoiceDialog", () => {
  beforeEach(() => {
    useEventInvoicesMock.mockReset()
    useLinkEventInvoiceMock.mockReset()
    linkMock.mockReset().mockResolvedValue(undefined)
    refetchMock.mockReset()
    mockQuery({ data: pageOf([CURRENT, OTHER]) })
    mockLink()
  })

  /** An invoice cannot be linked to itself, so the picker never offers the invoice being linked. */
  it("Loaded_ListsOtherInvoicesButNeverTheCurrentOne", async () => {
    render(dialog())

    expect(await screen.findByRole("radio", { name: "Select invoice INV-2002" })).toBeInTheDocument()
    expect(screen.queryByRole("radio", { name: "Select invoice INV-2001" })).not.toBeInTheDocument()
  })

  /** Results come from the server's own search, so typing must reach the list request rather than filter locally. */
  it("Searching_SendsTheDebouncedTermToTheServerFromPageOne", async () => {
    const user = userEvent.setup()
    render(dialog())

    await user.type(await screen.findByPlaceholderText("Search by invoice no, buyer name or email"), "jane")

    await waitFor(() => expect(lastRequestedSearchTerm()).toBe("jane"))
    const [, page] = useEventInvoicesMock.mock.calls[useEventInvoicesMock.mock.calls.length - 1]
    expect(page).toBe(1)
  })

  /** A search with no hits says so and tells the organizer what to try next, instead of an empty table. */
  it("SearchWithNoMatches_ShowsTheTryADifferentSearchSentence", async () => {
    const user = userEvent.setup()
    render(dialog())
    mockQuery({ data: pageOf([]) })

    await user.type(await screen.findByPlaceholderText("Search by invoice no, buyer name or email"), "zzz")

    expect(await screen.findByText("No invoices match. Try a different search.")).toBeInTheDocument()
  })

  /** With nothing else to link to, the picker says so plainly rather than blaming a search nobody typed. */
  it("NoOtherInvoices_SaysThereIsNothingToLinkToYet", async () => {
    mockQuery({ data: pageOf([CURRENT]) })
    render(dialog())

    expect(await screen.findByText("There are no other invoices to link to yet.")).toBeInTheDocument()
  })

  /** While the page loads the table shows skeleton rows, never a blank body or a stale choice. */
  it("Loading_ShowsSkeletonRowsAndNoChoices", async () => {
    mockQuery({ isFetching: true })
    render(dialog())

    await screen.findByText("Link to an existing invoice")
    expect(document.querySelectorAll(".chakra-skeleton").length).toBeGreaterThan(0)
    expect(screen.queryByRole("radio")).not.toBeInTheDocument()
  })

  /** A failed load explains itself and offers a retry, so the organizer is never stuck on an empty picker. */
  it("LoadFailed_ShowsTheErrorWithARetryThatRefetches", async () => {
    mockQuery({ isError: true, error: new Error("offline") })
    const user = userEvent.setup()
    render(dialog())

    expect(await screen.findByText("Could not load invoices")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /try again|retry/i }))

    expect(refetchMock).toHaveBeenCalledTimes(1)
  })

  /** Nothing can be linked until a target is chosen, so the confirm button starts disabled. */
  it("NothingSelected_KeepsLinkInvoiceDisabled", async () => {
    render(dialog())

    expect(await screen.findByRole("button", { name: "Link invoice" })).toBeDisabled()
  })

  /** Confirming links exactly the chosen invoice and closes the dialog once the server has accepted it. */
  it("SelectedAndConfirmed_LinksTheChosenInvoiceAndCloses", async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(dialog(onClose))

    await user.click(await screen.findByText("INV-2002"))
    await user.click(screen.getByRole("button", { name: "Link invoice" }))

    await waitFor(() => expect(linkMock).toHaveBeenCalledWith("invoice-2"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  /** A refused link keeps the dialog open with the reason and the selection intact, and never claims success. */
  it("LinkRefused_StaysOpenWithTheErrorAndKeepsTheSelection", async () => {
    linkMock.mockRejectedValue(new Error("refused"))
    const onClose = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(dialog(onClose))

    await user.click(await screen.findByRole("radio", { name: "Select invoice INV-2002" }))
    await user.click(screen.getByRole("button", { name: "Link invoice" }))
    await waitFor(() => expect(linkMock).toHaveBeenCalled())

    mockLink({ error: new Error("refused") })
    rerender(dialog(onClose))

    expect(onClose).not.toHaveBeenCalled()
    expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent("An unexpected error occurred.")
    expect(screen.getByRole("radio", { name: "Select invoice INV-2002" })).toBeChecked()
  })

  /** While the link is in flight the confirm button shows progress and cannot be pressed again. */
  it("LinkPending_DisablesTheConfirmButton", async () => {
    mockLink({ isPending: true })
    render(dialog())

    expect(await screen.findByRole("button", { name: /linking/i })).toBeDisabled()
  })
})
