import { HandHeart, Users, Zap, type LucideIcon } from "lucide-react"
import type { CustomInvoiceModule } from "@/api/customInvoices"
import { CUSTOM_INVOICE_MODULE_PARAM, parseCustomInvoiceModule } from "@/utils/customInvoiceEntity"
import { APP_ROUTES } from "@/utils/routes"

export interface ModuleNavEntry {
  moduleType: CustomInvoiceModule
  label: string
  icon: LucideIcon
  /** The module's own page in this app. Membership and Donation pages live in the production frontend. */
  landingPath?: string
}

export const CUSTOM_INVOICE_MODULE_NAV: readonly ModuleNavEntry[] = [
  { moduleType: "Event", label: "Events", icon: Zap, landingPath: APP_ROUTES.events },
  { moduleType: "Membership", label: "Membership", icon: Users },
  { moduleType: "Donation", label: "Donation", icon: HandHeart },
]

const MODULE_LOCKABLE_PATHS: readonly string[] = [APP_ROUTES.customInvoices.list, APP_ROUTES.customInvoices.new]

function moduleFromSearch(search: string): CustomInvoiceModule | undefined {
  return parseCustomInvoiceModule(new URLSearchParams(search).get(CUSTOM_INVOICE_MODULE_PARAM))
}

/** True when the list or editor is open locked to this module. */
export function isModuleChildActive(moduleType: CustomInvoiceModule, pathname: string, search: string): boolean {
  return MODULE_LOCKABLE_PATHS.includes(pathname) && moduleFromSearch(search) === moduleType
}

/** A group with its own page always shows; one that exists only for custom invoices shows when the module is enabled. */
export function isGroupVisible(entry: ModuleNavEntry, isEnabled: boolean): boolean {
  return Boolean(entry.landingPath) || isEnabled
}

const CUSTOM_INVOICES_ROOT = "/organizer/custom-invoices/"

/** True on any organizer custom invoice screen that is not categories and not locked to a module. */
export function isStandaloneInvoicesActive(pathname: string, search: string): boolean {
  return (
    pathname.startsWith(CUSTOM_INVOICES_ROOT) &&
    pathname !== APP_ROUTES.invoiceCategories.list &&
    !pathname.startsWith(`${APP_ROUTES.invoiceCategories.list}/`) &&
    moduleFromSearch(search) === undefined
  )
}
