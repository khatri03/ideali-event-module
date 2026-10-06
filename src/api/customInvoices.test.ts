import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  addCustomInvoiceNote,
  cancelCustomInvoice,
  createCustomInvoice,
  ENTITY_OPTIONS_PAGE_SIZE,
  fetchActiveInvoiceCategoryOptions,
  fetchCustomInvoiceEntityOptions,
  fetchCustomInvoiceLinkCandidates,
  fetchEnabledCustomInvoiceModules,
  fetchCustomInvoiceDetail,
  fetchCustomInvoiceForEdit,
  linkCustomInvoice,
  markCustomInvoiceAsPaid,
  sendCustomInvoice,
  unlinkCustomInvoice,
  updateCustomInvoice,
  type CustomInvoiceWritePayload,
} from "./customInvoices"
import { API_ROUTES } from "@/utils/routes"

const { getMock, postMock, putMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
  deleteMock: vi.fn(),
}))

vi.mock("./client", () => ({ client: { get: getMock, post: postMock, put: putMock, delete: deleteMock } }))

const PAYLOAD: CustomInvoiceWritePayload = {
  moduleType: "Membership",
  entityUniqueId: "membership-type-1",
  categoryUniqueId: "cat-1",
  dueDateUtc: "2026-12-31T00:00:00.000Z",
  companyName: "Acme Corp",
  lastName: "Doe",
  email: "buyer@acme.test",
  lineItems: [{ description: "Annual dues", amount: "120.00" }],
}

const DETAIL = {
  InvoiceUniqueId: "invoice-1",
  InvoiceNo: "CI-1001",
  InvoiceStatus: "PendingPayment",
  InvoiceStatusLabel: "Pending Payment",
  InvoiceDateUtc: "2026-10-01T00:00:00Z",
  ModuleType: "Event",
  EntityUniqueId: "evt-1",
  EntityName: "Annual Convention",
  CategoryName: "Gold Sponsor",
  DueDateUtc: "2026-12-31T00:00:00Z",
  IsOverdue: true,
  SpecialNotes: "Net 30",
  CompanyName: "Acme Corp",
  BuyerFirstName: "Jane",
  BuyerMiddleName: null,
  BuyerLastName: "Doe",
  BuyerName: "Jane Doe",
  BuyerEmail: "buyer@acme.test",
  BuyerPhone: null,
  SubTotal: 1500.5,
  TotalAmount: "1500.50",
  BalanceAmount: "1500.50",
  CurrencySymbol: "$",
  LineItems: [{ InvoiceItemUniqueId: "line-1", Description: "Gold sponsorship", Amount: 1500.5 }],
  LinkedInvoice: { InvoiceUniqueId: "invoice-2", InvoiceNo: "CI-1002", InvoiceStatusLabel: "Paid" },
  LastSentAtUtc: "2026-10-03T14:30:00Z",
  Notes: [{ Note: "Called finance", CreatedBy: "Org Admin", CreatedOnUtc: "2026-10-02T00:00:00Z" }],
  Payments: [],
  CanEdit: true,
  CanMarkAsPaid: true,
  CanCancel: true,
  CanPayOnline: true,
  CanSend: false,
}

function envelope(data: unknown) {
  return { data: { success: true, data } }
}

beforeEach(() => {
  getMock.mockReset()
  postMock.mockReset().mockResolvedValue({})
  putMock.mockReset().mockResolvedValue({})
  deleteMock.mockReset().mockResolvedValue({})
})

describe("createCustomInvoice", () => {
  /** The create goes to the module-agnostic route and carries what it bills, so the server can resolve ownership per module. */
  it("Create_PostsToTheCustomInvoicesRouteWithModuleAndEntity", async () => {
    postMock.mockResolvedValue(envelope("invoice-1"))

    await createCustomInvoice(PAYLOAD)

    expect(postMock).toHaveBeenCalledWith("/api/organizer/custom-invoices", PAYLOAD)
  })

  /** The page routes to the created invoice, so the id must come back whichever way the endpoint wraps it. */
  it.each([
    ["bare id", "invoice-1"],
    ["camelCase object", { invoiceUniqueId: "invoice-1" }],
    ["PascalCase object", { InvoiceUniqueId: "invoice-1" }],
  ])("Create_ResponseCarries%s_ReturnsTheInvoiceId", async (_shape, data) => {
    postMock.mockResolvedValue(envelope(data))

    await expect(createCustomInvoice(PAYLOAD)).resolves.toBe("invoice-1")
  })

  /** A response without a usable id rejects rather than routing the organizer to an invoice that does not exist. */
  it.each([
    ["no id", { success: true, data: {} }],
    ["empty id", { success: true, data: "" }],
    ["not an envelope", "<html></html>"],
  ])("Create_MalformedResponse_%s_Rejects", async (_case, body) => {
    postMock.mockResolvedValue({ data: body })

    await expect(createCustomInvoice(PAYLOAD)).rejects.toThrow()
  })
})

describe("updateCustomInvoice", () => {
  /** An edit PUTs the whole body, binding included, to the invoice's own route; the server refuses a changed binding. */
  it("Update_PutsTheBodyWithModuleAndEntityToTheCustomInvoiceRoute", async () => {
    await updateCustomInvoice("invoice-1", PAYLOAD)

    expect(putMock).toHaveBeenCalledWith("/api/organizer/custom-invoices/invoice-1", PAYLOAD)
  })
})

describe("updateCustomInvoice link", () => {
  /** An edit repeats the invoice's current link, so saving the form never silently drops a link made elsewhere. */
  it("updateCustomInvoice_SendsLinkedInvoiceUniqueId", async () => {
    const linked = { ...PAYLOAD, linkedInvoiceUniqueId: "invoice-2" }

    await updateCustomInvoice("invoice-1", linked)

    expect(putMock).toHaveBeenCalledWith("/api/organizer/custom-invoices/invoice-1", expect.objectContaining({ linkedInvoiceUniqueId: "invoice-2" }))
  })
})

describe("fetchCustomInvoiceForEdit", () => {
  const FOR_EDIT = {
    InvoiceUniqueId: "invoice-1",
    ModuleType: "Event",
    EntityUniqueId: "evt-1",
    EntityName: "Annual Convention",
    CategoryUniqueId: "cat-1",
    DueDateUtc: "2026-12-31T00:00:00Z",
    CompanyName: "Acme Corp",
    FirstName: null,
    MiddleName: null,
    LastName: "Doe",
    CellPhone: null,
    Email: "buyer@acme.test",
    SpecialNotes: null,
    InvoiceStatus: "PendingPayment",
    CanEdit: true,
    LineItems: [{ Description: "Gold sponsorship", Amount: 1500 }],
  }

  /** The form prefills from the edit route, keeping the stored module and record so the update can repeat them. */
  it("ForEdit_LoadsFromTheEditRoute_AndKeepsTheBinding", async () => {
    getMock.mockResolvedValue(envelope(FOR_EDIT))

    const invoice = await fetchCustomInvoiceForEdit("invoice-1")

    expect(getMock).toHaveBeenCalledWith("/api/organizer/custom-invoices/invoice-1/edit")
    expect(invoice).toMatchObject({ moduleType: "Event", entityUniqueId: "evt-1", entityName: "Annual Convention" })
  })

  /** Null text fields become empty inputs and amounts stay decimal text, so the form never shows "null" or a float. */
  it("ForEdit_NullFieldsAndNumericAmounts_AreNormalised", async () => {
    getMock.mockResolvedValue(envelope(FOR_EDIT))

    const invoice = await fetchCustomInvoiceForEdit("invoice-1")

    expect(invoice.firstName).toBe("")
    expect(invoice.specialNotes).toBe("")
    expect(invoice.lineItems).toEqual([{ description: "Gold sponsorship", amount: "1500" }])
  })

  /** A module the custom invoice cannot bill, or a missing id, rejects instead of rendering a form bound to nothing. */
  it.each([
    ["unknown module", { ...FOR_EDIT, ModuleType: "Auction" }],
    ["missing id", { ...FOR_EDIT, InvoiceUniqueId: undefined }],
    ["no payload", null],
  ])("ForEdit_Malformed_%s_Rejects", async (_case, data) => {
    getMock.mockResolvedValue(envelope(data))

    await expect(fetchCustomInvoiceForEdit("invoice-1")).rejects.toThrow()
  })
})

describe("fetchCustomInvoiceDetail", () => {
  /** The detail comes from the custom-invoices route, never the ticket-order route that no longer serves it. */
  it("Detail_LoadsFromTheCustomInvoicesRoute", async () => {
    getMock.mockResolvedValue(envelope(DETAIL))

    await fetchCustomInvoiceDetail("invoice-1")

    expect(getMock).toHaveBeenCalledWith("/api/organizer/custom-invoices/invoice-1")
  })

  /** Every field the page renders survives normalisation, with money kept as decimal text. */
  it("Detail_NormalisesBindingBuyerMoneyLinesLinkAndNotes", async () => {
    getMock.mockResolvedValue(envelope(DETAIL))

    const detail = await fetchCustomInvoiceDetail("invoice-1")

    expect(detail).toMatchObject({
      moduleType: "Event",
      entityUniqueId: "evt-1",
      entityName: "Annual Convention",
      categoryName: "Gold Sponsor",
      isOverdue: true,
      companyName: "Acme Corp",
      buyerFirstName: "Jane",
      buyerMiddleName: null,
      subTotal: "1500.5",
      totalAmount: "1500.50",
      lineItems: [{ invoiceItemUniqueId: "line-1", description: "Gold sponsorship", amount: "1500.5" }],
      linkedInvoice: { invoiceUniqueId: "invoice-2", invoiceNo: "CI-1002", invoiceStatusLabel: "Paid" },
      notes: [{ note: "Called finance", createdBy: "Org Admin", createdOnUtc: "2026-10-02T00:00:00Z" }],
      canEdit: true,
      canSend: false,
    })
  })

  /** The last send time is read as the server wrote it, so the editor can say when the buyer was emailed. */
  it("fetchCustomInvoiceDetail_ParsesLastSentAtUtc", async () => {
    getMock.mockResolvedValue(envelope(DETAIL))

    const detail = await fetchCustomInvoiceDetail("invoice-1")

    expect(detail.lastSentAtUtc).toBe("2026-10-03T14:30:00Z")
  })

  /** An invoice never emailed, or a server that omits the field, reads as never sent rather than sent at an unknown time. */
  it.each([
    ["absent", undefined],
    ["null", null],
  ])("fetchCustomInvoiceDetail_LastSentAtUtc%s_IsNull", async (_case, lastSentAtUtc) => {
    getMock.mockResolvedValue(envelope({ ...DETAIL, LastSentAtUtc: lastSentAtUtc }))

    const detail = await fetchCustomInvoiceDetail("invoice-1")

    expect(detail.lastSentAtUtc).toBeNull()
  })

  /** A standalone invoice, and one whose server omits action flags, reads as not linked and offers no action. */
  it("Detail_AbsentLinkAndFlags_ReadAsNotLinkedAndDenied", async () => {
    const standalone: Record<string, unknown> = { ...DETAIL }
    delete standalone.LinkedInvoice
    delete standalone.CanMarkAsPaid
    delete standalone.CanCancel
    getMock.mockResolvedValue(envelope(standalone))

    const detail = await fetchCustomInvoiceDetail("invoice-1")

    expect(detail.linkedInvoice).toBeNull()
    expect(detail.canMarkAsPaid).toBe(false)
    expect(detail.canCancel).toBe(false)
  })

  /** A response that is not a custom invoice rejects, so the page shows its error state instead of a blank invoice. */
  it.each([
    ["missing id", { ...DETAIL, InvoiceUniqueId: "" }],
    ["unknown module", { ...DETAIL, ModuleType: "Auction" }],
    ["no payload", null],
  ])("Detail_Malformed_%s_Rejects", async (_case, data) => {
    getMock.mockResolvedValue(envelope(data))

    await expect(fetchCustomInvoiceDetail("invoice-1")).rejects.toThrow()
  })
})

describe("custom invoice actions", () => {
  /** The source travels in the route and the target in the body, exactly as the backend binds them. */
  it("Link_PostsTheTargetToTheCustomLinkRoute", async () => {
    await linkCustomInvoice("invoice-1", "invoice-2")

    expect(postMock).toHaveBeenCalledWith("/api/organizer/custom-invoices/invoice-1/link", {
      targetInvoiceUniqueId: "invoice-2",
    })
  })

  /** Unlinking is a DELETE on the same resource, carrying no body. */
  it("Unlink_DeletesOnTheCustomLinkRoute", async () => {
    await unlinkCustomInvoice("invoice-1")

    expect(deleteMock).toHaveBeenCalledWith("/api/organizer/custom-invoices/invoice-1/link")
  })

  /** Settling by hand goes to the custom invoice's own mark-paid route. */
  it("MarkPaid_PostsToTheCustomRoute", async () => {
    await markCustomInvoiceAsPaid("invoice-1")

    expect(postMock).toHaveBeenCalledWith("/api/organizer/custom-invoices/invoice-1/mark-paid")
  })

  /** Cancelling records the trimmed reason, so stray whitespace never lands on the note trail. */
  it("Cancel_PostsTheTrimmedNoteToTheCustomRoute", async () => {
    await cancelCustomInvoice("invoice-1", "  Sponsor withdrew  ")

    expect(postMock).toHaveBeenCalledWith("/api/organizer/custom-invoices/invoice-1/cancel", { note: "Sponsor withdrew" })
  })

  /** Emailing the invoice uses the send route, not the ticket-order resend. */
  it("Send_PostsToTheSendRoute", async () => {
    await sendCustomInvoice("invoice-1")

    expect(postMock).toHaveBeenCalledWith("/api/organizer/custom-invoices/invoice-1/send")
  })

  /** A note is trimmed and posted to the custom invoice's add-note route. */
  it("AddNote_PostsTheTrimmedNoteToTheCustomRoute", async () => {
    await addCustomInvoiceNote("invoice-1", "  Call finance.  ")

    expect(postMock).toHaveBeenCalledWith("/api/organizer/custom-invoices/invoice-1/add-note", { note: "Call finance." })
  })
})

describe("fetchActiveInvoiceCategoryOptions", () => {
  /** Only active categories are offered, so a retired sponsorship type can never be billed again. */
  it("CategoryOptions_ReturnsOnlyActiveCategories", async () => {
    getMock.mockResolvedValue(
      envelope({
        PageData: [
          { UniqueId: "cat-1", Name: "Gold Sponsor", IsActive: true },
          { UniqueId: "cat-2", Name: "Retired Tier", IsActive: false },
        ],
      }),
    )

    const options = await fetchActiveInvoiceCategoryOptions()

    expect(getMock.mock.calls[0][0]).toBe(API_ROUTES.invoiceCategories)
    expect(options).toEqual([{ uniqueId: "cat-1", name: "Gold Sponsor" }])
  })
})

describe("fetchEnabledCustomInvoiceModules", () => {
  /** The module control offers exactly the modules the admin turned on, in the server's order. */
  it("fetchEnabledCustomInvoiceModules_ParsesModuleList", async () => {
    getMock.mockResolvedValue(envelope(["Event", "Donation"]))

    const modules = await fetchEnabledCustomInvoiceModules()

    expect(getMock.mock.calls[0][0]).toBe(API_ROUTES.customInvoiceEnabledModules)
    expect(modules).toEqual(["Event", "Donation"])
  })

  /** A module name the app does not know must fail loudly rather than reach the picker as a blank option. */
  it("fetchEnabledCustomInvoiceModules_UnknownModule_Throws", async () => {
    getMock.mockResolvedValue(envelope(["Event", "Parking"]))

    await expect(fetchEnabledCustomInvoiceModules()).rejects.toThrow()
  })
})

describe("fetchCustomInvoiceEntityOptions", () => {
  /** Search and paging travel to the server in one request so the dropdown never pulls the full set. */
  it("fetchCustomInvoiceEntityOptions_SendsModuleTermAndPagingAsQueryParams", async () => {
    getMock.mockResolvedValue(
      envelope({ PageNo: 2, PageSize: 20, PageCount: 3, TotalRecordsCount: 45, PageData: [{ UniqueId: "m-1", Name: "Gold" }] }),
    )

    const page = await fetchCustomInvoiceEntityOptions({ moduleType: "Membership", searchTerm: " gol ", pageNo: 2 })

    const [url, config] = getMock.mock.calls[0]
    expect(url).toBe(API_ROUTES.customInvoiceEntityOptions)
    const params = config.params as URLSearchParams
    expect(params.get("moduleType")).toBe("Membership")
    expect(params.get("searchTerm")).toBe("gol")
    expect(params.get("pageNo")).toBe("2")
    expect(params.get("pageSize")).toBe(String(ENTITY_OPTIONS_PAGE_SIZE))
    expect(page).toEqual({ items: [{ uniqueId: "m-1", name: "Gold" }], pageNo: 2, pageCount: 3, total: 45 })
  })

  /** A page missing its rows is refused at the boundary instead of rendering an empty dropdown as if nothing matched. */
  it("fetchCustomInvoiceEntityOptions_MalformedPage_Throws", async () => {
    getMock.mockResolvedValue(envelope({ PageNo: 1, PageCount: 1, TotalRecordsCount: 1 }))

    await expect(
      fetchCustomInvoiceEntityOptions({ moduleType: "Event", searchTerm: "", pageNo: 1 }),
    ).rejects.toThrow()
  })
})

describe("fetchCustomInvoiceLinkCandidates", () => {
  const CANDIDATE_ROW = {
    InvoiceUniqueId: "inv-42",
    InvoiceNo: "INV-0042",
    CompanyName: "Acme Corp",
    BuyerFirstName: "Jane",
    BuyerMiddleName: null,
    BuyerLastName: "Doe",
    BuyerName: "Jane Doe",
    BuyerEmail: "jane@acme.test",
    InvoiceDateUtc: "2026-09-01T00:00:00Z",
    InvoiceStatus: "Paid",
    InvoiceStatusLabel: "Paid",
  }

  /**
   * The picker is searched and paged on the server for one module and leaves out the invoice being linked
   * from, so the client never pulls the full list or offers a link the server would refuse.
   */
  it("fetchCustomInvoiceLinkCandidates_SendsModuleTermPagingAndExclude", async () => {
    getMock.mockResolvedValue(envelope({ PageNo: 2, PageSize: 10, PageCount: 3, TotalRecordsCount: 25, PageData: [CANDIDATE_ROW] }))

    const page = await fetchCustomInvoiceLinkCandidates({
      moduleType: "Membership",
      searchTerm: " acme ",
      pageNo: 2,
      pageSize: 10,
      excludeInvoiceUniqueId: "inv-self",
    })

    const [url, config] = getMock.mock.calls[0]
    expect(url).toBe(API_ROUTES.customInvoiceLinkCandidates)
    const params = config.params as URLSearchParams
    expect(Object.fromEntries(params)).toEqual({
      moduleType: "Membership",
      searchTerm: "acme",
      pageNo: "2",
      pageSize: "10",
      excludeInvoiceUniqueId: "inv-self",
    })
    expect(page.total).toBe(25)
    expect(page.totalPages).toBe(3)
    expect(page.items[0]).toMatchObject({ invoiceUniqueId: "inv-42", invoiceNo: "INV-0042", buyerMiddleName: null, buyerEmail: "jane@acme.test" })
  })

  /** A new invoice has nothing to exclude, so the parameter is left off rather than sent empty. */
  it("fetchCustomInvoiceLinkCandidates_NoExclude_OmitsTheParameter", async () => {
    getMock.mockResolvedValue(envelope({ PageNo: 1, PageSize: 20, PageCount: 0, TotalRecordsCount: 0, PageData: [] }))

    await fetchCustomInvoiceLinkCandidates({ moduleType: "Event", searchTerm: "", pageNo: 1, pageSize: 20 })

    expect((getMock.mock.calls[0][1].params as URLSearchParams).has("excludeInvoiceUniqueId")).toBe(false)
  })

  /** A page missing its rows is refused at the boundary instead of rendering as "nothing to link to". */
  it("fetchCustomInvoiceLinkCandidates_MalformedPage_Throws", async () => {
    getMock.mockResolvedValue(envelope({ PageNo: 1, PageCount: 1, TotalRecordsCount: 1 }))

    await expect(
      fetchCustomInvoiceLinkCandidates({ moduleType: "Event", searchTerm: "", pageNo: 1, pageSize: 20 }),
    ).rejects.toThrow()
  })
})
