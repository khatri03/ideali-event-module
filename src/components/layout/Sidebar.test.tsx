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

  /** CAT-03, D-05: the organizer-wide category pool sits under the standalone Custom Invoices parent at its own path. */
  it("Sidebar_CategoriesChild_UnderCustomInvoices_PointsAtTheCategoriesPath", async () => {
    renderSidebarAt(APP_ROUTES.dashboard)

    await userEvent.click(screen.getByRole("button", { name: /^Custom Invoices$/ }))

    expect(navLink("Categories")).toHaveAttribute("href", "/organizer/custom-invoices/categories")
  })

  /**
   * The categories screen does not nest under the Event Invoices path, so only its own child may light up
   * there; two highlighted items would leave the organizer unsure which screen is open.
   */
  it("Sidebar_EventInvoicesItem_IsNotActiveOnTheCategoriesScreen", () => {
    renderSidebarAt(APP_ROUTES.invoiceCategories.list)

    expect(navLink("Categories")).toHaveAttribute("aria-current", "page")
    expect(navLink("Event Invoices")).not.toHaveAttribute("aria-current")
  })

  /** D-05: categories moved under Custom Invoices; a second flat entry would offer the same screen twice. */
  it("Sidebar_MainNav_HasNoInvoiceCategoriesItem", () => {
    renderSidebarAt(APP_ROUTES.invoiceCategories.list)

    expect(queryNavLink("Invoice Categories")).not.toBeInTheDocument()
  })

  /** D-04: the standalone parent does not depend on enablement, so it is there while the module list is still loading. */
  it("Sidebar_StandaloneParent_ShownWhileModulesLoad", () => {
    givenEnabledModules({ isLoading: true })
    renderSidebarAt(APP_ROUTES.dashboard)

    expect(screen.getByRole("button", { name: /^Custom Invoices$/ })).toBeInTheDocument()
  })

  /** D-09: the standalone Invoices child opens the list across every module, with no lock. */
  it("Sidebar_StandaloneInvoicesChild_OpensTheUnlockedList", async () => {
    renderSidebarAt(APP_ROUTES.dashboard)

    await userEvent.click(screen.getByRole("button", { name: /^Custom Invoices$/ }))

    expect(navLink("Invoices")).toHaveAttribute("href", "/organizer/custom-invoices/list")
  })

  /** On the unlocked list, and on an invoice opened from it, the organizer sees the Invoices child as where they are. */
  it.each([APP_ROUTES.customInvoices.list, APP_ROUTES.customInvoices.detail("inv-1"), APP_ROUTES.customInvoices.edit("inv-1")])(
    "Sidebar_StandaloneInvoicesChild_IsCurrentOn_%s",
    (pathname) => {
      renderSidebarAt(pathname)

      expect(navLink("Invoices")).toHaveAttribute("aria-current", "page")
    },
  )

  /** A module-locked list belongs to its module's group; only that group's child is current, never the standalone one. */
  it("Sidebar_ModuleLockedList_OpensThatModuleGroupAndMarksOnlyItsChild", () => {
    givenEnabledModules({ data: ["Event", "Membership"] })
    renderSidebarAt(`${APP_ROUTES.customInvoices.list}?moduleType=Membership`)

    const currentLinks = screen.getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page")
    expect(currentLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/organizer/custom-invoices/list?moduleType=Membership",
    ])
  })

  /** D-02: a module with custom invoicing off has no group of its own in this app, so nothing for it is offered. */
  it("Sidebar_DisabledMembership_ShowsNoMembershipGroup", () => {
    givenEnabledModules({ data: ["Event"] })
    renderSidebarAt(APP_ROUTES.dashboard)

    expect(screen.queryByRole("button", { name: /^Membership$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Donation$/ })).not.toBeInTheDocument()
  })

  /** D-03: Membership has no page in this app, so its header only expands the group and never navigates. */
  it("Sidebar_MembershipHeader_IsAToggleNotALink", async () => {
    givenEnabledModules({ data: ["Membership"] })
    renderSidebarAt(APP_ROUTES.dashboard)

    expect(queryNavLink("Membership")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /^Membership$/ }))

    expect(navLink("Custom Invoices")).toHaveAttribute("href", "/organizer/custom-invoices/list?moduleType=Membership")
  })

  /** D-08: Event Invoices lists registration invoices only, so it must not light up on any custom invoice screen. */
  it.each([
    APP_ROUTES.customInvoices.list,
    `${APP_ROUTES.customInvoices.list}?moduleType=Event`,
    APP_ROUTES.customInvoices.detail("inv-1"),
  ])("Sidebar_EventInvoicesItem_IsNotCurrentOn_%s", (pathname) => {
    givenEnabledModules({ data: ["Event"] })
    renderSidebarAt(pathname)

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
