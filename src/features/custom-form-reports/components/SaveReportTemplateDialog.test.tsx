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
  { uniqueId: "field-1", label: "Dietary needs", controlType: "Text", displayOrder: 1 },
  { uniqueId: "field-2", label: "T-shirt size", controlType: "Dropdown", displayOrder: 2 },
]

function renderDialog(overrides: Partial<Parameters<typeof SaveReportTemplateDialog>[0]> = {}) {
  const onSaved = vi.fn()
  const onClose = vi.fn()

  render(
    <ChakraProvider value={system}>
      <SaveReportTemplateDialog
        moduleId={1}
        formUniqueId="form-1"
        fields={FIELDS}
        initialName=""
        initialFieldIds={["field-1", "field-2"]}
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

  it("MissingName_BlocksTheSaveAndSaysWhatIsMissing", async () => {
    renderDialog()

    await userEvent.click(screen.getByRole("button", { name: "Save template" }))

    expect(await screen.findByText("Enter a template name.")).toBeInTheDocument()
    expect(mutations.create).not.toHaveBeenCalled()
  })

  it("EveryColumnUnchecked_BlocksTheSave", async () => {
    renderDialog()

    await userEvent.type(screen.getByRole("textbox"), "Dietary")
    await userEvent.click(screen.getByText("Dietary needs"))
    await userEvent.click(screen.getByText("T-shirt size"))
    await userEvent.click(screen.getByRole("button", { name: "Save template" }))

    expect(await screen.findByText("Keep at least one column in the template.")).toBeInTheDocument()
    expect(mutations.create).not.toHaveBeenCalled()
  })

  it("UncheckedColumn_IsLeftOutOfTheSavedTemplate", async () => {
    const { onSaved, onClose } = renderDialog()

    await userEvent.type(screen.getByRole("textbox"), "Dietary only")
    await userEvent.click(screen.getByText("T-shirt size"))
    await userEvent.click(screen.getByRole("button", { name: "Save template" }))

    await waitFor(() =>
      expect(mutations.create).toHaveBeenCalledWith({
        name: "Dietary only",
        moduleId: 1,
        formUniqueId: "form-1",
        fieldUniqueIds: ["field-1"],
      }),
    )
    expect(onSaved).toHaveBeenCalledWith("template-1")
    expect(onClose).toHaveBeenCalled()
  })

  it("ExistingTemplate_IsUpdatedInPlaceRatherThanSavedAsANewOne", async () => {
    renderDialog({ templateUniqueId: "template-9", initialName: "Dietary" })

    expect(screen.getByRole("textbox")).toHaveValue("Dietary")

    await userEvent.click(screen.getByRole("button", { name: "Update template" }))

    await waitFor(() =>
      expect(mutations.update).toHaveBeenCalledWith({
        templateUniqueId: "template-9",
        request: {
          name: "Dietary",
          moduleId: 1,
          formUniqueId: "form-1",
          fieldUniqueIds: ["field-1", "field-2"],
        },
      }),
    )
    expect(mutations.create).not.toHaveBeenCalled()
  })
})
