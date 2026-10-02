import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ChakraProvider } from "@chakra-ui/react"
import { AxiosError } from "axios"
import { system } from "@/theme"
import { InvoiceCategoriesManager } from "./InvoiceCategoriesManager"

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
vi.mock("@/api/client", () => ({ client: http }))
vi.mock("@/lib/toaster", () => ({ toaster: { create: vi.fn() } }))

interface StoredRow {
  UniqueId: string
  Name: string
  IsActive: boolean
  DisplayOrder: number
  CreatedOnUtc: string
}

let store: StoredRow[] = []
let nextId = 0

function seed(names: string[]): void {
  store = names.map((name, index) => ({
    UniqueId: `cat-${index}`,
    Name: name,
    IsActive: true,
    DisplayOrder: index,
    CreatedOnUtc: "2026-01-02T08:00:00Z",
  }))
}

function listResponse() {
  return {
    data: {
      success: true,
      Data: {
        PageNo: 1,
        PageSize: 10,
        PageCount: store.length ? 1 : 0,
        TotalRecordsCount: store.length,
        PageData: store,
      },
    },
  }
}

function idFromUrl(url: string): string {
  return url.split("/").pop() ?? ""
}

function conflictError(title: string): AxiosError {
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 400,
    statusText: "Bad Request",
    headers: {},
    // The axios config type is irrelevant to extractApiError, which only reads response.data.title.
    config: {} as never,
    data: { title, status: 400 },
  })
}

function renderManager() {
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
  return render(<InvoiceCategoriesManager />, { wrapper: Wrapper })
}

describe("InvoiceCategoriesManager", () => {
  beforeEach(() => {
    http.get.mockReset()
    http.post.mockReset()
    http.put.mockReset()
    http.delete.mockReset()
    nextId = 100
    seed([])

    http.get.mockImplementation(() => Promise.resolve(listResponse()))
    http.post.mockImplementation((_url: string, body: { name: string; isActive: boolean; displayOrder: number }) => {
      store.push({
        UniqueId: `cat-new-${nextId++}`,
        Name: body.name,
        IsActive: body.isActive,
        DisplayOrder: body.displayOrder,
        CreatedOnUtc: "2026-02-01T08:00:00Z",
      })
      return Promise.resolve({ data: { success: true, Data: "cat-new" } })
    })
    http.put.mockImplementation((url: string, body: { name: string; isActive: boolean; displayOrder: number }) => {
      const target = store.find((row) => row.UniqueId === idFromUrl(url))
      if (target) {
        target.Name = body.name
        target.IsActive = body.isActive
        target.DisplayOrder = body.displayOrder
      }
      return Promise.resolve({ data: { success: true } })
    })
    http.delete.mockImplementation((url: string) => {
      store = store.filter((row) => row.UniqueId !== idFromUrl(url))
      return Promise.resolve({ data: { success: true } })
    })
  })

  /** Creating through the dialog persists and the new row appears without a full page reload (list refetches). */
  it("Create_ThroughDialog_AddsRowAndRefetches", async () => {
    const user = userEvent.setup()
    renderManager()
    await screen.findByText("No invoice categories yet")

    await user.click(screen.getByRole("button", { name: "New category" }))
    await user.type(
      await screen.findByPlaceholderText("e.g. Gold Sponsor, Booth, Programme Ad"),
      "Gold Sponsor",
    )
    await user.click(screen.getByRole("button", { name: "Create category" }))

    expect(await screen.findByText("Gold Sponsor")).toBeInTheDocument()
    expect(http.post).toHaveBeenCalledTimes(1)
    expect(http.get.mock.calls.length).toBeGreaterThan(1)
  })

  /** Editing a name saves and the changed name replaces the old one in the row. */
  it("Edit_ChangesName_ReflectsInRow", async () => {
    seed(["Booth"])
    const user = userEvent.setup()
    renderManager()
    await screen.findByText("Booth")

    await user.click(screen.getByRole("button", { name: "Actions for Booth" }))
    await user.click(await screen.findByRole("menuitem", { name: /edit/i }))

    const nameInput = await screen.findByPlaceholderText("e.g. Gold Sponsor, Booth, Programme Ad")
    await user.clear(nameInput)
    await user.type(nameInput, "Platinum")
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByText("Platinum")).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText("Booth")).not.toBeInTheDocument())
    expect(http.put).toHaveBeenCalledTimes(1)
  })

  /** Delete is confirm-gated: the dialog names the consequence and the row leaves only after confirming. */
  it("Delete_AfterConfirm_RemovesRowNamingConsequence", async () => {
    seed(["Booth"])
    const user = userEvent.setup()
    renderManager()
    await screen.findByText("Booth")

    await user.click(screen.getByRole("button", { name: "Actions for Booth" }))
    await user.click(await screen.findByRole("menuitem", { name: /delete/i }))

    const dialog = await screen.findByRole("alertdialog")
    expect(
      within(dialog).getByText(/It will no longer be available when creating new custom invoices/i),
    ).toBeInTheDocument()

    await user.click(within(dialog).getByRole("button", { name: "Delete" }))

    await waitFor(() => expect(screen.queryByText("Booth")).not.toBeInTheDocument())
    expect(http.delete).toHaveBeenCalledTimes(1)
  })

  /** Cancelling the confirm leaves the row in place and never calls the delete endpoint. */
  it("Delete_OnCancel_KeepsRowAndDoesNotCallApi", async () => {
    seed(["Booth"])
    const user = userEvent.setup()
    renderManager()
    await screen.findByText("Booth")

    await user.click(screen.getByRole("button", { name: "Actions for Booth" }))
    await user.click(await screen.findByRole("menuitem", { name: /delete/i }))

    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
    expect(screen.getByText("Booth")).toBeInTheDocument()
    expect(http.delete).not.toHaveBeenCalled()
  })

  /** A blank name is blocked inline and never reaches the create endpoint. */
  it("Create_BlankName_ShowsInlineErrorAndDoesNotSubmit", async () => {
    const user = userEvent.setup()
    renderManager()
    await screen.findByText("No invoice categories yet")

    await user.click(screen.getByRole("button", { name: "New category" }))
    await user.click(await screen.findByRole("button", { name: "Create category" }))

    expect(await screen.findByText("Category name is required.")).toBeInTheDocument()
    expect(http.post).not.toHaveBeenCalled()
  })

  /** A server rejection keeps the dialog open with the entered value and surfaces the reason in a banner. */
  it("Create_ServerError_KeepsDialogOpenWithBanner", async () => {
    http.post.mockRejectedValue(conflictError('A category named "Booth" already exists.'))
    const user = userEvent.setup()
    renderManager()
    await screen.findByText("No invoice categories yet")

    await user.click(screen.getByRole("button", { name: "New category" }))
    const nameInput = await screen.findByPlaceholderText("e.g. Gold Sponsor, Booth, Programme Ad")
    await user.type(nameInput, "Booth")
    await user.click(screen.getByRole("button", { name: "Create category" }))

    expect(await screen.findByText('A category named "Booth" already exists.')).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create category" })).toBeInTheDocument()
    expect(nameInput).toHaveValue("Booth")
  })
})
