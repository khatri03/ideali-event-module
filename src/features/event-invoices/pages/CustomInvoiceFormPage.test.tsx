import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ChakraProvider } from "@chakra-ui/react"
import { AxiosError } from "axios"
import { system } from "@/theme"
import { API_ROUTES, APP_ROUTES } from "@/utils/routes"
import { CustomInvoiceFormPage } from "./CustomInvoiceFormPage"

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
vi.mock("@/api/client", () => ({ client: http }))
const toasterCreate = vi.hoisted(() => vi.fn())
vi.mock("@/lib/toaster", () => ({ toaster: { create: toasterCreate } }))

const navigateMock = vi.hoisted(() => vi.fn())
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>()
  return { ...actual, useNavigate: () => navigateMock }
})

const EDIT_ID = "inv-99"
const NEW_ID = "new-invoice-id"
const CREATE_ACTION = /^Create( and email)? invoice$/

function envelope(data: unknown) {
  return { data: { success: true, Data: data } }
}

const ENTITIES: Record<string, { UniqueId: string; Name: string }[]> = {
  Event: [{ UniqueId: "evt-1", Name: "Annual Convention" }],
  Membership: [
    { UniqueId: "mem-gold", Name: "Gold" },
    { UniqueId: "mem-silver", Name: "Silver" },
  ],
}

function entityOptionsResponse(params: URLSearchParams) {
  const term = (params.get("searchTerm") ?? "").toLowerCase()
  const rows = (ENTITIES[params.get("moduleType") ?? ""] ?? []).filter((row) => row.Name.toLowerCase().includes(term))
  return envelope({ PageNo: 1, PageSize: 20, PageCount: 1, TotalRecordsCount: rows.length, PageData: rows })
}

interface ServerSetup {
  enabledModules?: string[]
  edit?: () => Promise<unknown>
  detail?: () => Promise<unknown>
}

/** Answers every GET the editor makes, with the enabled modules and the edit load swappable per test. */
function serverGet({ enabledModules = ["Event", "Membership"], edit, detail }: ServerSetup = {}) {
  return (url: string, config?: { params?: URLSearchParams }) => {
    if (url === API_ROUTES.customInvoiceEnabledModules) return Promise.resolve(envelope(enabledModules))
    if (url === API_ROUTES.customInvoiceEntityOptions) return Promise.resolve(entityOptionsResponse(config?.params ?? new URLSearchParams()))
    if (url === API_ROUTES.invoiceCategories) return Promise.resolve(categoriesResponse())
    if (url === API_ROUTES.customInvoiceForEdit(EDIT_ID)) return edit ? edit() : Promise.resolve(editResponse("PendingPayment", true))
    if (url === API_ROUTES.customInvoiceDetail(EDIT_ID)) return detail ? detail() : Promise.resolve(detailResponse())
    return Promise.resolve(envelope(null))
  }
}

function categoriesResponse() {
  return {
    data: {
      success: true,
      Data: {
        PageNo: 1,
        PageSize: 200,
        PageCount: 1,
        TotalRecordsCount: 2,
        PageData: [
          { UniqueId: "cat-active", Name: "Gold Sponsor", IsActive: true, DisplayOrder: 0, CreatedOnUtc: "2026-01-01T00:00:00Z" },
          { UniqueId: "cat-inactive", Name: "Retired Tier", IsActive: false, DisplayOrder: 1, CreatedOnUtc: "2026-01-01T00:00:00Z" },
        ],
      },
    },
  }
}

function editResponse(invoiceStatus: string, canEdit: boolean, entityName = "Annual Convention") {
  return {
    data: {
      success: true,
      Data: {
        InvoiceUniqueId: EDIT_ID,
        ModuleType: "Event",
        EntityUniqueId: "evt-1",
        EntityName: entityName,
        CategoryUniqueId: "cat-active",
        DueDateUtc: "2026-12-31T00:00:00Z",
        CompanyName: "Acme Corp",
        FirstName: "Jane",
        MiddleName: "",
        LastName: "Doe",
        CellPhone: "",
        Email: "buyer@acme.test",
        SpecialNotes: "Existing note",
        InvoiceStatus: invoiceStatus,
        CanEdit: canEdit,
        LineItems: [{ Description: "Gold sponsorship", Amount: "1500.00" }],
      },
    },
  }
}

/** The saved invoice's detail as the server sends it; tests override only the fields their rule reads. */
function detailResponse(overrides: Record<string, unknown> = {}) {
  return envelope({
    InvoiceUniqueId: EDIT_ID,
    InvoiceNo: "CI-1001",
    InvoiceStatus: "PendingPayment",
    InvoiceStatusLabel: "Pending Payment",
    ModuleType: "Event",
    TotalAmount: "1500.00",
    SubTotal: "1500.00",
    CurrencySymbol: "$",
    BuyerEmail: "buyer@acme.test",
    LinkedInvoice: null,
    LastSentAtUtc: null,
    CanEdit: true,
    CanPayOnline: true,
    CanSend: true,
    ...overrides,
  })
}

function conflictError(title: string): AxiosError {
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 400,
    statusText: "Bad Request",
    headers: {},
    config: {} as never,
    data: { title, status: 400 },
  })
}

function renderPage(options?: { invoiceUniqueId?: string }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const initialPath = options?.invoiceUniqueId
    ? APP_ROUTES.customInvoices.edit(options.invoiceUniqueId)
    : APP_ROUTES.customInvoices.new

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ChakraProvider value={system}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
        </QueryClientProvider>
      </ChakraProvider>
    )
  }

  return render(
    <Routes>
      <Route path={APP_ROUTES.customInvoices.new} element={<CustomInvoiceFormPage />} />
      <Route path={APP_ROUTES.customInvoices.editRoute} element={<CustomInvoiceFormPage />} />
    </Routes>,
    { wrapper: Wrapper },
  )
}

type User = ReturnType<typeof userEvent.setup>

async function pickOption(user: User, triggerName: string, optionName: string) {
  await user.click(screen.getByRole("combobox", { name: triggerName }))
  fireEvent.click(await screen.findByRole("option", { name: optionName }))
}

async function pickEntity(user: User, fieldName: string, searchText: string, optionName: string) {
  const input = await screen.findByRole("combobox", { name: fieldName })
  await waitFor(() => expect(input).toBeEnabled())
  await user.type(input, searchText)
  fireEvent.click(await screen.findByRole("option", { name: optionName }))
}

function setValue(labelText: string, value: string) {
  fireEvent.change(screen.getByLabelText(new RegExp(labelText, "i")), { target: { value } })
}

function fillBuyerAndCharges() {
  setValue("Payment due date", "2026-12-31")
  setValue("Company name", "Acme Corp")
  setValue("Last name", "Doe")
  setValue("Email address", "buyer@acme.test")
  setValue("Description for line 1", "Gold sponsorship")
  setValue("Amount for line 1", "1500.00")
}

async function fillValidMembershipForm(user: User) {
  await pickOption(user, "Module", "Membership")
  await pickEntity(user, "Membership", "Gol", "Gold")
  await pickOption(user, "Sponsorship type", "Gold Sponsor")
  fillBuyerAndCharges()
}

async function waitForEditLoaded() {
  await waitFor(() => expect(screen.getByLabelText(/Company name/i)).toHaveValue("Acme Corp"))
}

describe("CustomInvoiceFormPage", () => {
  beforeEach(() => {
    http.get.mockReset()
    http.post.mockReset()
    http.put.mockReset()
    navigateMock.mockReset()
    toasterCreate.mockReset()

    http.get.mockImplementation(serverGet())
    http.post.mockResolvedValue(envelope(NEW_ID))
    http.put.mockResolvedValue(envelope(null))
  })

  /**
   * An organizer picks a module, then a record found by server search, and the create posts exactly that
   * binding before opening the new invoice; a wrong module or record would bill the wrong thing.
   */
  it("CustomInvoiceFormPage_CreateMembershipInvoice_PostsModuleAndEntityAndOpensDetail", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage()
    await fillValidMembershipForm(user)

    await user.click(screen.getByRole("button", { name: CREATE_ACTION }))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(APP_ROUTES.customInvoices.detail(NEW_ID)))
    const [url, body] = http.post.mock.calls[0]
    expect(url).toBe(API_ROUTES.customInvoiceCreate)
    expect(body).toMatchObject({
      moduleType: "Membership",
      entityUniqueId: "mem-gold",
      categoryUniqueId: "cat-active",
      companyName: "Acme Corp",
      lastName: "Doe",
      email: "buyer@acme.test",
      lineItems: [{ description: "Gold sponsorship", amount: "1500.00" }],
    })
  })

  /** By default a new invoice is emailed to its buyer: the create posts, then the send fires for that invoice, then its detail opens (D-13). */
  it("FormPage_CreateWithEmailOn_CreatesThenSendsThenOpensDetail", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage()
    await fillValidMembershipForm(user)

    await user.click(screen.getByRole("button", { name: "Create and email invoice" }))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(APP_ROUTES.customInvoices.detail(NEW_ID)))
    expect(http.post.mock.calls.map(([url]) => url)).toEqual([API_ROUTES.customInvoiceCreate, API_ROUTES.customInvoiceSend(NEW_ID)])
    expect(http.post.mock.calls[0][1]).not.toHaveProperty("emailOnCreate")
  })

  /** Unticking the email choice creates the invoice without emailing anyone, so the organizer can review it first. */
  it("FormPage_CreateWithEmailOff_CreatesWithoutSending", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage()
    await fillValidMembershipForm(user)
    await user.click(screen.getByRole("checkbox", { name: /Email payable link to buyer now/ }))

    await user.click(screen.getByRole("button", { name: "Create invoice" }))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(APP_ROUTES.customInvoices.detail(NEW_ID)))
    expect(http.post).toHaveBeenCalledTimes(1)
    expect(http.post).toHaveBeenCalledWith(API_ROUTES.customInvoiceCreate, expect.anything())
  })

  /**
   * A send that fails after the create must not lose the invoice: the organizer lands on its edit page, told
   * the invoice was saved but not emailed, where Email link retries (D-14).
   */
  it("FormPage_SendFailsAfterCreate_KeepsInvoiceAndOpensEditPageWithErrorToast", async () => {
    http.post.mockImplementation((url: string) =>
      url === API_ROUTES.customInvoiceSend(NEW_ID) ? Promise.reject(conflictError("Mail server unavailable.")) : Promise.resolve(envelope(NEW_ID)),
    )
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage()
    await fillValidMembershipForm(user)

    await user.click(screen.getByRole("button", { name: "Create and email invoice" }))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(APP_ROUTES.customInvoices.edit(NEW_ID)))
    expect(navigateMock).not.toHaveBeenCalledWith(APP_ROUTES.customInvoices.detail(NEW_ID))
    expect(toasterCreate).toHaveBeenCalledWith({
      type: "error",
      title: "The invoice was saved, but the email was not sent.",
      description: "Mail server unavailable.",
    })
  })

  /** A refused create emails nobody and keeps the organizer on the page, because there is no invoice to send. */
  it("FormPage_CreateFails_NoSendAndStaysOnPage", async () => {
    http.post.mockRejectedValue(conflictError("Due date is in the past."))
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage()
    await fillValidMembershipForm(user)

    await user.click(screen.getByRole("button", { name: "Create and email invoice" }))

    expect(await screen.findByText("Due date is in the past.")).toBeInTheDocument()
    expect(http.post).toHaveBeenCalledTimes(1)
    expect(navigateMock).not.toHaveBeenCalled()
  })

  /** The email choice starts ticked, so a new invoice reaches its buyer unless the organizer opts out. */
  it("DeliverySection_NewInvoice_EmailCheckboxCheckedByDefault", () => {
    renderPage()

    expect(screen.getByRole("checkbox", { name: /Email payable link to buyer now/ })).toBeChecked()
  })

  /** Submitting an empty create form blocks with inline errors naming the module and billed record, and never posts. */
  it("Submit_MissingRequiredFields_ShowsErrorsAndDoesNotPost", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage()

    await user.click(await screen.findByRole("button", { name: CREATE_ACTION }))

    expect(await screen.findByText("Choose the module this invoice bills.")).toBeInTheDocument()
    expect(screen.getByText("Choose what this invoice bills.")).toBeInTheDocument()
    expect(screen.getByText("Company name is required.")).toBeInTheDocument()
    expect(http.post).not.toHaveBeenCalled()
  })

  /** The sponsorship-type picker offers only active categories - a retired one never appears. */
  it("CategorySelect_ListsOnlyActiveCategories", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage()
    await waitFor(() => expect(http.get).toHaveBeenCalled())

    await user.click(screen.getByRole("combobox", { name: "Sponsorship type" }))

    expect(await screen.findByRole("option", { name: "Gold Sponsor" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Retired Tier" })).not.toBeInTheDocument()
  })

  /** The special-notes field counts characters against the 2000 cap as they are typed. */
  it("SpecialNotes_ShowsLiveCounter", () => {
    renderPage()

    setValue("Special notes", "Hello")

    expect(screen.getByText("5/2000 characters")).toBeInTheDocument()
  })

  /** A server refusal on create is shown in the page banner and every typed value stays, so nothing is retyped. */
  it("CustomInvoiceFormPage_ServerRefusal_ShowsBannerAndKeepsValues", async () => {
    http.post.mockRejectedValue(conflictError("Custom invoicing is not turned on for this module."))
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage()
    await fillValidMembershipForm(user)

    await user.click(screen.getByRole("button", { name: CREATE_ACTION }))

    expect(await screen.findByText("Custom invoicing is not turned on for this module.")).toBeInTheDocument()
    expect(screen.getByLabelText(/Company name/i)).toHaveValue("Acme Corp")
    expect(screen.getByLabelText("Amount for line 1")).toHaveValue("1500.00")
    expect(navigateMock).not.toHaveBeenCalled()
  })

  /** Edit mode prefills the buyer and charges from the custom-invoices edit route. */
  it("EditForm_LoadsFromTheCustomInvoicesEditRoute_AndPrefillsTheValues", async () => {
    renderPage({ invoiceUniqueId: EDIT_ID })

    await waitForEditLoaded()
    expect(http.get).toHaveBeenCalledWith(API_ROUTES.customInvoiceForEdit(EDIT_ID))
    expect(screen.getByLabelText(/Last name/i)).toHaveValue("Doe")
    expect(screen.getByLabelText("Amount for line 1")).toHaveValue("1500.00")
  })

  /** What an invoice bills never changes after creation, so the update repeats the stored module and record. */
  it("EditForm_Submits_PutToTheCustomInvoicesRoute_RepeatingTheStoredModuleAndEntity", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage({ invoiceUniqueId: EDIT_ID })
    await waitForEditLoaded()

    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1))
    const [url, body] = http.put.mock.calls[0]
    expect(url).toBe(API_ROUTES.customInvoiceUpdate(EDIT_ID))
    expect(body).toMatchObject({ moduleType: "Event", entityUniqueId: "evt-1" })
  })

  /** A saved edit returns the organizer to the invoice they edited, on its custom-invoice detail route. */
  it("SaveSucceeds_NavigatesToTheCustomInvoiceDetailRoute", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage({ invoiceUniqueId: EDIT_ID })
    await waitForEditLoaded()

    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(APP_ROUTES.customInvoices.detail(EDIT_ID)))
  })

  /** Cancelling an untouched new invoice goes straight back to the Event Invoices list, with nothing to discard. */
  it("Cancel_ReturnsToTheEventInvoicesList", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage()

    await user.click(screen.getByRole("button", { name: "Cancel" }))

    expect(navigateMock).toHaveBeenCalledWith(APP_ROUTES.eventInvoices.list)
  })

  /** Leaving with typed but unsaved changes asks first, so a stray click does not throw the work away. */
  it("Cancel_WithUnsavedChanges_AsksBeforeDiscarding", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage()
    await user.type(screen.getByLabelText(/Company name/i), "Acme")

    await user.click(screen.getByRole("button", { name: "Cancel" }))

    expect(await screen.findByText("Discard unsaved changes?")).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  /** A Paid invoice is fully read-only: the locked banner shows, controls are disabled, and Save is gone. */
  it("FormPage_PaidInvoice_ReadOnlyWithLockBannerAndNoSave", async () => {
    http.get.mockImplementation(serverGet({ edit: () => Promise.resolve(editResponse("Paid", false)) }))
    renderPage({ invoiceUniqueId: EDIT_ID })

    expect(await screen.findByText("This invoice can no longer be edited.")).toBeInTheDocument()
    expect(screen.getByLabelText(/Company name/i)).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument()
  })

  /** A PartiallyPaid invoice locks the same way as a Paid one. */
  it("Edit_PartiallyPaidInvoice_LocksTheForm", async () => {
    http.get.mockImplementation(serverGet({ edit: () => Promise.resolve(editResponse("PartiallyPaid", false)) }))
    renderPage({ invoiceUniqueId: EDIT_ID })

    expect(await screen.findByText("This invoice can no longer be edited.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument()
  })

  /** A failed edit load offers a retryable error state rather than a blank or broken form. */
  it("Edit_LoadFailure_ShowsErrorStateWithRetry", async () => {
    http.get.mockImplementation(serverGet({ edit: () => Promise.reject(conflictError("Load failed")) }))
    renderPage({ invoiceUniqueId: EDIT_ID })

    expect(await screen.findByText("This invoice could not be loaded")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument()
  })

  /** With one enabled module there is no choice: it is filled in, shown disabled, and the reason is stated (D-04). */
  it("AboutSection_SingleEnabledModule_PreselectedAndDisabled", async () => {
    http.get.mockImplementation(serverGet({ enabledModules: ["Membership"] }))
    renderPage()

    expect(await screen.findByText("Custom invoicing is only turned on for Membership.")).toBeInTheDocument()
    const moduleControl = screen.getByRole("combobox", { name: "Module" })
    expect(moduleControl).toBeDisabled()
    expect(moduleControl).toHaveTextContent("Membership")
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Membership" })).toBeEnabled())
  })

  /** A record belongs to one module, so switching module drops the picked record but keeps the buyer and charges (D-05). */
  it("AboutSection_ChangingModule_ClearsEntityKeepsBuyerAndLines", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage()
    await pickOption(user, "Module", "Event")
    await pickEntity(user, "Event", "Ann", "Annual Convention")
    setValue("Company name", "Acme Corp")
    setValue("Amount for line 1", "1500.00")

    await pickOption(user, "Module", "Membership")

    expect(await screen.findByRole("combobox", { name: "Membership" })).toHaveValue("")
    expect(screen.queryByText("Discard unsaved changes?")).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Company name/i)).toHaveValue("Acme Corp")
    expect(screen.getByLabelText("Amount for line 1")).toHaveValue("1500.00")
    await user.click(screen.getByRole("button", { name: CREATE_ACTION }))
    expect(await screen.findByText("Choose what this invoice bills.")).toBeInTheDocument()
    expect(http.post).not.toHaveBeenCalled()
  })

  /** With custom invoicing turned on for no module the page says so and offers no way to create an invoice. */
  it("AboutSection_NoEnabledModules_ExplainsAndBlocksCreate", async () => {
    http.get.mockImplementation(serverGet({ enabledModules: [] }))
    renderPage()

    expect(
      await screen.findByText("Custom invoicing is not turned on for any module. Ask your platform admin to turn it on."),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: CREATE_ACTION })).not.toBeInTheDocument()
  })

  /**
   * What an invoice bills is fixed once created and the server refuses a change, so edit mode shows the module
   * and the record by name read-only instead of a live picker that would silently no-op.
   */
  it("FormPage_EditMode_ShowsModuleAndEntityReadOnly", async () => {
    renderPage({ invoiceUniqueId: EDIT_ID })
    await waitForEditLoaded()

    const moduleControl = screen.getByRole("combobox", { name: "Module" })
    expect(moduleControl).toBeDisabled()
    expect(moduleControl).toHaveTextContent("Event")
    const entity = screen.getByLabelText("Event")
    expect(entity).toHaveValue("Annual Convention")
    expect(entity).toHaveAttribute("readonly")
    expect(screen.queryByPlaceholderText("Search events")).not.toBeInTheDocument()
  })

  /** A billed record deleted since creation is named as gone rather than left blank, so the field never looks unfilled. */
  it("FormPage_EditMode_DeletedEntity_ShowsRecordNoLongerExists", async () => {
    http.get.mockImplementation(serverGet({ edit: () => Promise.resolve(editResponse("PendingPayment", true, "")) }))
    renderPage({ invoiceUniqueId: EDIT_ID })
    await waitForEditLoaded()

    expect(screen.getByLabelText("Event")).toHaveValue("This record no longer exists")
  })

  /** A deleted billed record must not block saving the rest of an editable invoice; the server keeps the binding. */
  it("FormPage_EditMode_DeletedEntity_StillSaves", async () => {
    http.get.mockImplementation(serverGet({ edit: () => Promise.resolve(editResponse("PendingPayment", true, "")) }))
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage({ invoiceUniqueId: EDIT_ID })
    await waitForEditLoaded()

    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1))
  })

  /** An existing invoice shows its saved status in the summary, never "Not saved yet". */
  it("FormPage_EditMode_SummaryShowsSavedStatus", async () => {
    renderPage({ invoiceUniqueId: EDIT_ID })
    await waitForEditLoaded()

    expect(screen.getByText("Pending Payment")).toBeInTheDocument()
    expect(screen.queryByText("Not saved yet")).not.toBeInTheDocument()
  })

  /** An edited invoice's total is shown in its own currency, read from its detail rather than assumed to be dollars. */
  it("FormPage_EditLoadsDetail_UsesItsCurrencySymbolForTotalDue", async () => {
    http.get.mockImplementation(serverGet({ detail: () => Promise.resolve(detailResponse({ CurrencySymbol: "€" })) }))
    renderPage({ invoiceUniqueId: EDIT_ID })
    await waitForEditLoaded()

    expect(screen.getByText("Total due").nextElementSibling).toHaveTextContent("€1,500.00")
  })

  /**
   * The server clears a link when an update omits it, so saving the form repeats the invoice's current link -
   * or null when it has none - and a link made on the detail page is never dropped by an unrelated edit.
   */
  it.each([
    ["linked", { InvoiceUniqueId: "inv-linked", InvoiceNo: "CI-2002", InvoiceStatusLabel: "Pending Payment" }, "inv-linked"],
    ["unlinked", null, null],
  ])("FormPage_EditSave_RepeatsCurrentLinkAndOpensDetail_%s", async (_case, linkedInvoice, expectedLink) => {
    http.get.mockImplementation(serverGet({ detail: () => Promise.resolve(detailResponse({ LinkedInvoice: linkedInvoice })) }))
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage({ invoiceUniqueId: EDIT_ID })
    await waitForEditLoaded()

    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(APP_ROUTES.customInvoices.detail(EDIT_ID)))
    expect(http.put.mock.calls[0][1]).toMatchObject({ linkedInvoiceUniqueId: expectedLink })
  })

  /** A failed detail load offers a retry instead of an editor whose summary would show nothing about the saved invoice. */
  it("FormPage_EditDetailLoadFails_ShowsRetryableError", async () => {
    http.get.mockImplementation(serverGet({ detail: () => Promise.reject(conflictError("Load failed")) }))
    renderPage({ invoiceUniqueId: EDIT_ID })

    expect(await screen.findByText("This invoice could not be loaded")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument()
  })

  /** An invoice that can no longer be edited still offers Email link to its buyer, while Save stays gone (D-16). */
  it("FormPage_LockedInvoice_KeepsEmailLinkWithoutSave", async () => {
    http.get.mockImplementation(
      serverGet({
        edit: () => Promise.resolve(editResponse("PartiallyPaid", false)),
        detail: () => Promise.resolve(detailResponse({ InvoiceStatus: "PartiallyPaid", InvoiceStatusLabel: "Partially Paid", CanEdit: false })),
      }),
    )
    renderPage({ invoiceUniqueId: EDIT_ID })

    expect(await screen.findByText("This invoice can no longer be edited.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Email link" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument()
  })

  /** While the edit load is in flight the page shows its skeleton, not an empty or half-built form. */
  it("Edit_FirstLoad_ShowsSkeleton", () => {
    http.get.mockImplementation(serverGet({ edit: () => new Promise(() => undefined) }))
    renderPage({ invoiceUniqueId: EDIT_ID })

    expect(screen.getByTestId("custom-invoice-form-skeleton")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument()
  })
})
