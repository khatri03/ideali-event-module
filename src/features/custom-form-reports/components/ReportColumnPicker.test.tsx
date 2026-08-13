import { ChakraProvider } from "@chakra-ui/react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { system } from "@/theme"
import { ReportColumnPicker } from "./ReportColumnPicker"
import type { ReportField } from "@/api/customFormReports"

const FIELDS: ReportField[] = [
  { uniqueId: "field-1", label: "Dietary needs", controlType: "Text", displayOrder: 1, columnLabel: null },
  { uniqueId: "field-2", label: "T-shirt size", controlType: "Dropdown", displayOrder: 2, columnLabel: null },
  { uniqueId: "field-3", label: "Emergency contact", controlType: "Text", displayOrder: 3, columnLabel: null },
]

function renderPicker(overrides: Partial<Parameters<typeof ReportColumnPicker>[0]> = {}) {
  const onToggleField = vi.fn()
  const onClearFields = vi.fn()

  render(
    <ChakraProvider value={system}>
      <ReportColumnPicker
        fields={FIELDS}
        selectedFieldIds={[]}
        maxColumns={2}
        isLoading={false}
        onToggleField={onToggleField}
        onClearFields={onClearFields}
        {...overrides}
      />
    </ChakraProvider>,
  )

  return { onToggleField, onClearFields }
}

describe("ReportColumnPicker", () => {
  it("PermanentColumns_AreAnnouncedSoTheyAreNotSelectedTwice", () => {
    renderPicker()

    expect(
      screen.getByText("Invoice number, contact name, contact email and entity name are always included."),
    ).toBeInTheDocument()
  })

  it("SelectingAColumn_ReportsTheFieldToTheCaller", async () => {
    const { onToggleField } = renderPicker()

    await userEvent.click(screen.getByText("T-shirt size"))

    expect(onToggleField).toHaveBeenCalledWith("field-2")
  })

  it("ColumnLimitReached_BlocksFurtherSelectionAndSaysWhy", async () => {
    const { onToggleField } = renderPicker({ selectedFieldIds: ["field-1", "field-2"] })

    expect(screen.getByText("2 of 2 selected")).toBeInTheDocument()
    expect(screen.getByText("Column limit reached. Clear a column before adding another.")).toBeInTheDocument()

    await userEvent.click(screen.getByText("Emergency contact"))

    expect(onToggleField).not.toHaveBeenCalled()
  })

  it("ColumnLimitReached_StillAllowsDeselectingAChosenColumn", async () => {
    const { onToggleField } = renderPicker({ selectedFieldIds: ["field-1", "field-2"] })

    await userEvent.click(screen.getByText("Dietary needs"))

    expect(onToggleField).toHaveBeenCalledWith("field-1")
  })

  it("NothingSelected_LeavesClearDisabled", () => {
    renderPicker()

    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled()
  })

  it("FormWithoutReportableFields_ExplainsTheEmptyList", () => {
    renderPicker({ fields: [] })

    expect(screen.getByText("This form has no fields available for reporting.")).toBeInTheDocument()
  })
})
