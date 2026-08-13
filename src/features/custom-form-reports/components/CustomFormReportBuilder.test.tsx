import { ChakraProvider } from "@chakra-ui/react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { system } from "@/theme"
import { CustomFormReportBuilder } from "./CustomFormReportBuilder"

const hooks = vi.hoisted(() => ({ useCustomFormReport: vi.fn() }))

/** Stands in for the four cascading selects, whose Ark popover is not what these tests are about. */
vi.mock("./ReportSourcePicker", () => ({
  ReportSourcePicker: ({
    moduleId,
    entityUniqueId,
    formUniqueId,
    onModuleChange,
    onEntityChange,
    onFormChange,
  }: {
    moduleId: number | null
    entityUniqueId: string | null
    formUniqueId: string | null
    onModuleChange: (moduleId: number) => void
    onEntityChange: (entityUniqueId: string) => void
    onFormChange: (formUniqueId: string) => void
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
    </div>
  ),
}))

vi.mock("../hooks/useCustomFormReportTemplateMutations", () => ({
  useCreateReportTemplate: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }),
  useUpdateReportTemplate: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }),
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
  useReportTemplate: () => ({ data: undefined }),
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

async function pickSourceAndColumn() {
  await userEvent.click(screen.getByRole("button", { name: "pick module 1" }))
  await userEvent.click(screen.getByRole("button", { name: "pick entity" }))
  await userEvent.click(screen.getByRole("button", { name: "pick form" }))
  await userEvent.click(screen.getByText("Dietary needs"))
}

describe("CustomFormReportBuilder", () => {
  beforeEach(() => {
    hooks.useCustomFormReport.mockReset().mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    })
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

  it("SaveAsTemplate_OpensTheDialogWithOnlyTheSelectedColumns", async () => {
    renderBuilder()
    await pickSourceAndColumn()

    await userEvent.click(screen.getByRole("button", { name: /Save as template/ }))

    const dialog = await screen.findByRole("dialog")

    expect(within(dialog).getByText("Dietary needs")).toBeInTheDocument()
    expect(within(dialog).queryByText("T-shirt size")).not.toBeInTheDocument()
  })
})
