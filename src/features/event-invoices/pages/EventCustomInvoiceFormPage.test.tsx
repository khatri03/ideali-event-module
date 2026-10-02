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
import { EventCustomInvoiceFormPage } from "./EventCustomInvoiceFormPage"

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
vi.mock("@/api/client", () => ({ client: http }))
vi.mock("@/lib/toaster", () => ({ toaster: { create: vi.fn() } }))

const navigateMock = vi.hoisted(() => vi.fn())
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>()
  return { ...actual, useNavigate: () => navigateMock }
})

const EDIT_ID = "inv-99"

function filterOptionsResponse() {
  return {
    data: {
      success: true,
      Data: { Events: [{ Text: "Annual Convention", Value: "evt-1" }], Sessions: [] },
    },
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
        EventUniqueId: "evt-1",
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
    ? APP_ROUTES.eventInvoices.customEdit(options.invoiceUniqueId)
    : APP_ROUTES.eventInvoices.customNew

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
      <Route path={APP_ROUTES.eventInvoices.customNew} element={<EventCustomInvoiceFormPage />} />
      <Route path={APP_ROUTES.eventInvoices.customEditRoute} element={<EventCustomInvoiceFormPage />} />
    </Routes>,
    { wrapper: Wrapper },
  )
}

async function pickOption(user: ReturnType<typeof userEvent.setup>, triggerName: string, optionName: string) {
  await user.click(screen.getByRole("combobox", { name: triggerName }))
  fireEvent.click(await screen.findByRole("option", { name: optionName }))
}

function setValue(labelText: string, value: string) {
  fireEvent.change(screen.getByLabelText(new RegExp(labelText, "i")), { target: { value } })
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await pickOption(user, "Event", "Annual Convention")
  await pickOption(user, "Sponsorship type", "Gold Sponsor")
  setValue("Payment due date", "2026-12-31")
  setValue("Company name", "Acme Corp")
  setValue("Last name", "Doe")
  setValue("Email address", "buyer@acme.test")
  setValue("Description for line 1", "Gold sponsorship")
  setValue("Amount for line 1", "1500.00")
}

describe("EventCustomInvoiceFormPage", () => {
  beforeEach(() => {
    http.get.mockReset()
    http.post.mockReset()
    http.put.mockReset()
    navigateMock.mockReset()

    http.get.mockImplementation((url: string) => {
      if (url === API_ROUTES.eventInvoiceFilterOptions) return Promise.resolve(filterOptionsResponse())
      if (url === API_ROUTES.eventInvoiceCategories) return Promise.resolve(categoriesResponse())
      if (url === API_ROUTES.eventInvoiceCustomForEdit(EDIT_ID)) return Promise.resolve(editResponse("PendingPayment", true))
      return Promise.resolve({ data: { success: true, Data: null } })
    })
    http.post.mockResolvedValue({ data: { success: true, Data: "new-invoice-id" } })
    http.put.mockResolvedValue({ data: { success: true, Data: null } })
  })

  /** A fully filled create form posts to the module-agnostic create endpoint bound to the picked event, then navigates away. */
  it("Submit_ValidForm_PostsAndNavigates", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage()
    await fillValidForm(user)

    await user.click(screen.getByRole("button", { name: "Save invoice" }))

    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1))
    const [url, body] = http.post.mock.calls[0]
    expect(url).toBe(API_ROUTES.customInvoiceCreate)
    expect(body).not.toHaveProperty("eventUniqueId")
    expect(body).toMatchObject({
      moduleType: "Event",
      entityUniqueId: "evt-1",
      categoryUniqueId: "cat-active",
      companyName: "Acme Corp",
      lastName: "Doe",
      email: "buyer@acme.test",
      lineItems: [{ description: "Gold sponsorship", amount: "1500.00" }],
    })
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith(APP_ROUTES.eventInvoices.detail("new-invoice-id")),
    )
  })

  /** Submitting an empty create form blocks with inline errors and never calls the endpoint. */
  it("Submit_MissingRequiredFields_ShowsErrorsAndDoesNotPost", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage()

    await user.click(screen.getByRole("button", { name: "Save invoice" }))

    expect(await screen.findByText("Select an event.")).toBeInTheDocument()
    expect(screen.getByText("Company name is required.")).toBeInTheDocument()
    expect(screen.getByText("Last name is required.")).toBeInTheDocument()
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

  /** A server rejection on create keeps the entered values on screen and surfaces the reason in the banner. */
  it("Submit_ServerError_KeepsValuesAndShowsBanner", async () => {
    http.post.mockRejectedValue(conflictError("This event is not accepting invoices."))
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage()
    await fillValidForm(user)

    await user.click(screen.getByRole("button", { name: "Save invoice" }))

    expect(await screen.findByText("This event is not accepting invoices.")).toBeInTheDocument()
    expect(screen.getByLabelText(/Company name/i)).toHaveValue("Acme Corp")
    expect(navigateMock).not.toHaveBeenCalled()
  })

  /** Edit mode prefills from the load-for-edit endpoint, and a valid submit PUTs to the update endpoint. */
  it("Edit_PendingPayment_PrefillsAndPuts", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage({ invoiceUniqueId: EDIT_ID })

    await waitFor(() => expect(screen.getByLabelText(/Company name/i)).toHaveValue("Acme Corp"))
    expect(screen.getByLabelText(/Last name/i)).toHaveValue("Doe")
    expect(screen.getByLabelText("Amount for line 1")).toHaveValue("1500.00")

    await user.click(screen.getByRole("button", { name: "Save invoice" }))

    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1))
    expect(http.put.mock.calls[0][0]).toBe(API_ROUTES.eventInvoiceCustomUpdate(EDIT_ID))
  })

  /** A Paid invoice is fully read-only: the locked banner shows, controls are disabled, and Save is gone. */
  it("Edit_PaidInvoice_LocksTheForm", async () => {
    http.get.mockImplementation((url: string) => {
      if (url === API_ROUTES.eventInvoiceFilterOptions) return Promise.resolve(filterOptionsResponse())
      if (url === API_ROUTES.eventInvoiceCategories) return Promise.resolve(categoriesResponse())
      if (url === API_ROUTES.eventInvoiceCustomForEdit(EDIT_ID)) return Promise.resolve(editResponse("Paid", false))
      return Promise.resolve({ data: { success: true, Data: null } })
    })
    renderPage({ invoiceUniqueId: EDIT_ID })

    expect(await screen.findByText("This invoice can no longer be edited.")).toBeInTheDocument()
    expect(screen.getByLabelText(/Company name/i)).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Save invoice" })).not.toBeInTheDocument()
  })

  /** A PartiallyPaid invoice locks the same way as a Paid one. */
  it("Edit_PartiallyPaidInvoice_LocksTheForm", async () => {
    http.get.mockImplementation((url: string) => {
      if (url === API_ROUTES.eventInvoiceFilterOptions) return Promise.resolve(filterOptionsResponse())
      if (url === API_ROUTES.eventInvoiceCategories) return Promise.resolve(categoriesResponse())
      if (url === API_ROUTES.eventInvoiceCustomForEdit(EDIT_ID)) return Promise.resolve(editResponse("PartiallyPaid", false))
      return Promise.resolve({ data: { success: true, Data: null } })
    })
    renderPage({ invoiceUniqueId: EDIT_ID })

    expect(await screen.findByText("This invoice can no longer be edited.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Save invoice" })).not.toBeInTheDocument()
  })

  /**
   * The event a custom invoice bills against is fixed once created, and the server ignores any change to it
   * on update, so the Event selector is disabled in edit mode - never a live control that silently no-ops.
   */
  it("Edit_EventField_IsDisabled", async () => {
    renderPage({ invoiceUniqueId: EDIT_ID })

    await waitFor(() => expect(screen.getByLabelText(/Company name/i)).toHaveValue("Acme Corp"))
    expect(screen.getByRole("combobox", { name: "Event" })).toBeDisabled()
  })

  /** A failed edit load offers a retryable error state rather than a blank or broken form. */
  it("Edit_LoadFailure_ShowsErrorStateWithRetry", async () => {
    http.get.mockImplementation((url: string) => {
      if (url === API_ROUTES.eventInvoiceCustomForEdit(EDIT_ID)) return Promise.reject(conflictError("Load failed"))
      return Promise.resolve({ data: { success: true, Data: null } })
    })
    renderPage({ invoiceUniqueId: EDIT_ID })

    expect(await screen.findByText("This invoice could not be loaded")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument()
  })

  /** While the edit load is in flight the page shows its skeleton, not an empty or half-built form. */
  it("Edit_FirstLoad_ShowsSkeleton", () => {
    http.get.mockImplementation((url: string) => {
      if (url === API_ROUTES.eventInvoiceCustomForEdit(EDIT_ID)) return new Promise(() => undefined)
      return Promise.resolve({ data: { success: true, Data: null } })
    })
    renderPage({ invoiceUniqueId: EDIT_ID })

    expect(screen.getByTestId("event-custom-invoice-form-skeleton")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Save invoice" })).not.toBeInTheDocument()
  })
})
