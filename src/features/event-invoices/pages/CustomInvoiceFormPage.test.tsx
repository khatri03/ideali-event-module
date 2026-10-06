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
vi.mock("@/lib/toaster", () => ({ toaster: { create: vi.fn() } }))

const navigateMock = vi.hoisted(() => vi.fn())
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>()
  return { ...actual, useNavigate: () => navigateMock }
})

const EDIT_ID = "inv-99"

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
}

/** Answers every GET the editor makes, with the enabled modules and the edit load swappable per test. */
function serverGet({ enabledModules = ["Event", "Membership"], edit }: ServerSetup = {}) {
  return (url: string, config?: { params?: URLSearchParams }) => {
    if (url === API_ROUTES.customInvoiceEnabledModules) return Promise.resolve(envelope(enabledModules))
    if (url === API_ROUTES.customInvoiceEntityOptions) return Promise.resolve(entityOptionsResponse(config?.params ?? new URLSearchParams()))
    if (url === API_ROUTES.invoiceCategories) return Promise.resolve(categoriesResponse())
    if (url === API_ROUTES.customInvoiceForEdit(EDIT_ID)) return edit ? edit() : Promise.resolve(editResponse("PendingPayment", true))
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

function editResponse(invoiceStatus: string, canEdit: boolean) {
  return {
    data: {
      success: true,
      Data: {
        InvoiceUniqueId: EDIT_ID,
        ModuleType: "Event",
        EntityUniqueId: "evt-1",
        EntityName: "Annual Convention",
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

    http.get.mockImplementation(serverGet())
    http.post.mockResolvedValue(envelope("new-invoice-id"))
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

    await user.click(screen.getByRole("button", { name: "Create invoice" }))

    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1))
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
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(APP_ROUTES.customInvoices.detail("new-invoice-id")))
  })

  /** Submitting an empty create form blocks with inline errors naming the module and billed record, and never posts. */
  it("Submit_MissingRequiredFields_ShowsErrorsAndDoesNotPost", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage()

    await user.click(await screen.findByRole("button", { name: "Create invoice" }))

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

    await user.click(screen.getByRole("button", { name: "Create invoice" }))

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
  it("Edit_PaidInvoice_LocksTheForm", async () => {
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

  /** While the edit load is in flight the page shows its skeleton, not an empty or half-built form. */
  it("Edit_FirstLoad_ShowsSkeleton", () => {
    http.get.mockImplementation(serverGet({ edit: () => new Promise(() => undefined) }))
    renderPage({ invoiceUniqueId: EDIT_ID })

    expect(screen.getByTestId("custom-invoice-form-skeleton")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument()
  })
})
