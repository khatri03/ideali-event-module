import { afterEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, useLocation } from "react-router-dom"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { useCustomInvoiceListSearchParams } from "../hooks/useCustomInvoiceListSearchParams"
import { CustomInvoiceListFilterBar } from "./CustomInvoiceListFilterBar"

// Stable references, as TanStack Query gives: a fresh array per render would rebuild the select's collection mid-click.
const { FILTER_OPTIONS, ENABLED_MODULES } = vi.hoisted(() => ({
  FILTER_OPTIONS: {
    data: {
      moduleTypes: ["Donation"],
      categories: [
        { uniqueId: "cat-1", name: "Gold Sponsor", isActive: true },
        { uniqueId: "cat-2", name: "Retired Tier", isActive: false },
      ],
    },
  },
  ENABLED_MODULES: { data: ["Event"] },
}))

vi.mock("../hooks/useCustomInvoiceList", () => ({ useCustomInvoiceListFilterOptions: () => FILTER_OPTIONS }))

vi.mock("../hooks/useCustomInvoiceAuthoringOptions", () => ({ useEnabledCustomInvoiceModules: () => ENABLED_MODULES }))

/** The bar wired to the real URL-backed filter state, with the live query string printed for assertions. */
function FilterBarHarness() {
  const filters = useCustomInvoiceListSearchParams()
  const location = useLocation()
  return (
    <>
      <CustomInvoiceListFilterBar filters={filters} />
      <output data-testid="search">{location.search}</output>
    </>
  )
}

function renderAt(search = "") {
  return render(
    <ChakraProvider value={system}>
      <MemoryRouter initialEntries={[`/organizer/custom-invoices/list${search}`]}>
        <FilterBarHarness />
      </MemoryRouter>
    </ChakraProvider>,
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe("CustomInvoiceListFilterBar", () => {
  /** Entered from a module, the module cannot be changed here and the bar says why the list is narrowed. */
  it("FilterBar_LockedModule_IsReadOnlyWithHelper", () => {
    renderAt("?moduleType=Event")

    expect(screen.getByRole("combobox", { name: "Module" })).toBeDisabled()
    expect(screen.getByText("Showing Event invoices only.")).toBeInTheDocument()
  })

  /** A status chip reports its pressed state to assistive tech and writes the status into the URL. */
  it("FilterBar_StatusChip_TogglesAriaPressed", async () => {
    const user = userEvent.setup()
    renderAt()
    const overdue = screen.getByRole("button", { name: "Overdue" })

    await user.click(overdue)

    expect(overdue).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByTestId("search")).toHaveTextContent("status=Overdue")

    await user.click(overdue)

    expect(overdue).toHaveAttribute("aria-pressed", "false")
  })

  /** The free module filter offers enabled modules plus modules that still have invoices, in module order (D-15). */
  it("FilterBar_FreeModule_OffersEnabledAndInvoicedModules", async () => {
    const user = userEvent.setup()
    renderAt()

    await user.click(screen.getByRole("combobox", { name: "Module" }))

    const options = await screen.findAllByRole("option")
    expect(options.map((option) => option.textContent)).toEqual(["All modules", "Event", "Donation"])
  })

  /** Picking a module in the free filter writes the free param, never the lock. */
  it("FilterBar_PickModule_WritesFreeModuleParam", async () => {
    const user = userEvent.setup()
    renderAt()

    await user.click(screen.getByRole("combobox", { name: "Module" }))
    await user.click(await screen.findByRole("option", { name: "Donation" }))

    await waitFor(() => expect(screen.getByTestId("search")).toHaveTextContent("?module=Donation"))
  })

  /** Inactive categories stay filterable for old invoices but are labelled so they are not mistaken for current ones. */
  it("FilterBar_InactiveCategory_IsLabelledInactive", async () => {
    const user = userEvent.setup()
    renderAt()

    await user.click(screen.getByRole("combobox", { name: "Category" }))

    expect(await screen.findByRole("option", { name: "Retired Tier (inactive)" })).toBeInTheDocument()
  })

  /** Search writes the URL once typing pauses, not on every keystroke. */
  it("FilterBar_Search_WritesUrlAfterDebounce", () => {
    vi.useFakeTimers()
    renderAt()

    fireEvent.change(screen.getByPlaceholderText("Invoice no, buyer, email or company"), { target: { value: "acme" } })

    expect(screen.getByTestId("search")).toHaveTextContent(/^$/)
    act(() => vi.advanceTimersByTime(400))
    expect(screen.getByTestId("search")).toHaveTextContent("?search=acme")
  })

  /** With nothing applied, Clear filters has nothing to do and is disabled. */
  it("FilterBar_NoFilters_ClearIsDisabled", () => {
    renderAt("?moduleType=Event")

    expect(screen.getByRole("button", { name: "Clear filters" })).toBeDisabled()
  })

  /** Clear filters empties every chosen filter, including the search box. */
  it("FilterBar_ClearFilters_ResetsFiltersAndSearchBox", async () => {
    const user = userEvent.setup()
    renderAt("?status=Paid&search=acme")

    await user.click(screen.getByRole("button", { name: "Clear filters" }))

    expect(screen.getByTestId("search")).toHaveTextContent(/^$/)
    expect(screen.getByPlaceholderText("Invoice no, buyer, email or company")).toHaveValue("")
    expect(screen.getByRole("button", { name: "Paid" })).toHaveAttribute("aria-pressed", "false")
  })
})
