import { ChakraProvider } from "@chakra-ui/react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { system } from "@/theme"
import { CustomFormReportBuilder } from "./CustomFormReportBuilder"

const hooks = vi.hoisted(() => ({ useCustomFormReport: vi.fn(), useReportTemplate: vi.fn(), exportReport: vi.fn() }))

/** Stands in for the four cascading selects, whose Ark popover is not what these tests are about. */
vi.mock("./ReportSourcePicker", () => ({
  ReportSourcePicker: ({
    moduleId,
    entityUniqueId,
    formUniqueId,
    onModuleChange,
    onEntityChange,
    onFormChange,
    onTemplateChange,
  }: {
    moduleId: number | null
    entityUniqueId: string | null
    formUniqueId: string | null
    onModuleChange: (moduleId: number) => void
    onEntityChange: (entityUniqueId: string) => void
    onFormChange: (formUniqueId: string) => void
    onTemplateChange: (templateUniqueId: string | null) => void
  }) => (
    <div>
      <span data-testid="selection">{`${moduleId ?? "-"}|${entityUniqueId ?? "-"}|${formUniqueId ?? "-"}`}</span>
      <button type="button" onClick={() => onModuleChange(1)}>
        pick module 1
      </button>
      <button type="button" onClick={() => onModuleChange(2)}>
        pick module 2
      </button>
      <button type="button" onClick={() => onEntityChange("entity-1")}>
        pick entity
      </button>
      <button type="button" onClick={() => onFormChange("form-1")}>
        pick form
      </button>
      <button type="button" onClick={() => onTemplateChange("template-1")}>
        pick template
      </button>
    </div>
  ),
}))

vi.mock("../hooks/useCustomFormReportTemplateMutations", () => ({
  useCreateReportTemplate: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }),
  useUpdateReportTemplate: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }),
}))

vi.mock("../hooks/useExportCustomFormReport", () => ({
  useExportCustomFormReport: () => ({ mutateAsync: hooks.exportReport, isPending: false }),
}))

vi.mock("../hooks/useCustomFormReports", () => ({
  useReportModules: () => ({ data: [{ id: 1, name: "Event" }], isLoading: false }),
  useReportEntities: () => ({ data: [{ uniqueId: "entity-1", name: "Convention" }], isLoading: false }),
  useReportForms: () => ({ data: [{ uniqueId: "form-1", name: "Attendee form" }], isLoading: false }),
  useReportColumns: () => ({
    data: {
      formUniqueId: "form-1",
      formName: "Attendee form",
      maxColumns: 2,
      fields: [
        { uniqueId: "field-1", label: "Dietary needs", controlType: "Text", displayOrder: 1 },
        { uniqueId: "field-2", label: "T-shirt size", controlType: "Dropdown", displayOrder: 2 },
        { uniqueId: "field-3", label: "Emergency contact", controlType: "Text", displayOrder: 3 },
      ],
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
  useReportTemplateOptions: () => ({ data: [], isLoading: false }),
  useReportTemplate: hooks.useReportTemplate,
  useCustomFormReport: hooks.useCustomFormReport,
}))

function renderBuilder() {
  return render(
    <ChakraProvider value={system}>
      <CustomFormReportBuilder />
    </ChakraProvider>,
  )
}

function lastReportRequest() {
  const calls = hooks.useCustomFormReport.mock.calls
  return calls[calls.length - 1][0]
}

const RESULT_ROW = {
  invoiceNo: "INV-1",
  contactName: "Alice Stone",
  contactNo: "+1-555-0199",
  contactEmail: "alice@example.com",
  entityName: "Gold",
  answers: { "field-1": "Vegan" },
}

function answerWithRows(items: (typeof RESULT_ROW)[], totalPages: number) {
  hooks.useCustomFormReport.mockReturnValue({
    data: {
      columns: [
        { uniqueId: "field-1", label: "Dietary needs", controlType: "Text", displayOrder: 1, columnLabel: null },
      ],
      rows: { items, total: totalPages * 10, page: 1, pageSize: 10, totalPages },
    },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
  })
}

/** Sorting is only reachable once results are on screen, so these runs answer with a row to click a header on. */
function renderBuilderWithResults(totalPages = 1) {
  answerWithRows([RESULT_ROW], totalPages)

  return renderBuilder()
}

function renderBuilderWithoutResults() {
  answerWithRows([], 0)

  return renderBuilder()
}

function sortByColumn(label: string) {
  return userEvent.click(within(screen.getByRole("table")).getByRole("button", { name: label }))
}

async function pickSourceAndColumn() {
  await userEvent.click(screen.getByRole("button", { name: "pick module 1" }))
  await userEvent.click(screen.getByRole("button", { name: "pick entity" }))
  await userEvent.click(screen.getByRole("button", { name: "pick form" }))
  await userEvent.click(screen.getByText("Dietary needs"))
}

async function exportAs(label: string, scope: RegExp) {
  await userEvent.click(screen.getByRole("button", { name: /Export/ }))
  await userEvent.click(await screen.findByRole("menuitem", { name: label }))
  await userEvent.click(await screen.findByRole("button", { name: scope }))
}

describe("CustomFormReportBuilder", () => {
  beforeEach(() => {
    hooks.exportReport.mockReset().mockResolvedValue(undefined)
    hooks.useCustomFormReport.mockReset().mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    })
    hooks.useReportTemplate.mockReset().mockReturnValue({ data: undefined })
  })

  it("PickingASavedTemplate_RunsTheReportForItsColumnsWithoutNeedingApply", async () => {
    renderBuilder()
    await userEvent.click(screen.getByRole("button", { name: "pick module 1" }))
    await userEvent.click(screen.getByRole("button", { name: "pick entity" }))
    await userEvent.click(screen.getByRole("button", { name: "pick form" }))

    hooks.useReportTemplate.mockReturnValue({
      data: {
        uniqueId: "template-1",
        name: "Dietary only",
        moduleId: 1,
        moduleName: "Event",
        formUniqueId: "form-1",
        formName: "Attendee form",
        columns: [{ uniqueId: "field-1", label: "Dietary needs", controlType: "Text", displayOrder: 1 }],
      },
    })
    await userEvent.click(screen.getByRole("button", { name: "pick template" }))

    await waitFor(() =>
      expect(lastReportRequest()).toEqual({
        moduleId: 1,
        entityUniqueId: "entity-1",
        formUniqueId: "form-1",
        fieldUniqueIds: ["field-1"],
        filters: [],
        sortFieldUniqueId: null,
        sortSystemField: null,
        sortDescending: false,
        pageNo: 1,
        pageSize: 10,
      }),
    )
    expect(screen.getByText("Dietary needs")).toBeInTheDocument()
  })

  it("IncompleteSelection_KeepsApplyDisabled", async () => {
    renderBuilder()

    expect(screen.getByRole("button", { name: /Apply/ })).toBeDisabled()

    await userEvent.click(screen.getByRole("button", { name: "pick module 1" }))
    await userEvent.click(screen.getByRole("button", { name: "pick entity" }))

    expect(screen.getByRole("button", { name: /Apply/ })).toBeDisabled()
  })

  it("Apply_RunsTheReportForTheChosenSourceAndColumns", async () => {
    renderBuilder()
    await pickSourceAndColumn()

    expect(hooks.useCustomFormReport).toHaveBeenLastCalledWith(null)

    await userEvent.click(screen.getByRole("button", { name: /Apply/ }))

    await waitFor(() =>
      expect(lastReportRequest()).toEqual({
        moduleId: 1,
        entityUniqueId: "entity-1",
        formUniqueId: "form-1",
        fieldUniqueIds: ["field-1"],
        filters: [],
        sortFieldUniqueId: null,
        sortSystemField: null,
        sortDescending: false,
        pageNo: 1,
        pageSize: 10,
      }),
    )
  })

  it("ChangingModule_ClearsTheEntityFormAndRunningReport", async () => {
    renderBuilder()
    await pickSourceAndColumn()
    await userEvent.click(screen.getByRole("button", { name: /Apply/ }))

    await waitFor(() => expect(lastReportRequest()).not.toBeNull())

    await userEvent.click(screen.getByRole("button", { name: "pick module 2" }))

    expect(screen.getByTestId("selection")).toHaveTextContent("2|-|-")
    expect(lastReportRequest()).toBeNull()
  })

  it("ColumnLimit_StopsAtTheMaximumTheServerAllows", async () => {
    renderBuilder()
    await pickSourceAndColumn()
    await userEvent.click(screen.getByText("T-shirt size"))

    expect(screen.getByText("2 of 2 selected")).toBeInTheDocument()

    await userEvent.click(screen.getByText("Emergency contact"))

    expect(screen.getByText("2 of 2 selected")).toBeInTheDocument()
  })

  it("Filter_IsSentAlongsideTheChosenColumns", async () => {
    renderBuilder()
    await pickSourceAndColumn()

    await userEvent.click(screen.getByRole("button", { name: /Add filter/ }))
    await userEvent.selectOptions(screen.getByLabelText("Filter 1 field"), "field-2")
    await userEvent.selectOptions(screen.getByLabelText("Filter 1 condition"), "4")
    await userEvent.type(screen.getByLabelText("Filter 1 value"), "Large, Medium")

    await userEvent.click(screen.getByRole("button", { name: /Apply/ }))

    await waitFor(() =>
      expect(lastReportRequest().filters).toEqual([
        { fieldUniqueId: "field-2", systemField: null, operator: 4, values: ["Large", "Medium"] },
      ]),
    )
  })

  it("RecordDetailFilter_IsSentAsASystemFieldRatherThanAFormField", async () => {
    renderBuilder()
    await pickSourceAndColumn()

    await userEvent.click(screen.getByRole("button", { name: /Add filter/ }))
    await userEvent.selectOptions(screen.getByLabelText("Filter 1 field"), "record-detail:3")
    await userEvent.type(screen.getByLabelText("Filter 1 value"), "555-0199")

    await userEvent.click(screen.getByRole("button", { name: /Apply/ }))

    await waitFor(() =>
      expect(lastReportRequest().filters).toEqual([
        { fieldUniqueId: null, systemField: 3, operator: 1, values: ["555-0199"] },
      ]),
    )
  })

  it("PresenceFilter_IsSentWithoutAValue", async () => {
    renderBuilder()
    await pickSourceAndColumn()

    await userEvent.click(screen.getByRole("button", { name: /Add filter/ }))
    await userEvent.selectOptions(screen.getByLabelText("Filter 1 field"), "field-1")
    await userEvent.selectOptions(screen.getByLabelText("Filter 1 condition"), "5")

    expect(screen.getByLabelText("Filter 1 value")).toBeDisabled()

    await userEvent.click(screen.getByRole("button", { name: /Apply/ }))

    await waitFor(() =>
      expect(lastReportRequest().filters).toEqual([
        { fieldUniqueId: "field-1", systemField: null, operator: 5, values: [] },
      ]),
    )
  })

  it("FilterWithoutAValue_LeavesApplyUsableAndSaysItIsSkipped", async () => {
    renderBuilder()
    await pickSourceAndColumn()

    await userEvent.click(screen.getByRole("button", { name: /Add filter/ }))

    expect(screen.getByText("This filter is skipped until you enter a value.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Apply/ })).toBeEnabled()

    await userEvent.click(screen.getByRole("button", { name: /Apply/ }))

    await waitFor(() => expect(lastReportRequest().filters).toEqual([]))
  })

  it("BlankFilterAlongsideAFilledOne_SendsOnlyTheFilledFilter", async () => {
    renderBuilder()
    await pickSourceAndColumn()

    await userEvent.click(screen.getByRole("button", { name: /Add filter/ }))
    await userEvent.selectOptions(screen.getByLabelText("Filter 1 field"), "field-2")
    await userEvent.type(screen.getByLabelText("Filter 1 value"), "Large")
    await userEvent.click(screen.getByRole("button", { name: /Add filter/ }))

    await userEvent.click(screen.getByRole("button", { name: /Apply/ }))

    await waitFor(() =>
      expect(lastReportRequest().filters).toEqual([
        { fieldUniqueId: "field-2", systemField: null, operator: 1, values: ["Large"] },
      ]),
    )
  })

  it("OverlongFilterValue_StillKeepsApplyDisabled", async () => {
    renderBuilder()
    await pickSourceAndColumn()

    await userEvent.click(screen.getByRole("button", { name: /Add filter/ }))
    await userEvent.click(screen.getByLabelText("Filter 1 value"))
    await userEvent.paste("x".repeat(201))

    expect(screen.getByText("Filter values must be 200 characters or fewer.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Apply/ })).toBeDisabled()
  })

  it("RemovingAFilter_TakesTheRowAway", async () => {
    renderBuilder()
    await pickSourceAndColumn()

    await userEvent.click(screen.getByRole("button", { name: /Add filter/ }))
    await userEvent.click(screen.getByRole("button", { name: "Remove filter 1" }))

    expect(screen.queryByLabelText("Filter 1 value")).not.toBeInTheDocument()
  })

  it("ChangingModule_ClearsTheFiltersOfThePreviousForm", async () => {
    renderBuilder()
    await pickSourceAndColumn()

    await userEvent.click(screen.getByRole("button", { name: /Add filter/ }))
    await userEvent.click(screen.getByRole("button", { name: "pick module 2" }))
    await userEvent.click(screen.getByRole("button", { name: "pick entity" }))
    await userEvent.click(screen.getByRole("button", { name: "pick form" }))

    expect(screen.queryByLabelText("Filter 1 value")).not.toBeInTheDocument()
  })

  it("SortingByAColumn_RunsTheReportOrderedByThatColumn", async () => {
    renderBuilderWithResults()
    await pickSourceAndColumn()
    await userEvent.click(screen.getByRole("button", { name: /Apply/ }))

    await sortByColumn("Dietary needs")

    expect(lastReportRequest()).toMatchObject({
      sortFieldUniqueId: "field-1",
      sortSystemField: null,
      sortDescending: false,
    })
  })

  it("SortingByARecordDetail_SendsItAsASystemFieldRatherThanAColumn", async () => {
    renderBuilderWithResults()
    await pickSourceAndColumn()
    await userEvent.click(screen.getByRole("button", { name: /Apply/ }))

    await sortByColumn("Contact Name")

    expect(lastReportRequest()).toMatchObject({
      sortFieldUniqueId: null,
      sortSystemField: 2,
      sortDescending: false,
    })
  })

  it("SortingTheSameColumnRepeatedly_ReversesThenReturnsToTheDefaultOrder", async () => {
    renderBuilderWithResults()
    await pickSourceAndColumn()
    await userEvent.click(screen.getByRole("button", { name: /Apply/ }))

    await sortByColumn("Dietary needs")
    await sortByColumn("Dietary needs")

    expect(lastReportRequest()).toMatchObject({ sortFieldUniqueId: "field-1", sortDescending: true })

    await sortByColumn("Dietary needs")

    expect(lastReportRequest()).toMatchObject({ sortFieldUniqueId: null, sortDescending: false })
  })

  it("SortingAfterPagingOn_ReturnsToTheFirstPage", async () => {
    renderBuilderWithResults(3)
    await pickSourceAndColumn()
    await userEvent.click(screen.getByRole("button", { name: /Apply/ }))
    await userEvent.selectOptions(screen.getByLabelText("Go to page"), "2")

    expect(lastReportRequest().pageNo).toBe(2)

    await sortByColumn("Dietary needs")

    expect(lastReportRequest().pageNo).toBe(1)
  })

  it("DeselectingTheSortedColumn_ReturnsTheReportToItsDefaultOrder", async () => {
    renderBuilderWithResults()
    await pickSourceAndColumn()
    await userEvent.click(screen.getByRole("button", { name: /Apply/ }))
    await sortByColumn("Dietary needs")

    await userEvent.click(screen.getByRole("checkbox", { name: "Dietary needs" }))

    expect(lastReportRequest().sortFieldUniqueId).toBeNull()
  })

  it("Export_BeforeAReportHasRun_IsNotOffered", async () => {
    renderBuilder()
    await pickSourceAndColumn()

    expect(screen.queryByRole("button", { name: /Export/ })).not.toBeInTheDocument()
  })

  it("Export_OfAReportThatMatchedNothing_IsNotOffered", async () => {
    renderBuilderWithoutResults()
    await pickSourceAndColumn()
    await userEvent.click(screen.getByRole("button", { name: /Apply/ }))

    expect(await screen.findByText("No submissions match this report.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Export/ })).not.toBeInTheDocument()
  })

  it("ExportOfEveryRow_RepeatsTheColumnsAndSortTheReportIsShowing", async () => {
    renderBuilderWithResults()
    await pickSourceAndColumn()
    await userEvent.click(screen.getByRole("button", { name: /Apply/ }))
    await sortByColumn("Dietary needs")

    await exportAs("Excel", /Every row matching the filters/)

    expect(hooks.exportReport).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldUniqueIds: ["field-1"],
        sortFieldUniqueId: "field-1",
        sortDescending: false,
        format: 2,
        scope: 2,
        templateUniqueId: null,
      }),
    )
  })

  it("ExportOfThisPage_CarriesThePageTheReaderIsOn", async () => {
    renderBuilderWithResults(3)
    await pickSourceAndColumn()
    await userEvent.click(screen.getByRole("button", { name: /Apply/ }))
    await userEvent.selectOptions(screen.getByLabelText("Go to page"), "2")

    await exportAs("CSV", /This page only/)

    expect(hooks.exportReport).toHaveBeenCalledWith(
      expect.objectContaining({ pageNo: 2, pageSize: 10, format: 1, scope: 1 }),
    )
  })

  it("EditingAfterARun_SaysTheResultsAreStaleAndRenamesApply", async () => {
    renderBuilderWithResults()
    await pickSourceAndColumn()
    await userEvent.click(screen.getByRole("button", { name: /Apply/ }))

    expect(screen.queryByText(/from an earlier run/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("checkbox", { name: "T-shirt size" }))

    expect(screen.getByText(/These results are from an earlier run/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Apply changes/ })).toBeEnabled()
  })

  it("Export_WhileTheResultsAreStale_IsRefusedUntilTheChangesAreApplied", async () => {
    renderBuilderWithResults()
    await pickSourceAndColumn()
    await userEvent.click(screen.getByRole("button", { name: /Apply/ }))

    await userEvent.click(screen.getByRole("checkbox", { name: "T-shirt size" }))

    expect(screen.getByRole("button", { name: /Export/ })).toBeDisabled()
  })

  it("ReapplyingTheChanges_ClearsTheStaleWarning", async () => {
    renderBuilderWithResults()
    await pickSourceAndColumn()
    await userEvent.click(screen.getByRole("button", { name: /Apply/ }))
    await userEvent.click(screen.getByRole("checkbox", { name: "T-shirt size" }))

    await userEvent.click(screen.getByRole("button", { name: /Apply changes/ }))

    expect(screen.queryByText(/from an earlier run/)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Export/ })).toBeEnabled()
  })

  it("SortingOrPaging_IsNotMistakenForAnUnappliedChange", async () => {
    renderBuilderWithResults(3)
    await pickSourceAndColumn()
    await userEvent.click(screen.getByRole("button", { name: /Apply/ }))

    await sortByColumn("Dietary needs")
    await userEvent.selectOptions(screen.getByLabelText("Go to page"), "2")

    expect(screen.queryByText(/from an earlier run/)).not.toBeInTheDocument()
  })

  it("ClearingEveryColumnAfterARun_StillWarnsThatTheTableIsBehind", async () => {
    renderBuilderWithResults()
    await pickSourceAndColumn()
    await userEvent.click(screen.getByRole("button", { name: /Apply/ }))

    await userEvent.click(screen.getByRole("button", { name: "Clear" }))

    expect(screen.getByText(/These results are from an earlier run/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Apply changes/ })).toBeDisabled()
  })

  it("ReopeningTheTemplateDialog_StartsFromACleanForm", async () => {
    renderBuilder()
    await pickSourceAndColumn()

    await userEvent.click(screen.getByRole("button", { name: /Save as template/ }))
    await userEvent.type(await screen.findByLabelText(/Template name/), "Half typed")
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
    await userEvent.click(screen.getByRole("button", { name: /Save as template/ }))

    expect(await screen.findByLabelText(/Template name/)).toHaveValue("")
  })

  it("ChosenModule_NamesTheEntityColumnAfterWhatThatModuleReportsOn", async () => {
    renderBuilderWithResults()
    await pickSourceAndColumn()
    await userEvent.click(screen.getByRole("button", { name: /Apply/ }))

    expect(await screen.findByRole("columnheader", { name: /Event/ })).toBeInTheDocument()
    expect(screen.queryByRole("columnheader", { name: /Entity/ })).not.toBeInTheDocument()
  })

  it("ModuleThisBuildDoesNotKnow_LeavesTheColumnReadingEntity", async () => {
    renderBuilder()

    await userEvent.click(screen.getByRole("button", { name: "pick module 2" }))
    await userEvent.click(screen.getByRole("button", { name: "pick entity" }))
    await userEvent.click(screen.getByRole("button", { name: "pick form" }))

    expect(screen.getByText(/Entity are always included\./)).toBeInTheDocument()
  })

  it("SaveAsTemplate_ListsEveryColumnSoOneLeftOutCanBeAddedWithoutClosingTheDialog", async () => {
    renderBuilder()
    await pickSourceAndColumn()

    await userEvent.click(screen.getByRole("button", { name: /Save as template/ }))

    const dialog = await screen.findByRole("dialog")

    expect(within(dialog).getByText("T-shirt size")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Column heading for Dietary needs")).toBeInTheDocument()
    expect(within(dialog).queryByLabelText("Column heading for T-shirt size")).not.toBeInTheDocument()
  })
})
