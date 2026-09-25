import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ChakraProvider } from "@chakra-ui/react"
import { AxiosError } from "axios"
import { system } from "@/theme"
import { API_ROUTES } from "@/utils/routes"
import { EventCustomInvoiceFormPage } from "./EventCustomInvoiceFormPage"

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
vi.mock("@/api/client", () => ({ client: http }))
vi.mock("@/lib/toaster", () => ({ toaster: { create: vi.fn() } }))

const navigateMock = vi.hoisted(() => vi.fn())
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>()
  return { ...actual, useNavigate: () => navigateMock }
})

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

function conflictError(title: string): AxiosError {
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 400,
    statusText: "Bad Request",
    headers: {},
    config: {} as never,
    data: { title, status: 400 },
  })
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ChakraProvider value={system}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
      </ChakraProvider>
    )
  }
  return render(<EventCustomInvoiceFormPage />, { wrapper: Wrapper })
}

// Ark's Select opens on userEvent's full pointer sequence, but selecting the option through userEvent
// stalls on the portaled listbox under happy-dom - so open with userEvent and pick with fireEvent.
async function pickOption(
  user: ReturnType<typeof userEvent.setup>,
  triggerName: string,
  optionName: string,
) {
  await user.click(screen.getByRole("combobox", { name: triggerName }))
  fireEvent.click(await screen.findByRole("option", { name: optionName }))
}

function setValue(labelText: string, value: string) {
  // Required fields render an asterisk beside the label, so match on the label prefix rather than exactly.
  fireEvent.change(screen.getByLabelText(new RegExp(labelText, "i")), { target: { value } })
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await pickOption(user, "Event", "Annual Convention")
  await pickOption(user, "Sponsorship type", "Gold Sponsor")
  setValue("Payment due date", "2026-12-31")
  setValue("Company name", "Acme Corp")
  setValue("Last name", "Doe")
  setValue("Email address", "buyer@acme.test")
  setValue("Description", "Gold sponsorship")
  setValue("Amount", "1500.00")
}

describe("EventCustomInvoiceFormPage", () => {
  beforeEach(() => {
    http.get.mockReset()
    http.post.mockReset()
    navigateMock.mockReset()

    http.get.mockImplementation((url: string) => {
      if (url === API_ROUTES.eventInvoiceFilterOptions) return Promise.resolve(filterOptionsResponse())
      if (url === API_ROUTES.eventInvoiceCategories) return Promise.resolve(categoriesResponse())
      return Promise.resolve({ data: { success: true, Data: null } })
    })
    http.post.mockResolvedValue({ data: { success: true, Data: "new-invoice-id" } })
  })

  /** A fully filled form posts to the custom-create endpoint, then toasts and navigates away. */
  it("Submit_ValidForm_PostsAndNavigates", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage()
    await fillValidForm(user)

    await user.click(screen.getByRole("button", { name: "Save invoice" }))

    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1))
    const [url, body] = http.post.mock.calls[0]
    expect(url).toBe(API_ROUTES.eventInvoiceCustomCreate)
    expect(body).toMatchObject({
      eventUniqueId: "evt-1",
      categoryUniqueId: "cat-active",
      companyName: "Acme Corp",
      lastName: "Doe",
      email: "buyer@acme.test",
      lineItems: [{ description: "Gold sponsorship", amount: "1500.00" }],
    })
    await waitFor(() => expect(navigateMock).toHaveBeenCalled())
  })

  /** Submitting an empty form blocks with inline errors and never calls the endpoint. */
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

  /** A server rejection keeps the entered values on screen and surfaces the reason in the banner. */
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
})
