import { ChakraProvider } from "@chakra-ui/react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { REPORT_FILTER_OPERATOR, type ReportField } from "@/api/customFormReports"
import { system } from "@/theme"
import { MAX_REPORT_FILTERS } from "../constants"
import type { ReportFilterDraft } from "../schemas/customFormReport.schemas"
import { ReportFilterPanel } from "./ReportFilterPanel"

const fields: ReportField[] = [
  { uniqueId: "field-1", label: "Dietary needs", controlType: "Text", displayOrder: 1 },
  { uniqueId: "field-2", label: "T-shirt size", controlType: "Dropdown", displayOrder: 2 },
]

function draft(overrides: Partial<ReportFilterDraft> = {}): ReportFilterDraft {
  return {
    id: "filter-1",
    fieldUniqueId: "field-1",
    operator: REPORT_FILTER_OPERATOR.contains,
    value: "Vegan",
    ...overrides,
  }
}

function renderPanel(drafts: ReportFilterDraft[]) {
  const onAddFilter = vi.fn()
  const onChangeFilter = vi.fn()
  const onRemoveFilter = vi.fn()

  render(
    <ChakraProvider value={system}>
      <ReportFilterPanel
        fields={fields}
        drafts={drafts}
        onAddFilter={onAddFilter}
        onChangeFilter={onChangeFilter}
        onRemoveFilter={onRemoveFilter}
      />
    </ChakraProvider>,
  )

  return { onAddFilter, onChangeFilter, onRemoveFilter }
}

describe("ReportFilterPanel", () => {
  it("NoFilters_ExplainsThatEverySubmissionIsListed", () => {
    renderPanel([])

    expect(
      screen.getByText("No filters applied. The report lists every submission of the selected form."),
    ).toBeInTheDocument()
  })

  it("EditingAValue_ReportsTheWholeDraftBack", async () => {
    const { onChangeFilter } = renderPanel([draft({ value: "" })])

    await userEvent.type(screen.getByLabelText("Filter 1 value"), "V")

    expect(onChangeFilter).toHaveBeenCalledWith({
      id: "filter-1",
      fieldUniqueId: "field-1",
      operator: REPORT_FILTER_OPERATOR.contains,
      value: "V",
    })
  })

  it("Remove_TargetsTheFilterItBelongsTo", async () => {
    const { onRemoveFilter } = renderPanel([draft(), draft({ id: "filter-2", fieldUniqueId: "field-2" })])

    await userEvent.click(screen.getByRole("button", { name: "Remove filter 2" }))

    expect(onRemoveFilter).toHaveBeenCalledWith("filter-2")
  })

  it("FilterLimit_StopsFurtherFiltersBeingAdded", () => {
    const drafts = Array.from({ length: MAX_REPORT_FILTERS }, (_, index) => draft({ id: `filter-${index + 1}` }))

    renderPanel(drafts)

    expect(screen.getByRole("button", { name: /Add filter/ })).toBeDisabled()
    expect(screen.getByText("Filter limit reached. Remove a filter before adding another.")).toBeInTheDocument()
  })

  it("FormWithoutFields_LeavesNothingToFilterOn", () => {
    render(
      <ChakraProvider value={system}>
        <ReportFilterPanel
          fields={[]}
          drafts={[]}
          onAddFilter={vi.fn()}
          onChangeFilter={vi.fn()}
          onRemoveFilter={vi.fn()}
        />
      </ChakraProvider>,
    )

    expect(screen.getByRole("button", { name: /Add filter/ })).toBeDisabled()
  })

  it("OverlongValue_IsRejectedBeforeTheRequestIsBuilt", () => {
    renderPanel([draft({ value: "x".repeat(201) })])

    expect(screen.getByText("Filter values must be 200 characters or fewer.")).toBeInTheDocument()
  })
})
