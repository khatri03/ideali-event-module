import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import type { CustomInvoiceLinkCandidate, CustomInvoiceLinkCandidatesPage } from "@/api/customInvoices"
import { system } from "@/theme"
import { LinkInvoiceDialog } from "./LinkInvoiceDialog"

const { useLinkCandidatesMock, useLinkCustomInvoiceMock, linkMock, refetchMock } = vi.hoisted(() => ({
  useLinkCandidatesMock: vi.fn(),
  useLinkCustomInvoiceMock: vi.fn(),
  linkMock: vi.fn(),
  refetchMock: vi.fn(),
}))

vi.mock("../hooks/useCustomInvoiceAuthoringOptions", () => ({
  useCustomInvoiceLinkCandidates: useLinkCandidatesMock,
}))

vi.mock("../hooks/useCustomInvoices", () => ({
  useLinkCustomInvoice: useLinkCustomInvoiceMock,
}))

function candidate(invoiceUniqueId: string, invoiceNo: string, buyerName: string): CustomInvoiceLinkCandidate {
  return {
    invoiceUniqueId,
    invoiceNo,
    companyName: "",
    buyerFirstName: null,
    buyerMiddleName: null,
    buyerLastName: buyerName,
    buyerName,
    buyerEmail: "",
    invoiceDateUtc: "2026-08-01T10:00:00Z",
    invoiceStatus: "PendingPayment",
    invoiceStatusLabel: "Pending Payment",
  }
}

function pageOf(items: CustomInvoiceLinkCandidate[]): CustomInvoiceLinkCandidatesPage {
  return { items, total: items.length, totalPages: 1 }
}

const OTHER = candidate("invoice-2", "INV-2002", "Jane Doe")

function mockQuery(state: { data?: CustomInvoiceLinkCandidatesPage; isFetching?: boolean; isError?: boolean; error?: unknown }) {
  useLinkCandidatesMock.mockReturnValue({
    data: state.data,
    isFetching: state.isFetching ?? false,
    isError: state.isError ?? false,
    error: state.error ?? null,
    refetch: refetchMock,
  })
}

function mockLink(state: { isPending?: boolean; error?: unknown } = {}) {
  useLinkCustomInvoiceMock.mockReturnValue({ mutateAsync: linkMock, isPending: state.isPending ?? false, error: state.error ?? null })
}

function dialog(onClose = vi.fn()) {
  return (
    <ChakraProvider value={system}>
      <LinkInvoiceDialog open invoiceUniqueId="invoice-1" moduleType="Membership" onClose={onClose} />
    </ChakraProvider>
  )
}

function lastRequest() {
  return useLinkCandidatesMock.mock.calls.at(-1)?.[0]
}

describe("LinkInvoiceDialog", () => {
  beforeEach(() => {
    useLinkCandidatesMock.mockReset()
    useLinkCustomInvoiceMock.mockReset()
    linkMock.mockReset().mockResolvedValue(undefined)
    refetchMock.mockReset()
    mockQuery({ data: pageOf([OTHER]) })
    mockLink()
  })

  /**
   * Only invoices of the same module can be linked and never the invoice itself, so the request names the
   * dialog's module and excludes its own invoice on the server (D-03).
   */
  it("LinkInvoiceDialog_RequestsCandidatesForItsModuleExcludingItself", async () => {
    render(dialog())

    expect(await screen.findByRole("radio", { name: "Select invoice INV-2002" })).toBeInTheDocument()
    expect(lastRequest()).toMatchObject({ moduleType: "Membership", excludeInvoiceUniqueId: "invoice-1", pageNo: 1 })
  })

  /** A candidate that bills a company is recognised by that company, with the contact person underneath. */
  it("CandidateWithCompany_ShowsTheCompanyAboveTheBuyer", async () => {
    mockQuery({ data: pageOf([{ ...OTHER, companyName: "Contoso Ltd" }]) })
    render(dialog())

    const row = (await screen.findByRole("radio", { name: "Select invoice INV-2002" })).closest("tr") as HTMLElement

    expect(within(row).getByText("Contoso Ltd").nextElementSibling).toHaveTextContent("Jane Doe")
  })

  /** A candidate with no company reads as its buyer alone, exactly as ticket orders always have. */
  it("CandidateWithoutCompany_ShowsOnlyTheBuyer", async () => {
    render(dialog())

    const row = (await screen.findByRole("radio", { name: "Select invoice INV-2002" })).closest("tr") as HTMLElement

    expect(within(row).getByText("Jane Doe").nextElementSibling).toBeNull()
  })

  /** Results come from the server's own search, so typing must reach the list request rather than filter locally. */
  it("Searching_SendsTheDebouncedTermToTheServerFromPageOne", async () => {
    const user = userEvent.setup()
    render(dialog())

    await user.type(await screen.findByPlaceholderText("Search by invoice no, buyer name or email"), "jane")

    await waitFor(() => expect(lastRequest()).toMatchObject({ searchTerm: "jane", pageNo: 1 }))
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
    mockQuery({ data: pageOf([]) })
    render(dialog())

    expect(await screen.findByText("There are no other invoices of this module to link to yet.")).toBeInTheDocument()
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

  /** The link is written through the custom-invoice link mutation for the invoice being linked. */
  it("LinkPicker_Confirm_LinksThroughTheCustomInvoiceLinkMutation", async () => {
    const user = userEvent.setup()
    render(dialog())

    await user.click(await screen.findByText("INV-2002"))
    await user.click(screen.getByRole("button", { name: "Link invoice" }))

    await waitFor(() => expect(linkMock).toHaveBeenCalledWith("invoice-2"))
    expect(useLinkCustomInvoiceMock).toHaveBeenCalledWith("invoice-1")
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
