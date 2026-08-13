import { z } from "zod"

const serviceResponseSchema = z.object({
  success: z.boolean().optional(),
  message: z.string().nullable().optional(),
  data: z.unknown().optional(),
})

/** Dictionary keys keyed by entity id must survive untouched — only property names are camel-cased. */
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function toCamelKey(key: string): string {
  return GUID_PATTERN.test(key) ? key : key.charAt(0).toLowerCase() + key.slice(1)
}

/**
 * The API has shipped both PascalCase and camelCase bodies over its lifetime, so every payload is
 * normalised to camelCase before it meets a schema instead of every schema carrying both spellings.
 */
export function camelizeKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(camelizeKeys)
  }

  if (value === null || typeof value !== "object") {
    return value
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [toCamelKey(key), camelizeKeys(entry)]),
  )
}

export function parseServicePayload(payload: unknown): unknown {
  const response = serviceResponseSchema.parse(camelizeKeys(payload))
  return "data" in response ? response.data : response
}

/**
 * A 200 response that reports its own failure. The message is written for the person reading it - the
 * same footing as an RFC 7807 title - so it is safe to show, unlike an arbitrary thrown Error.
 */
export class ServiceResponseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ServiceResponseError"
  }
}

export function assertSuccess(payload: unknown, fallbackMessage: string): void {
  const response = serviceResponseSchema.parse(camelizeKeys(payload))

  if (response.success === false) {
    throw new ServiceResponseError(response.message?.trim() || fallbackMessage)
  }
}
