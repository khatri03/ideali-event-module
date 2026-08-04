import { z } from "zod"

const emailSchema = z.email()

/** Everything the buyer types here is mailed a confirmation or a ticket, so shape is checked before it is sent. */
export function isRoutableEmail(value: string | null | undefined): boolean {
  return emailSchema.safeParse((value ?? "").trim()).success
}
