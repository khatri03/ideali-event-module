import { z } from "zod"
import { client } from "@/api/client"
import type { CreateEventCustomInvoicePayload } from "@/api/eventInvoices"
import { parseServicePayload } from "@/api/serviceResponse"
import { API_ROUTES } from "@/utils/routes"

/** The modules a custom invoice can bill a record of. */
export type CustomInvoiceModule = "Event" | "Membership" | "Donation"

export interface CreateCustomInvoicePayload extends Omit<CreateEventCustomInvoicePayload, "eventUniqueId"> {
  moduleType: CustomInvoiceModule
  /** The public id of the billed record within `moduleType`. */
  entityUniqueId: string
}

// The endpoint answers with the bare Guid, or an object carrying it, depending on how it wraps the result.
const createdInvoiceIdSchema = z.union([
  z.string().min(1),
  z.object({ invoiceUniqueId: z.string().min(1) }).transform((created) => created.invoiceUniqueId),
])

export async function createCustomInvoice(payload: CreateCustomInvoicePayload): Promise<string> {
  const response = await client.post<unknown>(API_ROUTES.customInvoiceCreate, payload)
  return createdInvoiceIdSchema.parse(parseServicePayload(response.data))
}
