import { ChakraProvider } from "@chakra-ui/react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { system } from "@/theme"
import { SaveReportTemplateDialog } from "./SaveReportTemplateDialog"
import type { ReportField } from "@/api/customFormReports"

const mutations = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock("../hooks/useCustomFormReportTemplateMutations", () => ({
  useCreateReportTemplate: () => ({
    mutateAsync: mutations.create,
    isPending: false,
    isError: false,
    error: null,
  }),
  useUpdateReportTemplate: () => ({
    mutateAsync: mutations.update,
    isPending: false,
    isError: false,
    error: null,
  }),
}))

const FIELDS: ReportField[] = [
  { uniqueId: "field-1", label: "Dietary needs", controlType: "Text", displayOrder: 1, columnLabel: null },
  {
    uniqueId: "field-2",
    label: "I agree to receive membership updates",
    controlType: "Dropdown",
    displayOrder: 2,
    columnLabel: null,
  },
]

function nameInput() {
  return screen.getByLabelText(/Template name/)
}

function renderDialog(overrides: Partial<Parameters<typeof SaveReportTemplateDialog>[0]> = {}) {
  const onSaved = vi.fn()
  const onClose = vi.fn()

  render(
    <ChakraProvider value={system}>
      <SaveReportTemplateDialog
        open
        editSessionKey={1}
        moduleId={1}
        formUniqueId="form-1"
        fields={FIELDS}
        initialName=""
        initialFieldIds={["field-1", "field-2"]}
        initialColumnHeadings={{}}
        maxColumns={15}
        onSaved={onSaved}
        onClose={onClose}
        {...overrides}
      />
    </ChakraProvider>,
  )

  return { onSaved, onClose }
}

describe("SaveReportTemplateDialog", () => {
  beforeEach(() => {
    mutations.create.mockReset().mockResolvedValue("template-1")
    mutations.update.mockReset().mockResolvedValue("template-1")
  })

  it("Closed_ShowsNothingWhileStayingMountedForTheNextOpen", () => {
    renderDialog({ open: false })

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("MissingName_BlocksTheSaveAndSaysWhatIsMissing", async () => {
    renderDialog()

    await userEvent.click(screen.getByRole("button", { name: "Save template" }))

    expect(await screen.findByText("Enter a template name.")).toBeInTheDocument()
    expect(mutations.create).not.toHaveBeenCalled()
  })

  it("EveryColumnUnchecked_BlocksTheSave", async () => {
    renderDialog()

    await userEvent.type(nameInput(), "Dietary")
    await userEvent.click(screen.getByText("Dietary needs"))
    await userEvent.click(screen.getByText(FIELDS[1].label))
    await userEvent.click(screen.getByRole("button", { name: "Save template" }))

    expect(await screen.findByText("Keep at least one column in the template.")).toBeInTheDocument()
    expect(mutations.create).not.toHaveBeenCalled()
  })

  it("UncheckedColumn_IsLeftOutOfTheSavedTemplate", async () => {
    const { onSaved, onClose } = renderDialog()

    await userEvent.type(nameInput(), "Dietary only")
    await userEvent.click(screen.getByText(FIELDS[1].label))
    await userEvent.click(screen.getByRole("button", { name: "Save template" }))

    await waitFor(() =>
      expect(mutations.create).toHaveBeenCalledWith({
        name: "Dietary only",
        moduleId: 1,
        formUniqueId: "form-1",
        columns: [{ fieldUniqueId: "field-1", columnLabel: null }],
      }),
    )
    expect(onSaved).toHaveBeenCalledWith("template-1")
    expect(onClose).toHaveBeenCalled()
  })

  it("ExistingTemplate_IsUpdatedInPlaceRatherThanSavedAsANewOne", async () => {
    renderDialog({ templateUniqueId: "template-9", initialName: "Dietary" })

    expect(nameInput()).toHaveValue("Dietary")

    await userEvent.click(screen.getByRole("button", { name: "Update template" }))

    await waitFor(() =>
      expect(mutations.update).toHaveBeenCalledWith({
        templateUniqueId: "template-9",
        request: {
          name: "Dietary",
          moduleId: 1,
          formUniqueId: "form-1",
          columns: [
            { fieldUniqueId: "field-1", columnLabel: null },
            { fieldUniqueId: "field-2", columnLabel: null },
          ],
        },
      }),
    )
    expect(mutations.create).not.toHaveBeenCalled()
  })

  it("ColumnHeading_IsSavedAgainstThatColumnAlone", async () => {
    renderDialog()

    await userEvent.type(nameInput(), "Membership consent")
    await userEvent.type(screen.getByLabelText(`Column heading for ${FIELDS[1].label}`), "Updates opt-in")
    await userEvent.click(screen.getByRole("button", { name: "Save template" }))

    await waitFor(() =>
      expect(mutations.create).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: [
            { fieldUniqueId: "field-1", columnLabel: null },
            { fieldUniqueId: "field-2", columnLabel: "Updates opt-in" },
          ],
        }),
      ),
    )
  })

  it("BlankColumnHeading_LeavesTheColumnNamedAfterItsField", async () => {
    renderDialog()

    await userEvent.type(nameInput(), "Membership consent")
    await userEvent.type(screen.getByLabelText(`Column heading for ${FIELDS[1].label}`), "   ")
    await userEvent.click(screen.getByRole("button", { name: "Save template" }))

    await waitFor(() =>
      expect(mutations.create).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: [
            { fieldUniqueId: "field-1", columnLabel: null },
            { fieldUniqueId: "field-2", columnLabel: null },
          ],
        }),
      ),
    )
  })

  it("SavedHeading_IsShownWhenTheTemplateIsReopened", () => {
    renderDialog({ templateUniqueId: "template-9", initialColumnHeadings: { "field-2": "Updates opt-in" } })

    expect(screen.getByLabelText(`Column heading for ${FIELDS[1].label}`)).toHaveValue("Updates opt-in")
    expect(screen.getByLabelText("Column heading for Dietary needs")).toHaveValue("")
  })

  it("ColumnNeverChecked_DoesNotBlockTheSaveWithAnErrorNobodyCanSee", async () => {
    renderDialog({ initialFieldIds: ["field-1"] })

    await userEvent.type(nameInput(), "Dietary only")
    await userEvent.click(screen.getByRole("button", { name: "Save template" }))

    await waitFor(() =>
      expect(mutations.create).toHaveBeenCalledWith(
        expect.objectContaining({ columns: [{ fieldUniqueId: "field-1", columnLabel: null }] }),
      ),
    )
  })

  it("ColumnLeftOutOfTheReport_CanStillBeAddedToTheTemplate", async () => {
    renderDialog({ initialFieldIds: ["field-1"] })

    await userEvent.type(nameInput(), "Dietary and consent")
    await userEvent.click(screen.getByText(FIELDS[1].label))
    await userEvent.click(screen.getByRole("button", { name: "Save template" }))

    await waitFor(() =>
      expect(mutations.create).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: [
            { fieldUniqueId: "field-1", columnLabel: null },
            { fieldUniqueId: "field-2", columnLabel: null },
          ],
        }),
      ),
    )
  })

  it("UncheckedColumn_OffersNoHeadingToFillIn", async () => {
    renderDialog()

    await userEvent.click(screen.getByText("Dietary needs"))

    expect(screen.queryByLabelText("Column heading for Dietary needs")).not.toBeInTheDocument()
  })
})
