import { ChakraProvider } from "@chakra-ui/react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { system } from "@/theme"
import { ReportTemplatesManager } from "./ReportTemplatesManager"

const hooks = vi.hoisted(() => ({ useReportTemplates: vi.fn(), deleteTemplate: vi.fn() }))

vi.mock("../hooks/useCustomFormReports", () => ({ useReportTemplates: hooks.useReportTemplates }))

vi.mock("../hooks/useCustomFormReportTemplateMutations", () => ({
  useDeleteReportTemplate: () => ({ mutateAsync: hooks.deleteTemplate, isPending: false, error: null }),
}))

function templatesPage() {
  return {
    items: [{ uniqueId: "template-1", name: "Dietary answers", moduleName: "Membership", columnCount: 4 }],
    total: 1,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  }
}

function renderManager() {
  render(
    <ChakraProvider value={system}>
      <ReportTemplatesManager />
    </ChakraProvider>,
  )
}

describe("ReportTemplatesManager", () => {
  beforeEach(() => {
    hooks.deleteTemplate.mockReset().mockResolvedValue(undefined)
    hooks.useReportTemplates.mockReset().mockReturnValue({
      data: templatesPage(),
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    })
  })

  it("SavedTemplates_AreListedWithTheirModule", () => {
    renderManager()

    expect(screen.getByText("Dietary answers")).toBeInTheDocument()
    expect(screen.getByText("Membership")).toBeInTheDocument()
  })

  it("Search_QueriesTheDebouncedTermFromTheFirstPage", async () => {
    renderManager()

    await userEvent.type(screen.getByLabelText("Search templates by name"), "diet")

    await waitFor(() => expect(hooks.useReportTemplates).toHaveBeenLastCalledWith("diet", 1, 10))
  })

  it("Delete_AsksBeforeRemovingTheTemplate", async () => {
    renderManager()

    await userEvent.click(screen.getByRole("button", { name: "Delete Dietary answers" }))

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument()
    expect(hooks.deleteTemplate).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Delete template" }))

    await waitFor(() => expect(hooks.deleteTemplate).toHaveBeenCalledWith("template-1"))
  })

  it("LoadFailure_TellsTheOrganizerRatherThanShowingAnEmptyList", () => {
    hooks.useReportTemplates.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: new Error("boom"),
    })

    renderManager()

    expect(screen.getByText("An unexpected error occurred.")).toBeInTheDocument()
  })
})
