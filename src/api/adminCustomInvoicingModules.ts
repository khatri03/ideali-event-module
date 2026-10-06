import { z } from "zod"
import { client } from "@/api/client"
import { CUSTOM_INVOICE_MODULES, type CustomInvoiceModule } from "@/api/customInvoices"
import { assertSuccess, camelizeKeys, parseServicePayload } from "@/api/serviceResponse"
import { API_ROUTES } from "@/utils/routes"

const moduleStateSchema = z.object({
  moduleType: z.enum(CUSTOM_INVOICE_MODULES),
  isEnabled: z.boolean(),
  updatedAtUtc: z.string().nullish().transform((value) => value ?? null),
  updatedByName: z.string().nullish().transform((value) => value ?? null),
})

const toggleMessageSchema = z.object({ message: z.string().nullish() })

export interface CustomInvoicingModuleState {
  moduleType: CustomInvoiceModule
  isEnabled: boolean
  /** Null while the module still holds its seeded default. */
  updatedAtUtc: string | null
  updatedByName: string | null
}

export interface CustomInvoicingModuleToggleResult {
  state: CustomInvoicingModuleState
  message: string
}

export async function fetchCustomInvoicingModules(): Promise<CustomInvoicingModuleState[]> {
  const response = await client.get<unknown>(API_ROUTES.adminCustomInvoicingModules)
  return z.array(moduleStateSchema).parse(parseServicePayload(response.data))
}

export async function setCustomInvoicingModule(
  moduleType: CustomInvoiceModule,
  isEnabled: boolean,
): Promise<CustomInvoicingModuleToggleResult> {
  const response = await client.put<unknown>(API_ROUTES.adminCustomInvoicingModule(moduleType), { isEnabled })
  assertSuccess(response.data, "Could not update custom invoicing for this module.")

  const { message } = toggleMessageSchema.parse(camelizeKeys(response.data))
  return {
    state: moduleStateSchema.parse(parseServicePayload(response.data)),
    message: message?.trim() || "Custom invoicing updated.",
  }
}
