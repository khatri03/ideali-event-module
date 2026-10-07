import { useSearchParams } from "react-router-dom"
import {
  CUSTOM_INVOICE_LIST_STATUSES,
  type CustomInvoiceListQuery,
  type CustomInvoiceListStatus,
  type CustomInvoiceModule,
} from "@/api/customInvoices"
import { CUSTOM_INVOICE_MODULE_PARAM, parseCustomInvoiceModule } from "@/utils/customInvoiceEntity"
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../constants"

// `moduleType` is reserved for the lock (D-10), so the free module choice travels under its own name;
// otherwise picking a module in the filter would lock the list.
const FREE_MODULE_PARAM = "module"
const STATUS_PARAM = "status"
const CATEGORY_PARAM = "categoryUniqueId"
const SEARCH_PARAM = "search"
const PAGE_PARAM = "page"
const PAGE_SIZE_PARAM = "pageSize"

function isListStatus(value: string): value is CustomInvoiceListStatus {
  return (CUSTOM_INVOICE_LIST_STATUSES as readonly string[]).includes(value)
}

function readPage(value: string | null): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

function readPageSize(value: string | null): number {
  const pageSize = Number(value)
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE
}

function setOrDelete(params: URLSearchParams, key: string, value: string | undefined) {
  if (value) params.set(key, value)
  else params.delete(key)
}

/**
 * The list's filters live in the URL so refresh, back and a shared link restore the same list. Every value
 * is user-editable, so each one is read defensively and an unknown value falls back to "no filter".
 */
export function useCustomInvoiceListSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const lockedModule = parseCustomInvoiceModule(searchParams.get(CUSTOM_INVOICE_MODULE_PARAM))
  const freeModule = lockedModule ? undefined : parseCustomInvoiceModule(searchParams.get(FREE_MODULE_PARAM))
  const statuses = [...new Set(searchParams.getAll(STATUS_PARAM).filter(isListStatus))]
  const categoryUniqueId = searchParams.get(CATEGORY_PARAM) || undefined
  const searchTerm = searchParams.get(SEARCH_PARAM) ?? ""

  const query: CustomInvoiceListQuery = {
    moduleType: lockedModule ?? freeModule,
    categoryUniqueId,
    statuses,
    searchTerm,
    page: readPage(searchParams.get(PAGE_PARAM)),
    pageSize: readPageSize(searchParams.get(PAGE_SIZE_PARAM)),
  }

  const hasActiveFilters = Boolean(freeModule || categoryUniqueId || statuses.length || searchTerm.trim())

  /** Any filter change starts over at page 1; a page beyond the new result set would show nothing. */
  function updateFilters(change: (params: URLSearchParams) => void) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      change(next)
      next.delete(PAGE_PARAM)
      return next
    })
  }

  function toggleStatus(status: CustomInvoiceListStatus) {
    const nextStatuses = statuses.includes(status) ? statuses.filter((value) => value !== status) : [...statuses, status]
    updateFilters((params) => {
      params.delete(STATUS_PARAM)
      nextStatuses.forEach((value) => params.append(STATUS_PARAM, value))
    })
  }

  function setPage(page: number) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      setOrDelete(next, PAGE_PARAM, page > 1 ? String(page) : undefined)
      return next
    })
  }

  function clearFilters() {
    updateFilters((params) => [FREE_MODULE_PARAM, STATUS_PARAM, CATEGORY_PARAM, SEARCH_PARAM].forEach((key) => params.delete(key)))
  }

  return {
    query,
    isModuleLocked: Boolean(lockedModule),
    lockedModule,
    freeModule,
    hasActiveFilters,
    setFreeModule: (moduleType: CustomInvoiceModule | undefined) =>
      updateFilters((params) => setOrDelete(params, FREE_MODULE_PARAM, moduleType)),
    setCategory: (uniqueId: string | undefined) => updateFilters((params) => setOrDelete(params, CATEGORY_PARAM, uniqueId)),
    setSearch: (term: string) => updateFilters((params) => setOrDelete(params, SEARCH_PARAM, term.trim() ? term : undefined)),
    setPageSize: (pageSize: number) => updateFilters((params) => params.set(PAGE_SIZE_PARAM, String(pageSize))),
    toggleStatus,
    setPage,
    clearFilters,
  }
}

export type CustomInvoiceListSearchParams = ReturnType<typeof useCustomInvoiceListSearchParams>
