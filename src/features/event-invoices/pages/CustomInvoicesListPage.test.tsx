import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import type { CustomInvoiceListItem } from "@/api/customInvoices"
import { CustomInvoicesListPage } from "./CustomInvoicesListPage"

const { useCustomInvoiceListMock } = vi.hoisted(() => ({ useCustomInvoiceListMock: vi.fn() }))

vi.mock("../hooks/useCustomInvoiceList", () => ({ useCustomInvoiceList: useCustomInvoiceListMock }))

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

/** Stubs the list query as a settled page holding the given rows. */
function givenRows(rows: CustomInvoiceListItem[]) {
  useCustomInvoiceListMock.mockReturnValue({
    data: { items: rows, total: rows.length, page: 1, pageSize: 20, totalPages: 1 },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  })
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

    expect(screen.getByRole("link", { name: "CI-0007" })).toHaveAttribute("href", "/organizer/custom-invoices/inv-7/edit")
  })

  /** A row names its module, the billed record and category, and shows Overdue rather than Pending Payment once past due. */
  it("ListPage_Row_ShowsModuleRecordCategoryAndDerivedOverdueStatus", () => {
    givenRows([buildRow()])

    renderAt()

    const row = screen.getByRole("link", { name: "CI-0007" }).closest("tr") as HTMLElement
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

    const row = screen.getByRole("link", { name: "CI-0007" }).closest("tr") as HTMLElement
    expect(within(row).getByText("No longer available")).toBeInTheDocument()
  })
})
