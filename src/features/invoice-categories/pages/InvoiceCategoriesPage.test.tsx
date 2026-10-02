import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { InvoiceCategoriesPage } from "./InvoiceCategoriesPage"

const http = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/api/client", () => ({ client: http }))

function categoryPayload(rows: Array<Record<string, unknown>>) {
  return {
    data: {
      success: true,
      Data: {
        PageNo: 1,
        PageSize: 10,
        PageCount: rows.length ? 1 : 0,
        TotalRecordsCount: rows.length,
        PageData: rows,
      },
    },
  }
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ChakraProvider value={system}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
      </ChakraProvider>
    )
  }
  return render(<InvoiceCategoriesPage />, { wrapper: Wrapper })
}

describe("InvoiceCategoriesPage", () => {
  beforeEach(() => {
    http.get.mockReset()
  })

  /** A caller with categories must see them, parsed from the real ServiceResponse envelope. */
  it("EndpointReturnsCategories_RendersThemAsRows", async () => {
    http.get.mockResolvedValue(
      categoryPayload([
        { UniqueId: "cat-1", Name: "Gold Sponsor", IsActive: true, DisplayOrder: 1, CreatedOnUtc: "2026-01-02T08:00:00Z" },
        { UniqueId: "cat-2", Name: "Booth", IsActive: false, DisplayOrder: 2, CreatedOnUtc: "2026-01-03T08:00:00Z" },
      ]),
    )

    renderPage()

    expect(await screen.findByText("Gold Sponsor")).toBeInTheDocument()
    expect(screen.getByText("Booth")).toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()
    expect(screen.getByText("Inactive")).toBeInTheDocument()
  })

  /** The list never flashes a blank area or a bare spinner while the first request is in flight. */
  it("QueryInFlight_ShowsSkeletonRows", () => {
    http.get.mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(screen.getAllByTestId("category-skeleton-row").length).toBeGreaterThan(0)
  })

  /** Zero categories names the gap and the next action rather than showing an empty table. */
  it("EndpointReturnsNoCategories_ShowsEmptyState", async () => {
    http.get.mockResolvedValue(categoryPayload([]))

    renderPage()

    expect(await screen.findByText("No invoice categories yet")).toBeInTheDocument()
  })

  /** A failed load surfaces a recoverable error, not a blank screen. */
  it("EndpointFails_ShowsErrorStateWithRetry", async () => {
    http.get.mockRejectedValue(new Error("network down"))

    renderPage()

    expect(await screen.findByText("Could not load categories")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument()
  })
})
