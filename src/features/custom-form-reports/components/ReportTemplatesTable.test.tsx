import { ChakraProvider } from "@chakra-ui/react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { system } from "@/theme"
import { ReportTemplatesTable } from "./ReportTemplatesTable"
import type { ReportTemplateListItem } from "@/api/customFormReports"

const TEMPLATE: ReportTemplateListItem = {
  uniqueId: "template-1",
  name: "Dietary answers",
  moduleName: "Membership",
  columnCount: 4,
}

function renderTable(templates: ReportTemplateListItem[] = [TEMPLATE]) {
  const onDelete = vi.fn()

  render(
    <ChakraProvider value={system}>
      <ReportTemplatesTable templates={templates} isFetching={false} onDelete={onDelete} />
    </ChakraProvider>,
  )

  return { onDelete }
}

describe("ReportTemplatesTable", () => {
  it("Template_ShowsItsNameAndOwningModule", () => {
    renderTable()

    expect(screen.getByText("Dietary answers")).toBeInTheDocument()
    expect(screen.getByText("Membership")).toBeInTheDocument()
  })

  it("Delete_HandsTheTemplateBackForConfirmationRatherThanDeletingImmediately", async () => {
    const { onDelete } = renderTable()

    await userEvent.click(screen.getByRole("button", { name: "Delete Dietary answers" }))

    expect(onDelete).toHaveBeenCalledWith(TEMPLATE)
  })

  it("NoTemplates_ExplainsHowOneIsCreated", () => {
    renderTable([])

    expect(screen.getByText("No saved templates yet")).toBeInTheDocument()
  })
})
