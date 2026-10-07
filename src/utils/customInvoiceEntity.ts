import { CUSTOM_INVOICE_MODULES, type CustomInvoiceModule } from "@/api/customInvoices"

/** Query param that locks the custom invoice list and editor to one module. */
export const CUSTOM_INVOICE_MODULE_PARAM = "moduleType"

const BILLED_ENTITY_LABELS: Record<CustomInvoiceModule, string> = {
  Event: "Event",
  Membership: "Membership",
  Donation: "Campaign",
}

const BILLED_ENTITY_PLURALS: Record<CustomInvoiceModule, string> = {
  Event: "events",
  Membership: "memberships",
  Donation: "campaigns",
}

/** What a record of the module is called on screen; a Donation invoice bills a campaign. */
export function billedEntityLabel(moduleType: CustomInvoiceModule): string {
  return BILLED_ENTITY_LABELS[moduleType]
}

/** The lower-case plural for sentences such as "You have no campaigns yet." */
export function billedEntityPlural(moduleType: CustomInvoiceModule): string {
  return BILLED_ENTITY_PLURALS[moduleType]
}

/**
 * Names the billed record the way the entity picker does, e.g. "Membership: Gold".
 * A blank name means the record was deleted, so it returns "" and the caller drops the line
 * instead of printing a bare "Membership:" label.
 */
export function formatBilledEntity(moduleType: CustomInvoiceModule, entityName: string | null): string {
  const name = entityName?.trim() ?? ""
  return name ? `${billedEntityLabel(moduleType)}: ${name}` : ""
}

/**
 * Reads a module from a user-editable query value. Only an exact module name is accepted;
 * anything else is ignored so the screen falls back to its unlocked state.
 */
export function parseCustomInvoiceModule(value: string | null | undefined): CustomInvoiceModule | undefined {
  return CUSTOM_INVOICE_MODULES.find((moduleType) => moduleType === value)
}
