import { beforeEach, describe, expect, it, vi } from "vitest"
import { createCustomInvoice, type CreateCustomInvoicePayload } from "./customInvoices"
import { API_ROUTES } from "@/utils/routes"

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }))

vi.mock("./client", () => ({ client: { post: postMock } }))

const PAYLOAD: CreateCustomInvoicePayload = {
  moduleType: "Membership",
  entityUniqueId: "membership-type-1",
  categoryUniqueId: "cat-1",
  dueDateUtc: "2026-12-31T00:00:00.000Z",
  companyName: "Acme Corp",
  lastName: "Doe",
  email: "buyer@acme.test",
  lineItems: [{ description: "Annual dues", amount: "120.00" }],
}

beforeEach(() => {
  postMock.mockReset()
})

describe("createCustomInvoice", () => {
  /** The create goes to the module-agnostic route and carries what it bills, so the server can resolve ownership per module. */
  it("Create_PostsToTheCustomInvoicesRouteWithModuleAndEntity", async () => {
    postMock.mockResolvedValue({ data: { success: true, data: "invoice-1" } })

    await createCustomInvoice(PAYLOAD)

    expect(postMock).toHaveBeenCalledWith(API_ROUTES.customInvoiceCreate, PAYLOAD)
    expect(API_ROUTES.customInvoiceCreate).toBe("/api/organizer/custom-invoices")
  })

  /** The page routes to the created invoice, so the id must come back whichever way the endpoint wraps it. */
  it.each([
    ["bare id", "invoice-1"],
    ["camelCase object", { invoiceUniqueId: "invoice-1" }],
    ["PascalCase object", { InvoiceUniqueId: "invoice-1" }],
  ])("Create_ResponseCarries%s_ReturnsTheInvoiceId", async (_shape, data) => {
    postMock.mockResolvedValue({ data: { success: true, data } })

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
