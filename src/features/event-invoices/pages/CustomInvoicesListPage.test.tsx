import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { CustomInvoiceListItem } from "@/api/customInvoices"
import { CustomInvoicesListPage } from "./CustomInvoicesListPage"

const { useCustomInvoiceListMock } = vi.hoisted(() => ({ useCustomInvoiceListMock: vi.fn() }))

const { FILTER_OPTIONS, ENABLED_MODULES } = vi.hoisted(() => ({
  FILTER_OPTIONS: { data: { moduleTypes: ["Event"], categories: [] } },
  ENABLED_MODULES: { data: ["Event", "Membership"] },
}))

vi.mock("../hooks/useCustomInvoiceList", () => ({
  useCustomInvoiceList: useCustomInvoiceListMock,
  useCustomInvoiceListFilterOptions: () => FILTER_OPTIONS,
}))

vi.mock("../hooks/useCustomInvoiceAuthoringOptions", () => ({ useEnabledCustomInvoiceModules: () => ENABLED_MODULES }))

/** A pending, past-due Donation invoice: the row the derived Overdue status exists for. */
function buildRow(overrides: Partial<CustomInvoiceListItem> = {}): CustomInvoiceListItem {
  return {
    invoiceUniqueId: "inv-7",
    invoiceNo: "CI-0007",
    moduleType: "Donation",
    entityName: "Spring Appeal",
    companyName: "Acme Corp",
    buyerName: "Jane Doe",
    buyerEmail: "jane@acme.test",
    categoryName: "Gold Sponsor",
    dueDateUtc: "2026-11-01T00:00:00Z",
    invoiceDateUtc: "2026-10-01T00:00:00Z",
    totalAmount: "1250.50",
    currencySymbol: "$",
    invoiceStatus: "PendingPayment",
    isOverdue: true,
    statusLabel: "Overdue",
    canMarkAsPaid: true,
    canCancel: true,
    canSend: true,
    ...overrides,
  }
}

/** Stubs the list query in one state; `refetch` is returned so a test can assert Retry reached it. */
function givenListState(state: { data?: unknown; isError?: boolean; error?: unknown }) {
  const refetch = vi.fn()
  useCustomInvoiceListMock.mockReturnValue({
    data: state.data,
    isLoading: !state.data && !state.isError,
    isError: Boolean(state.isError),
    error: state.error ?? null,
    isFetching: false,
    refetch,
  })
  return refetch
}

/** Stubs the list query as a settled page holding the given rows. */
function givenRows(rows: CustomInvoiceListItem[], total = rows.length) {
  givenListState({ data: { items: rows, total, page: 1, pageSize: 10, totalPages: Math.ceil(total / 10) } })
}

/** The wide-screen table; the mobile cards render too in jsdom, where CSS breakpoints do not apply. */
function tableRow(invoiceNo: string) {
  return within(screen.getByRole("table")).getByRole("link", { name: invoiceNo }).closest("tr") as HTMLElement
}

function renderAt(path = "/organizer/custom-invoices/list") {
  return render(
    <ChakraProvider value={system}>
      <MemoryRouter initialEntries={[path]}>
        <CustomInvoicesListPage />
      </MemoryRouter>
    </ChakraProvider>,
  )
}

beforeEach(() => {
  useCustomInvoiceListMock.mockReset()
})

describe("CustomInvoicesListPage rows", () => {
  /** The invoice number is the way into an invoice; it must open the editor, not the registration detail page. */
  it("ListPage_Row_InvoiceNumberLinksToTheEditor", () => {
    givenRows([buildRow()])

    renderAt()

    for (const link of screen.getAllByRole("link", { name: "CI-0007" })) {
      expect(link).toHaveAttribute("href", "/organizer/custom-invoices/inv-7/edit")
    }
  })

  /** A row names its module, the billed record and category, and shows Overdue rather than Pending Payment once past due. */
  it("ListPage_Row_ShowsModuleRecordCategoryAndDerivedOverdueStatus", () => {
    givenRows([buildRow()])

    renderAt()

    const row = tableRow("CI-0007")
    expect(within(row).getByText("Donation")).toBeInTheDocument()
    expect(within(row).getByText("Spring Appeal")).toBeInTheDocument()
    expect(within(row).getByText("Gold Sponsor")).toBeInTheDocument()
    expect(within(row).getByText("$1,250.50")).toBeInTheDocument()
    expect(within(row).getByText("Overdue")).toBeInTheDocument()
  })

  /** An invoice whose record was deleted stays listed and says so, instead of an empty For cell. */
  it("ListPage_RecordGone_ReadsNoLongerAvailable", () => {
    givenRows([buildRow({ entityName: "" })])

    renderAt()

    const row = tableRow("CI-0007")
    expect(within(row).getByText("No longer available")).toBeInTheDocument()
  })
})

describe("CustomInvoicesListPage states", () => {
  /** The first load shows skeleton rows and cards, never a blank area or a spinner alone. */
  it("ListPage_FirstLoad_ShowsSkeleton", () => {
    givenListState({})

    const { container } = renderAt()

    expect(container.querySelectorAll(".chakra-skeleton").length).toBeGreaterThan(0)
    expect(screen.queryByText("No custom invoices yet")).not.toBeInTheDocument()
  })

  /** A failed load says so in plain language and Retry asks the server again. */
  it("ListPage_Error_RetryRefetches", async () => {
    const user = userEvent.setup()
    const refetch = givenListState({ isError: true, error: new Error("socket hang up") })

    renderAt()

    expect(screen.getByText("Could not load invoices")).toBeInTheDocument()
    expect(screen.queryByText("socket hang up")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Try again" }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  /** With nothing filtered and nothing found, the next action is to create an invoice. */
  it("ListPage_EmptyNoFilters_OffersNewInvoice", () => {
    givenRows([])

    renderAt()

    expect(screen.getByText("No custom invoices yet")).toBeInTheDocument()
    expect(screen.getByText("Create one with New Invoice.")).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: "New Invoice" })).toHaveLength(2)
  })

  /** When filters hide every invoice, the next action is to clear them, which empties the filters in the URL. */
  it("ListPage_EmptyFiltered_OffersClearFilters", async () => {
    const user = userEvent.setup()
    givenRows([])

    renderAt("/organizer/custom-invoices/list?status=Paid")

    expect(screen.getByText("No invoices match these filters")).toBeInTheDocument()
    expect(screen.getByText("Try other filters or clear them.")).toBeInTheDocument()
    const clearButtons = screen.getAllByRole("button", { name: "Clear filters" })
    await user.click(clearButtons[clearButtons.length - 1])
    expect(screen.getByRole("button", { name: "Paid" })).toHaveAttribute("aria-pressed", "false")
  })

  /** Paging uses the shared pagination with the server's total, and changing page writes it into the URL. */
  it("ListPage_Pagination_ShowsServerTotalAndRequestsNextPage", async () => {
    const user = userEvent.setup()
    givenRows([buildRow()], 25)

    renderAt()

    expect(screen.getByText("1–10 of 25")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Next" }))
    expect(useCustomInvoiceListMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
  })

  /** From a module child, New Invoice opens the editor with that module preset and locked (D-11). */
  it("ListPage_Locked_NewInvoiceOpensEditorWithModule", () => {
    givenRows([buildRow()])

    renderAt("/organizer/custom-invoices/list?moduleType=Membership")

    expect(screen.getByRole("link", { name: "New Invoice" })).toHaveAttribute("href", "/organizer/custom-invoices/new?moduleType=Membership")
    expect(screen.getByText("Custom invoices billed to your Membership records.")).toBeInTheDocument()
  })

  /** From the standalone list, New Invoice opens the plain editor with the module left free. */
  it("ListPage_Free_NewInvoiceOpensPlainEditor", () => {
    givenRows([buildRow()])

    renderAt()

    expect(screen.getByRole("link", { name: "New Invoice" })).toHaveAttribute("href", "/organizer/custom-invoices/new")
  })

  /** Every request carries the locked module, so the server never returns another module's invoices. */
  it("ListPage_Locked_EveryRequestCarriesTheModule", () => {
    givenRows([buildRow()])

    renderAt("/organizer/custom-invoices/list?moduleType=Event&status=Overdue")

    expect(useCustomInvoiceListMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ moduleType: "Event", statuses: ["Overdue"], page: 1 }),
    )
  })
})
