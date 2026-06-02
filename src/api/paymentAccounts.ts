import { z } from "zod"
import { client } from "@/api/client"

const organizerPaymentAccountSelectionItemSchema = z.object({
  uniqueId: z.string(),
  name: z.string(),
  paymentMerchant: z.string(),
  paymentCurrency: z.string(),
  tapToPayEnabled: z.boolean(),
})

const organizerPaymentMethodOptionSchema = z.object({
  text: z.string(),
  value: z.number().int().positive(),
})

export interface OrganizerPaymentAccountSelectionItem {
  uniqueId: string
  name: string
  paymentMerchant: string
  paymentCurrency: string
  tapToPayEnabled: boolean
}

export interface OrganizerPaymentMethodOption {
  text: string
  value: number
}

export async function fetchOrganizerPaymentAccountSelectionItems(): Promise<OrganizerPaymentAccountSelectionItem[]> {
  const res = await client.get<unknown>("/api/organizer/payment-account/selection-items")
  return z.array(organizerPaymentAccountSelectionItemSchema).parse(res.data)
}

export async function fetchOrganizerPaymentMethods(paymentAccountUniqueId: string): Promise<OrganizerPaymentMethodOption[]> {
  const res = await client.get<unknown>(`/api/organizer/payment-account/${paymentAccountUniqueId}/payment-methods`)
  return z.array(organizerPaymentMethodOptionSchema).parse(res.data)
}
