import { describe, expect, it } from "vitest"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter, useLocation } from "react-router-dom"
import { DEFAULT_PAGE_SIZE } from "../constants"
import { useCustomInvoiceListSearchParams } from "./useCustomInvoiceListSearchParams"

/** Renders the hook at a list URL and exposes the live query string, so a test can assert what a shared link would carry. */
function renderAt(search: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[`/organizer/custom-invoices/list${search}`]}>{children}</MemoryRouter>
  )
  return renderHook(
    () => {
      const location = useLocation()
      return { filters: useCustomInvoiceListSearchParams(), search: new URLSearchParams(location.search) }
    },
    { wrapper },
  )
}

describe("useCustomInvoiceListSearchParams", () => {
  /** A first visit applies no filter at all: every status, every module, page 1 (D-17). */
  it("SearchParams_NoParams_AppliesNoFilter", () => {
    const { result } = renderAt("")

    expect(result.current.filters.query).toEqual({
      moduleType: undefined,
      categoryUniqueId: undefined,
      statuses: [],
      searchTerm: "",
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    })
    expect(result.current.filters.isModuleLocked).toBe(false)
  })

  /** Entering from a module child locks the list to that module; every request carries it (D-10). */
  it("SearchParams_ModuleTypeParam_LocksTheModule", () => {
    const { result } = renderAt("?moduleType=Event")

    expect(result.current.filters.isModuleLocked).toBe(true)
    expect(result.current.filters.lockedModule).toBe("Event")
    expect(result.current.filters.query.moduleType).toBe("Event")
  })

  /** While locked, a hand-edited free module param cannot widen or switch the list to another module. */
  it("SearchParams_LockedModule_IgnoresFreeModuleParam", () => {
    const { result } = renderAt("?moduleType=Event&module=Donation")

    expect(result.current.filters.query.moduleType).toBe("Event")
    expect(result.current.filters.freeModule).toBeUndefined()
  })

  /** An unknown module in the lock param is ignored and the list stays free, as the editor does (D-11). */
  it("SearchParams_UnknownModuleType_StaysUnlocked", () => {
    const { result } = renderAt("?moduleType=Bogus")

    expect(result.current.filters.isModuleLocked).toBe(false)
    expect(result.current.filters.query.moduleType).toBeUndefined()
  })

  /** Repeated status params restore a multi-select; values the server does not know are dropped, not sent. */
  it("SearchParams_StatusParams_KeepKnownValuesOnly", () => {
    const { result } = renderAt("?status=Paid&status=Overdue&status=Refund")

    expect(result.current.filters.query.statuses).toEqual(["Paid", "Overdue"])
  })

  /** A hand-edited page that is not a positive whole number reads as the first page. */
  it("SearchParams_NonNumericPage_ReadsAsOne", () => {
    const { result } = renderAt("?page=abc")

    expect(result.current.filters.query.page).toBe(1)
  })

  /** Page and page size survive in the URL so refresh and back land on the same page. */
  it("SearchParams_PageAndPageSize_PersistInUrl", () => {
    const { result } = renderAt("?page=3&pageSize=50")

    expect(result.current.filters.query).toMatchObject({ page: 3, pageSize: 50 })
  })

  /** Changing any filter starts at page 1; staying on page 3 of a narrower result would show nothing. */
  it("SearchParams_FilterChange_ResetsPageToOne", () => {
    const { result } = renderAt("?page=3")

    act(() => result.current.filters.toggleStatus("Paid"))

    expect(result.current.filters.query.page).toBe(1)
    expect(result.current.search.getAll("status")).toEqual(["Paid"])
  })

  /** Toggling a selected status removes it, leaving the others in place. */
  it("SearchParams_ToggleSelectedStatus_RemovesOnlyThatStatus", () => {
    const { result } = renderAt("?status=Paid&status=Overdue")

    act(() => result.current.filters.toggleStatus("Paid"))

    expect(result.current.filters.query.statuses).toEqual(["Overdue"])
  })

  /** The free module choice is written under its own param so choosing one never locks the list. */
  it("SearchParams_FreeModule_WritesModuleParamNotTheLock", () => {
    const { result } = renderAt("")

    act(() => result.current.filters.setFreeModule("Membership"))

    expect(result.current.search.get("module")).toBe("Membership")
    expect(result.current.search.has("moduleType")).toBe(false)
    expect(result.current.filters.query.moduleType).toBe("Membership")
    expect(result.current.filters.isModuleLocked).toBe(false)
  })

  /** Clear removes every chosen filter but keeps the module lock the organizer entered with. */
  it("SearchParams_ClearFilters_KeepsTheModuleLock", () => {
    const { result } = renderAt("?moduleType=Event&status=Paid&categoryUniqueId=cat-1&search=acme&page=2")

    act(() => result.current.filters.clearFilters())

    expect(Object.fromEntries(result.current.search)).toEqual({ moduleType: "Event" })
    expect(result.current.filters.hasActiveFilters).toBe(false)
  })
})
