import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
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

function renderSidebarAt(pathname: string) {
  render(
    <ChakraProvider value={system}>
      <MemoryRouter initialEntries={[pathname]}>
        <Sidebar currentUser={ORGANIZER} />
      </MemoryRouter>
    </ChakraProvider>,
  )
}

const navLink = (label: string) => screen.getByRole("link", { name: new RegExp(`^${label}$`) })

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
})
