import { useNavigate } from "react-router-dom"
import type { CustomInvoiceDetail, CustomInvoiceForEdit, CustomInvoiceWritePayload } from "@/api/customInvoices"
import { APP_ROUTES } from "@/utils/routes"
import { startOfLocalDayAsUtcIso } from "@/utils/utcDates"
import type { CustomInvoiceFormValues } from "../schemas/customInvoice.schemas"
import { useCreateCustomInvoice, useSendCustomInvoiceAfterCreate, useUpdateCustomInvoice } from "./useCustomInvoiceMutations"

interface UseCustomInvoiceSubmitOptions {
  invoiceUniqueId?: string
  initial?: CustomInvoiceForEdit
  detail?: CustomInvoiceDetail
}

function toWritePayload(
  values: CustomInvoiceFormValues,
  initial: CustomInvoiceForEdit | undefined,
  detail: CustomInvoiceDetail | undefined,
): CustomInvoiceWritePayload {
  return {
    // What an invoice bills is fixed at creation, so an edit repeats the stored binding rather than the form.
    moduleType: initial ? initial.moduleType : values.moduleType,
    entityUniqueId: initial ? initial.entityUniqueId : values.entityUniqueId,
    categoryUniqueId: values.categoryUniqueId,
    memberUniqueId: values.memberUniqueId ? values.memberUniqueId : null,
    dueDateUtc: startOfLocalDayAsUtcIso(values.dueDate) ?? "",
    companyName: values.companyName,
    firstName: values.firstName,
    middleName: values.middleName,
    lastName: values.lastName,
    cellPhone: values.cellPhone,
    email: values.email,
    specialNotes: values.specialNotes,
    lineItems: values.lineItems.map((line) => ({ description: line.description, amount: line.amount })),
    // The server treats null on update as "remove the link", so an edit repeats the current one to keep it.
    linkedInvoiceUniqueId: detail?.linkedInvoice?.invoiceUniqueId ?? null,
  }
}

/**
 * Saves the editor's values as a new invoice or an edit and opens the invoice's detail page. A new invoice
 * with "Email payable link to buyer now" on is emailed straight after it is created; when that email fails
 * the invoice is kept and its edit page opens instead, where the organizer can retry with Email link. A
 * refused save keeps the organizer on the page; the mutation has already toasted it and `error` feeds the
 * page banner.
 */
export function useCustomInvoiceSubmit({ invoiceUniqueId, initial, detail }: UseCustomInvoiceSubmitOptions) {
  const navigate = useNavigate()
  const createMutation = useCreateCustomInvoice()
  const updateMutation = useUpdateCustomInvoice()
  const sendMutation = useSendCustomInvoiceAfterCreate()
  const activeMutation = invoiceUniqueId ? updateMutation : createMutation

  async function emailThenOpen(newInvoiceId: string) {
    try {
      await sendMutation.mutateAsync(newInvoiceId)
      navigate(APP_ROUTES.customInvoices.detail(newInvoiceId))
    } catch {
      navigate(APP_ROUTES.customInvoices.edit(newInvoiceId))
    }
  }

  async function submit(values: CustomInvoiceFormValues) {
    const payload = toWritePayload(values, initial, detail)
    try {
      if (invoiceUniqueId) {
        await updateMutation.mutateAsync({ invoiceUniqueId, payload })
        navigate(APP_ROUTES.customInvoices.detail(invoiceUniqueId))
        return
      }
      const newInvoiceId = await createMutation.mutateAsync(payload)
      if (values.emailOnCreate) {
        await emailThenOpen(newInvoiceId)
        return
      }
      navigate(APP_ROUTES.customInvoices.detail(newInvoiceId))
    } catch {
      // Already reported by the mutation's toast and the page banner; staying put keeps the typed values.
    }
  }

  return {
    submit,
    isPending: activeMutation.isPending || sendMutation.isPending,
    error: activeMutation.isError ? activeMutation.error : null,
  }
}
