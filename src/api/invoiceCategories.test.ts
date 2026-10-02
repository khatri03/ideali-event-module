import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createInvoiceCategory,
  deleteInvoiceCategory,
  fetchInvoiceCategories,
  updateInvoiceCategory,
} from "./invoiceCategories"

const { getMock, postMock, putMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
  deleteMock: vi.fn(),
}))

vi.mock("./client", () => ({ client: { get: getMock, post: postMock, put: putMock, delete: deleteMock } }))

const CATEGORY_ID = "category-1"
const SAVE_PAYLOAD = { name: "Sponsorship", isActive: true, displayOrder: 1 }

beforeEach(() => {
  getMock.mockReset()
  postMock.mockReset()
  putMock.mockReset()
  deleteMock.mockReset()
})

describe("invoiceCategories api", () => {
  /** CAT-03: the category pool is read from the module-agnostic custom-invoices route, with the same paging params. */
  it("InvoiceCategories_ListCallsTheCustomInvoicesRoute", async () => {
    getMock.mockResolvedValue({
      data: { success: true, data: { pageNo: 2, pageSize: 10, pageCount: 3, totalRecordsCount: 21, pageData: [] } },
    })

    const page = await fetchInvoiceCategories({ searchTerm: " gold ", sortBy: "name", sortOrder: "asc" }, 2, 10)

    const [url, config] = getMock.mock.calls[0] as [string, { params: URLSearchParams }]
    expect(url).toBe("/api/organizer/custom-invoices/categories/list")
    expect(config.params.toString()).toBe("pageNo=2&pageSize=10&sortBy=name&sortOrder=asc&searchTerm=gold")
    expect(page).toEqual({ items: [], total: 21, page: 2, pageSize: 10, totalPages: 3 })
  })

  /** CAT-03: creating a category posts to the custom-invoices collection route. */
  it("InvoiceCategories_CreateCallsTheCustomInvoicesRoute", async () => {
    postMock.mockResolvedValue({ data: { success: true, data: CATEGORY_ID } })

    const createdId = await createInvoiceCategory(SAVE_PAYLOAD)

    expect(postMock).toHaveBeenCalledWith("/api/organizer/custom-invoices/categories", SAVE_PAYLOAD)
    expect(createdId).toBe(CATEGORY_ID)
  })

  /** CAT-03: editing a category puts to its own id under the custom-invoices route. */
  it("InvoiceCategories_UpdateCallsTheCustomInvoicesRoute", async () => {
    putMock.mockResolvedValue({ data: { success: true } })

    await updateInvoiceCategory(CATEGORY_ID, SAVE_PAYLOAD)

    expect(putMock).toHaveBeenCalledWith("/api/organizer/custom-invoices/categories/category-1", SAVE_PAYLOAD)
  })

  /** CAT-03: deleting a category targets its own id under the custom-invoices route. */
  it("InvoiceCategories_DeleteCallsTheCustomInvoicesRoute", async () => {
    deleteMock.mockResolvedValue({ data: { success: true } })

    await deleteInvoiceCategory(CATEGORY_ID)

    expect(deleteMock).toHaveBeenCalledWith("/api/organizer/custom-invoices/categories/category-1")
  })

  /** A refused save must surface the server's reason, such as a duplicate name, instead of passing silently. */
  it("InvoiceCategories_SaveRefused_ThrowsTheServerMessage", async () => {
    postMock.mockResolvedValue({ data: { success: false, message: "A category with this name already exists." } })

    await expect(createInvoiceCategory(SAVE_PAYLOAD)).rejects.toThrow("A category with this name already exists.")
  })
})
