import type { CustomInvoiceModule } from "@/api/customInvoices"
import type { CustomInvoicingModuleState } from "@/api/adminCustomInvoicingModules"

interface CatalogEntry {
  key: string
  name: string
  description: string
  /** Absent on coming-soon rows: the server has no such module, so there is nothing to toggle. */
  moduleType?: CustomInvoiceModule
  isComingSoon: boolean
}

export interface ModuleRow {
  key: string
  name: string
  description: string
  moduleType: CustomInvoiceModule | null
  isComingSoon: boolean
  isEnabled: boolean
  changedByName: string | null
  changedAtUtc: string | null
}

export const COMING_SOON_LABEL = "Coming soon"

const COMING_SOON_DESCRIPTION = `Custom invoicing for this module is ${COMING_SOON_LABEL.toLowerCase()}.`

export const CUSTOM_INVOICING_MODULE_CATALOG: readonly CatalogEntry[] = [
  {
    key: "donation",
    name: "Donation",
    description: "Bill pledges and campaign charges against a donation campaign.",
    moduleType: "Donation",
    isComingSoon: false,
  },
  {
    key: "membership",
    name: "Membership",
    description: "Bill members for charges outside their membership plan.",
    moduleType: "Membership",
    isComingSoon: false,
  },
  {
    key: "event",
    name: "Event",
    description: "Bill sponsors, exhibitors and other charges the ticket cart cannot express.",
    moduleType: "Event",
    isComingSoon: false,
  },
  { key: "trips-tours", name: "Trips & Tours", description: COMING_SOON_DESCRIPTION, isComingSoon: true },
  { key: "exhibitions", name: "Exhibitions", description: COMING_SOON_DESCRIPTION, isComingSoon: true },
  { key: "auction", name: "Auction", description: COMING_SOON_DESCRIPTION, isComingSoon: true },
]

/** A module the server does not report is treated as off, matching the server's deny-by-default rule. */
export function buildModuleRows(states: readonly CustomInvoicingModuleState[]): ModuleRow[] {
  return CUSTOM_INVOICING_MODULE_CATALOG.map((entry) => {
    const state = entry.moduleType ? states.find((candidate) => candidate.moduleType === entry.moduleType) : undefined

    return {
      key: entry.key,
      name: entry.name,
      description: entry.description,
      moduleType: entry.moduleType ?? null,
      isComingSoon: entry.isComingSoon,
      isEnabled: state?.isEnabled ?? false,
      changedByName: state?.updatedByName ?? null,
      changedAtUtc: state?.updatedAtUtc ?? null,
    }
  })
}
