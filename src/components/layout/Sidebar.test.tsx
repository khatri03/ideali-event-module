import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { MemoryRouter } from "react-router-dom"
import { system } from "@/theme"
import type { AuthUser } from "@/types"
import { APP_ROUTES } from "@/utils/routes"
import { Sidebar } from "./Sidebar"

const enabledModules = vi.hoisted(() => ({ useEnabledCustomInvoiceModules: vi.fn() }))

vi.mock("@/features/event-invoices", () => enabledModules)

/** Puts the enabled-modules request into one of its states: loaded with a module list, still loading, or failed. */
function givenEnabledModules(state: { data?: string[]; isLoading?: boolean; isError?: boolean }) {
  enabledModules.useEnabledCustomInvoiceModules.mockReturnValue({
    data: state.data,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
  })
}

const ORGANIZER: AuthUser = {
  id: "user-1",
  name: "Olivia Organizer",
  email: "olivia@example.test",
  role: "Organizer",
  roles: ["Organizer"],
}

const ADMIN: AuthUser = {
  id: "user-2",
  name: "Adam Admin",
  email: "adam@example.test",
  role: "Admin",
  roles: ["Admin"],
}

function renderSidebarAt(pathname: string, currentUser: AuthUser = ORGANIZER) {
  render(
    <ChakraProvider value={system}>
      <MemoryRouter initialEntries={[pathname]}>
        <Sidebar currentUser={currentUser} />
      </MemoryRouter>
    </ChakraProvider>,
  )
}

const navLink = (label: string) => screen.getByRole("link", { name: new RegExp(`^${label}$`) })
const queryNavLink = (label: string) => screen.queryByRole("link", { name: new RegExp(`^${label}$`) })
const CUSTOM_INVOICING_MODULES = "Custom Invoicing Modules"

describe("Sidebar", () => {
  beforeEach(() => {
    givenEnabledModules({ data: [] })
  })

  /** D-01: an organizer with Event invoicing on reaches the Event-locked invoice list from the Events group. */
  it("Sidebar_EventEnabled_ShowsCustomInvoicesChildUnderEventsOpeningTheLockedList", async () => {
    givenEnabledModules({ data: ["Event"] })
    renderSidebarAt(APP_ROUTES.dashboard)

    await userEvent.click(navLink("Events"))

    expect(navLink("Custom Invoices")).toHaveAttribute("href", "/organizer/custom-invoices/list?moduleType=Event")
  })

  /** D-03: Events keeps its own page; turning it into a group must not take away the link to the events list. */
  it("Sidebar_EventsHeader_NavigatesToEventsPage", () => {
    givenEnabledModules({ data: ["Event"] })
    renderSidebarAt(APP_ROUTES.dashboard)

    expect(navLink("Events")).toHaveAttribute("href", APP_ROUTES.events)
  })

  /** D-04: until the enabled modules are known the sidebar offers no module child, rather than one that may be refused. */
  it("Sidebar_EnabledModulesLoading_ShowsNoModuleChild", () => {
    givenEnabledModules({ isLoading: true })
    renderSidebarAt(`${APP_ROUTES.customInvoices.list}?moduleType=Event`)

    expect(queryNavLink("Custom Invoices")).not.toBeInTheDocument()
  })

  /** D-04: a failed enabled-modules request hides module children but must not take the rest of the navigation down. */
  it("Sidebar_EnabledModulesFailed_ShowsNoModuleChildAndKeepsNav", () => {
    givenEnabledModules({ isError: true })
    renderSidebarAt(`${APP_ROUTES.customInvoices.list}?moduleType=Event`)

    expect(queryNavLink("Custom Invoices")).not.toBeInTheDocument()
    expect(navLink("Events")).toHaveAttribute("href", APP_ROUTES.events)
    expect(navLink("Event Invoices")).toHaveAttribute("href", APP_ROUTES.eventInvoices.list)
  })

  /** CAT-03: the one organizer-wide category pool is reached at its custom-invoices path, not under Events. */
  it("Sidebar_InvoiceCategoriesItem_PointsAtTheRenamedPath", () => {
    renderSidebarAt(APP_ROUTES.dashboard)

    expect(navLink("Invoice Categories")).toHaveAttribute("href", "/organizer/custom-invoices/categories")
  })

  /**
   * The categories screen no longer nests under the Event Invoices path, so only its own item may light up
   * there; two highlighted items would leave the organizer unsure which screen is open.
   */
  it("Sidebar_EventInvoicesItem_IsNotActiveOnTheCategoriesScreen", () => {
    renderSidebarAt(APP_ROUTES.invoiceCategories.list)

    expect(navLink("Invoice Categories")).toHaveAttribute("aria-current", "page")
    expect(navLink("Event Invoices")).not.toHaveAttribute("aria-current")
  })

  /** D-09: an admin reaches the module enablement screen from the Admin group, beside the other admin settings. */
  it("Sidebar_AdminUser_ShowsCustomInvoicingModulesItemLinkingToItsRoute", async () => {
    renderSidebarAt(APP_ROUTES.dashboard, ADMIN)

    await userEvent.click(screen.getByRole("button", { name: /^Admin$/ }))

    expect(navLink(CUSTOM_INVOICING_MODULES)).toHaveAttribute("href", APP_ROUTES.adminCustomInvoicingModules)
  })

  /**
   * D-09: landing on the screen by URL must open the Admin group and mark its item as the current page,
   * otherwise the admin cannot tell where they are in the navigation.
   */
  it("Sidebar_OnCustomInvoicingModulesRoute_OpensAdminGroupAndMarksItemActive", () => {
    renderSidebarAt(APP_ROUTES.adminCustomInvoicingModules, ADMIN)

    expect(navLink(CUSTOM_INVOICING_MODULES)).toHaveAttribute("aria-current", "page")
    expect(navLink("Revenue Plans")).not.toHaveAttribute("aria-current")
  })

  /** D-13: the item is admin-only presentation; an organizer must never be offered a screen the API refuses them. */
  it("Sidebar_OrganizerUser_DoesNotShowCustomInvoicingModulesItem", () => {
    renderSidebarAt(APP_ROUTES.adminCustomInvoicingModules)

    expect(screen.queryByRole("link", { name: new RegExp(`^${CUSTOM_INVOICING_MODULES}$`) })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Admin$/ })).not.toBeInTheDocument()
  })
})
