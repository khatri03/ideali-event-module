import { AxiosError } from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { ChakraProvider } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { CustomInvoiceDetail } from "@/api/customInvoices"
import { system } from "@/theme"
import { API_ROUTES, APP_ROUTES } from "@/utils/routes"
import CustomInvoiceDetailPage from "./CustomInvoiceDetailPage"

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
vi.mock("@/api/client", () => ({ client: http }))
vi.mock("@/lib/toaster", () => ({ toaster: { create: vi.fn() } }))

const INVOICE_ID = "invoice-1"

const INVOICE: CustomInvoiceDetail = {
  invoiceUniqueId: INVOICE_ID,
  invoiceNo: "CINV-3001",
  invoiceStatus: "PendingPayment",
  invoiceStatusLabel: "Pending Payment",
  invoiceDateUtc: "2026-08-01T10:00:00Z",
  moduleType: "Event",
  entityUniqueId: "event-1",
  entityName: "Annual Convention",
  categoryName: "Gold Sponsor",
  dueDateUtc: "2026-01-01T00:00:00Z",
  isOverdue: true,
  specialNotes: "Bill to head office.",
  companyName: "Northwind Traders",
  buyerFirstName: "Ada",
  buyerMiddleName: "K",
  buyerLastName: "Lovelace",
  buyerName: "Ada K Lovelace",
  buyerEmail: "ada@example.com",
  buyerPhone: null,
  subTotal: "1800.75",
  totalAmount: "1800.75",
  balanceAmount: "1800.75",
  currencySymbol: "$",
  lineItems: [
    { invoiceItemUniqueId: "cline-1", description: "Headline sponsorship", amount: "1500.50" },
    { invoiceItemUniqueId: "cline-2", description: "Booth space", amount: "300.25" },
  ],
  linkedInvoice: null,
  lastSentAtUtc: null,
  notes: [{ note: "Sent to finance.", createdBy: "Org Admin", createdOnUtc: "2026-08-02T10:00:00Z" }],
  payments: [
    {
      paymentMethod: "CreditCard",
      paymentStatus: "Failed",
      paymentStatusLabel: "Failed",
      amount: "1800.75",
      referenceNo: "pi_123",
      errorMessage: "Card declined",
      paymentDateUtc: "2026-08-03T10:00:00Z",
    },
  ],
  canEdit: true,
  canMarkAsPaid: true,
  canCancel: true,
  canPayOnline: true,
  canSend: true,
}

/** The detail as the API would serialise it, so the page runs through the real hooks and normaliser. */
function detailResponse(overrides: Partial<CustomInvoiceDetail> = {}) {
  return { data: { success: true, data: { ...INVOICE, ...overrides } } }
}

function notFound() {
  return new AxiosError("Not Found", "404", undefined, undefined, {
    status: 404,
    data: {},
    statusText: "Not Found",
    headers: {},
    config: { headers: {} },
  } as never)
}

function CurrentPath() {
  const location = useLocation()
  return <div data-testid="current-path">{`${location.pathname}${location.search}`}</div>
}

function renderPage({ returnTo }: { returnTo?: unknown } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[
            { pathname: APP_ROUTES.customInvoices.detail(INVOICE_ID), state: returnTo === undefined ? undefined : { returnTo } },
          ]}
        >
          <CurrentPath />
          <Routes>
            <Route path={APP_ROUTES.customInvoices.list} element={<div>Invoice list</div>} />
            <Route path={APP_ROUTES.customInvoices.detailRoute} element={<CustomInvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ChakraProvider>,
  )
}

async function confirmIn(dialogName: RegExp | string, user: ReturnType<typeof userEvent.setup>) {
  const dialog = await screen.findByRole("alertdialog")
  await user.click(within(dialog).getByRole("button", { name: dialogName }))
}

describe("CustomInvoiceDetailPage", () => {
  beforeEach(() => {
    Object.values(http).forEach((mock) => mock.mockReset())
    http.get.mockResolvedValue(detailResponse())
    http.post.mockResolvedValue({ data: { success: true } })
  })

  /** The page reads the custom-invoices route and shows everything v1.0 showed: buyer, category, due date, notes, lines and payments. */
  it("CustomDetail_LoadsFromTheCustomInvoicesRoute_AndShowsBuyerCategoryDueDateNotesLinesAndPayments", async () => {
    renderPage()

    expect(await screen.findByText("Northwind Traders")).toBeInTheDocument()
    expect(http.get).toHaveBeenCalledWith(API_ROUTES.customInvoiceDetail(INVOICE_ID))
    expect(screen.getByText("Ada K Lovelace")).toBeInTheDocument()
    expect(screen.getByText("Gold Sponsor")).toBeInTheDocument()
    expect(screen.getByText(/Overdue/)).toBeInTheDocument()
    expect(screen.getByText("Bill to head office.")).toBeInTheDocument()
    expect(screen.getByText("Headline sponsorship")).toBeInTheDocument()
    expect(screen.getByText("Grand total")).toBeInTheDocument()
    expect(screen.getByText("Card declined")).toBeInTheDocument()
    expect(screen.getByText("Sent to finance.")).toBeInTheDocument()
  })

  /** An Event-bound invoice names its event and opens it, so the organizer can reach the record it bills. */
  it("CustomDetail_EventBound_HeaderLinksToTheEvent", async () => {
    renderPage()

    expect(await screen.findByRole("link", { name: "Event: Annual Convention" })).toHaveAttribute(
      "href",
      APP_ROUTES.eventWizard.edit("event-1"),
    )
  })

  /**
   * A record from another module has no event screen, so it is named with its module label as text and never
   * as a broken event link.
   */
  it.each([
    ["Membership", "Gold Membership", "Membership: Gold Membership"],
    ["Donation", "Winter Appeal", "Campaign: Winter Appeal"],
  ] as const)("CustomDetail_%sBound_ShowsTheLabelledRecordNameWithoutALink", async (moduleType, entityName, label) => {
    http.get.mockResolvedValue(detailResponse({ moduleType, entityUniqueId: "record-1", entityName }))
    renderPage()

    expect(await screen.findByText(label)).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: new RegExp(entityName, "i") })).not.toBeInTheDocument()
  })

  /** A deleted record has no name; the header drops the line rather than print a dangling "Membership:". */
  it("CustomDetail_EntityNameMissing_ShowsNoEntityLine", async () => {
    http.get.mockResolvedValue(detailResponse({ moduleType: "Membership", entityUniqueId: "record-1", entityName: null }))
    renderPage()

    expect(await screen.findByText("Northwind Traders")).toBeInTheDocument()
    expect(screen.queryByText(/Membership:/)).not.toBeInTheDocument()
  })

  /** An invoice that is gone or not the organizer's says so and offers no retry that cannot succeed. */
  it("CustomDetail_NotFound_ShowsTheMissingState", async () => {
    http.get.mockRejectedValue(notFound())
    renderPage()

    expect(await screen.findByText("Invoice not found")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument()
  })

  /** A transient failure explains itself and retries the same custom-invoices route. */
  it("CustomDetail_Error_ShowsRetry", async () => {
    http.get.mockRejectedValueOnce(new Error("boom")).mockRejectedValueOnce(new Error("boom"))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole("button", { name: /try again/i }, { timeout: 3000 }))

    await waitFor(() => expect(screen.getByText("Northwind Traders")).toBeInTheDocument())
  })

  /** While the invoice loads the page shows its skeleton, never an empty area. */
  it("CustomDetail_Loading_ShowsTheSkeleton", () => {
    http.get.mockReturnValue(new Promise(() => undefined))
    const { container } = renderPage()

    expect(container.querySelectorAll(".chakra-skeleton").length).toBeGreaterThan(0)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  /** Marking paid by hand settles through the custom invoice's own route, not the ticket-order route. */
  it("CustomDetail_MarkPaid_CallsTheCustomRoute", async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole("button", { name: /mark as paid/i }))
    await confirmIn(/^mark as paid$/i, user)

    await waitFor(() => expect(http.post).toHaveBeenCalledWith(API_ROUTES.customInvoiceMarkPaid(INVOICE_ID)))
  })

  /** The cancellation reason travels to the custom cancel route, so it lands on this invoice's note trail. */
  it("CustomDetail_Cancel_SendsNotesToTheCustomRoute", async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole("button", { name: /mark as cancelled/i }))
    const dialog = await screen.findByRole("alertdialog")
    await user.type(within(dialog).getByLabelText(/reason for cancelling/i), "Sponsor withdrew.")
    await user.click(within(dialog).getByRole("button", { name: /^cancel invoice$/i }))

    await waitFor(() =>
      expect(http.post).toHaveBeenCalledWith(API_ROUTES.customInvoiceCancel(INVOICE_ID), { note: "Sponsor withdrew." }),
    )
  })

  /** Emailing the invoice uses the send route the server allows, never the ticket-order resend. */
  it("CustomDetail_Email_CallsTheSendRoute", async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole("button", { name: /email invoice to buyer/i }))
    await confirmIn(/^send invoice$/i, user)

    await waitFor(() => expect(http.post).toHaveBeenCalledWith(API_ROUTES.customInvoiceSend(INVOICE_ID)))
  })

  /** A note added here is written to the custom invoice, through the same dialog v1.0 shipped. */
  it("CustomDetail_AddNote_CallsTheCustomRoute", async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole("button", { name: /add note/i }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "Chased head office." } })
    await user.click(within(dialog).getByRole("button", { name: /save note/i }))

    await waitFor(() =>
      expect(http.post).toHaveBeenCalledWith(API_ROUTES.customInvoiceAddNote(INVOICE_ID), { note: "Chased head office." }),
    )
  })

  /** A paid invoice has nothing left to settle, send or edit, so none of those actions is offered. */
  it("CustomDetail_PaidInvoice_OffersNoSettlementOrEmailAndNoEditLink", async () => {
    http.get.mockResolvedValue(
      detailResponse({
        invoiceStatus: "Paid",
        invoiceStatusLabel: "Paid",
        isOverdue: false,
        canEdit: false,
        canMarkAsPaid: false,
        canCancel: false,
        canPayOnline: false,
        canSend: false,
      }),
    )
    renderPage()

    expect(await screen.findByText("This invoice is Paid, so it can't be paid online.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /mark as paid/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /mark as cancelled/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /email invoice to buyer/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /^edit$/i })).not.toBeInTheDocument()
  })

  /** An editable invoice offers Edit, and it opens the custom-invoice form for this invoice. */
  it("CustomDetail_EditLink_PointsAtTheCustomEditRoute", async () => {
    renderPage()

    expect(await screen.findByRole("link", { name: /^edit$/i })).toHaveAttribute(
      "href",
      APP_ROUTES.customInvoices.edit(INVOICE_ID),
    )
  })

  /** The shared link must land on this invoice's buyer pay page at the configured buyer origin. */
  it("CustomDetail_PayableLink_UsesTheCustomInvoicesPayUrl", async () => {
    renderPage()

    expect(await screen.findByText("https://pay.example.test/custom-invoices/invoice-1/pay")).toBeInTheDocument()
  })

  /** A standalone invoice says it is not linked and offers to link one. */
  it("CustomDetail_NotLinked_OffersLinkInvoice", async () => {
    renderPage()

    expect(await screen.findByText("Not linked to another invoice.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Link invoice" })).toBeInTheDocument()
  })

  /** The server refuses a link from a cancelled invoice, so its detail does not offer one. */
  it("CustomDetail_Cancelled_OffersNoLinkInvoiceAction", async () => {
    http.get.mockResolvedValue(detailResponse({ invoiceStatus: "Cancelled", invoiceStatusLabel: "Cancelled" }))
    renderPage()

    expect(await screen.findByText("Not linked to another invoice.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Link invoice" })).not.toBeInTheDocument()
  })

  /** Back returns to the filtered list the invoice was opened from. */
  it("CustomDetail_OpenedFromAFilteredList_ReturnsToThatSameList", async () => {
    const user = userEvent.setup()
    renderPage({ returnTo: "/organizer/custom-invoices/list?moduleType=Event&status=Paid" })

    await screen.findByText("Northwind Traders")
    await user.click(screen.getByRole("button", { name: /back to invoices/i }))

    expect(screen.getByTestId("current-path")).toHaveTextContent("/organizer/custom-invoices/list?moduleType=Event&status=Paid")
  })

  /** A history state pointing off-site is refused in favour of the list, so back can never become an open redirect. */
  it("CustomDetail_ReturnPathPointingOffSite_IsRefusedInFavourOfTheList", async () => {
    const user = userEvent.setup()
    renderPage({ returnTo: "//evil.example.com/steal" })

    await screen.findByText("Northwind Traders")
    await user.click(screen.getByRole("button", { name: /back to invoices/i }))

    expect(screen.getByTestId("current-path")).toHaveTextContent(APP_ROUTES.customInvoices.list)
  })

  /** A custom invoice opened without a recorded list (a deep link) backs out to the custom invoices list, where it lives. */
  it("DetailPage_NoReturnTo_BackGoesToCustomInvoicesList", async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText("Northwind Traders")
    await user.click(screen.getByRole("button", { name: /back to invoices/i }))

    expect(screen.getByTestId("current-path")).toHaveTextContent(APP_ROUTES.customInvoices.list)
  })
})
