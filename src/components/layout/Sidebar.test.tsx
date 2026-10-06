import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider } from "@chakra-ui/react"
import { MemoryRouter } from "react-router-dom"
import { system } from "@/theme"
import type { AuthUser } from "@/types"
import { APP_ROUTES } from "@/utils/routes"
import { Sidebar } from "./Sidebar"

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
const CUSTOM_INVOICING_MODULES = "Custom Invoicing Modules"

describe("Sidebar", () => {
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
