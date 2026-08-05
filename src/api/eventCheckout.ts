import { z } from "zod"
import { client } from "@/api/client"
import { API_ROUTES } from "@/utils/routes"
import {
  normalizeEventCart,
  normalizeEventCartPrice,
  normalizeEventCheckoutConfirmation,
  normalizeEventPaymentIntentResult,
  type AddEventCartLineRequest,
  type CreateEventCartRequest,
  type CreateEventPaymentIntentRequest,
  type EventCart,
  type EventCartPrice,
  type EventCheckoutConfirmation,
  type EventPaymentIntentResult,
  type PriceEventCartRequest,
  type SubmitLineAttendeesRequest,
  type SubmitOrderAnswersRequest,
  type UploadedAnswerFile,
} from "@/features/events/schemas/eventCart.schemas"

const serviceResponseSchema = z.object({
  Success: z.boolean().optional(),
  success: z.boolean().optional(),
  Message: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  ErrorCode: z.string().nullable().optional(),
  errorCode: z.string().nullable().optional(),
  ValidationErrors: z.record(z.string(), z.array(z.string())).nullable().optional(),
  validationErrors: z.record(z.string(), z.array(z.string())).nullable().optional(),
  Data: z.unknown().nullable().optional(),
  data: z.unknown().nullable().optional(),
})

function readResponseData(payload: unknown): unknown {
  const parsed = serviceResponseSchema.parse(payload)
  return parsed.Data ?? parsed.data
}

export async function createEventCart(request: CreateEventCartRequest): Promise<EventCart> {
  const res = await client.post<unknown>(API_ROUTES.eventCart, request)
  return normalizeEventCart(readResponseData(res.data))
}

export async function fetchEventCart(cartUniqueId: string): Promise<EventCart> {
  const res = await client.get<unknown>(API_ROUTES.eventCartDetail(cartUniqueId))
  return normalizeEventCart(readResponseData(res.data))
}

export async function addEventCartLine(cartUniqueId: string, request: AddEventCartLineRequest): Promise<EventCart> {
  const res = await client.post<unknown>(API_ROUTES.eventCartLines(cartUniqueId), request)
  return normalizeEventCart(readResponseData(res.data))
}

export async function removeEventCartLine(cartUniqueId: string, lineUniqueId: string): Promise<EventCart> {
  const res = await client.delete<unknown>(API_ROUTES.eventCartLine(cartUniqueId, lineUniqueId))
  return normalizeEventCart(readResponseData(res.data))
}

export async function priceEventCart(cartUniqueId: string, request: PriceEventCartRequest): Promise<EventCartPrice> {
  const res = await client.post<unknown>(API_ROUTES.eventCartPrice(cartUniqueId), request)
  return normalizeEventCartPrice(readResponseData(res.data))
}

export async function submitLineAttendees(
  cartUniqueId: string,
  lineUniqueId: string,
  request: SubmitLineAttendeesRequest,
): Promise<void> {
  await client.post<unknown>(API_ROUTES.eventCartLineAttendees(cartUniqueId, lineUniqueId), request)
}

export async function submitOrderAnswers(
  cartUniqueId: string,
  request: SubmitOrderAnswersRequest,
): Promise<void> {
  await client.post<unknown>(API_ROUTES.eventCartAnswers(cartUniqueId), request)
}

const uploadedAnswerFileSchema = z.object({
  FileStorageId: z.number().int().positive().optional(),
  fileStorageId: z.number().int().positive().optional(),
  FileName: z.string().optional(),
  fileName: z.string().optional(),
})

export async function uploadAnswerFile(
  cartUniqueId: string,
  fieldUniqueId: string,
  file: File,
): Promise<UploadedAnswerFile> {
  const body = new FormData()
  body.append("fieldUniqueId", fieldUniqueId)
  body.append("file", file)

  const res = await client.post<unknown>(API_ROUTES.eventCartAnswerFiles(cartUniqueId), body)
  const parsed = uploadedAnswerFileSchema.parse(readResponseData(res.data))
  const fileStorageId = parsed.FileStorageId ?? parsed.fileStorageId

  if (fileStorageId == null) {
    throw new Error("Upload response carried no file id.")
  }

  return { fileStorageId, fileName: parsed.FileName ?? parsed.fileName ?? file.name }
}

export async function createEventPaymentIntent(
  cartUniqueId: string,
  request: CreateEventPaymentIntentRequest,
): Promise<EventPaymentIntentResult> {
  const res = await client.post<unknown>(API_ROUTES.eventCartCheckoutIntent(cartUniqueId), request)
  return normalizeEventPaymentIntentResult(readResponseData(res.data))
}

export async function confirmEventCheckout(cartUniqueId: string): Promise<EventCheckoutConfirmation> {
  const res = await client.post<unknown>(API_ROUTES.eventCartCheckoutConfirm(cartUniqueId), {})
  return normalizeEventCheckoutConfirmation(readResponseData(res.data))
}
