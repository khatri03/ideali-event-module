import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { Route, Routes } from "react-router-dom"
import { auth } from "@/lib/auth"
import { APP_ROUTES } from "@/utils/routes"
import { moduleListResponse, renderWithProviders } from "../testHarness"
import { AdminCustomInvoicingModulesPage } from "./AdminCustomInvoicingModulesPage"

const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock("@/api/client", () => ({ client: http }))

function signInAs(role: string) {
  auth.setUser({ id: "7", name: "Ayesha Khan", email: "ayesha@ideali.test", role, roles: [role] })
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.adminCustomInvoicingModules} element={<AdminCustomInvoicingModulesPage />} />
      <Route path={APP_ROUTES.settings} element={<p>Organizer settings</p>} />
    </Routes>,
    APP_ROUTES.adminCustomInvoicingModules,
  )
}

describe("AdminCustomInvoicingModulesPage", () => {
  beforeEach(() => {
    http.get.mockReset()
    http.put.mockReset()
  })

  afterEach(() => {
    auth.clear()
  })

  /** Only admins may see the module switches; anyone else lands back on their own settings. */
  it("Page_NonAdmin_RedirectsToSettings", () => {
    signInAs("Organizer")

    renderPage()

    expect(screen.getByText("Organizer settings")).toBeInTheDocument()
    expect(screen.queryByText("Custom Invoicing Modules")).not.toBeInTheDocument()
    expect(http.get).not.toHaveBeenCalled()
  })

  /** The admin sees every module the platform knows of: three live switches and three not yet offered. */
  it("Page_Admin_ListsSixRows", async () => {
    signInAs("Admin")
    http.get.mockResolvedValue(
      moduleListResponse([
        { moduleType: "Event", isEnabled: true },
        { moduleType: "Membership", isEnabled: false },
        { moduleType: "Donation", isEnabled: false },
      ]),
    )

    renderPage()

    expect(screen.getByRole("heading", { name: "Custom Invoicing Modules" })).toBeInTheDocument()
    for (const name of ["Donation", "Membership", "Event", "Trips & Tours", "Exhibitions", "Auction"]) {
      expect(await screen.findByLabelText(`Custom invoicing for ${name}`)).toBeInTheDocument()
    }
    expect(screen.getAllByText("Coming soon")).toHaveLength(3)
  })

  /** A failed load explains itself and offers a retry instead of leaving an empty card. */
  it("Page_LoadFails_ShowsErrorStateWithRetry", async () => {
    signInAs("Admin")
    http.get.mockRejectedValue(new Error("network down"))

    renderPage()

    expect(await screen.findByText("Could not load modules")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument()
  })

  /** The first load shows the six-row skeleton rather than a blank area or a bare spinner. */
  it("Page_Loading_ShowsSkeleton", () => {
    signInAs("Admin")
    http.get.mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(screen.getAllByTestId("module-skeleton-row")).toHaveLength(6)
  })
})
