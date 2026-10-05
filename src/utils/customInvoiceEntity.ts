import type { CustomInvoiceModule } from "@/api/customInvoices"

const BILLED_ENTITY_LABELS: Record<CustomInvoiceModule, string> = {
  Event: "Event",
  Membership: "Membership",
  Donation: "Campaign",
}

/**
 * Names the billed record the way the entity picker does, e.g. "Membership: Gold".
 * A blank name means the record was deleted, so it returns "" and the caller drops the line
 * instead of printing a bare "Membership:" label.
 */
export function formatBilledEntity(moduleType: CustomInvoiceModule, entityName: string | null): string {
  const name = entityName?.trim() ?? ""
  return name ? `${BILLED_ENTITY_LABELS[moduleType]}: ${name}` : ""
}
