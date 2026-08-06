import { ChakraProvider } from "@chakra-ui/react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { system } from "@/theme"
import type { UploadedAnswerFile } from "@/features/events/schemas/eventCart.schemas"
import type { RegistrationFieldDescriptor } from "@/features/events/utils/registrationFields"
import { RegistrationField } from "./RegistrationField"

function createDescriptor(overrides: Partial<RegistrationFieldDescriptor> = {}): RegistrationFieldDescriptor {
  return {
    key: "field-guid",
    kind: "form",
    controlType: "text",
    label: "Shirt size",
    placeHolder: null,
    tooltip: null,
    isRequired: false,
    requiredMessage: null,
    acceptedFileTypes: null,
    minLength: null,
    maxLength: null,
    defaultValue: null,
    layoutColumn: 1,
    options: [],
    ...overrides,
  }
}

interface RenderOverrides {
  descriptor?: RegistrationFieldDescriptor
  value?: string
  file?: UploadedAnswerFile
  errorMessage?: string | null
  onChange?: (value: string) => void
  onUpload?: (file: File) => Promise<UploadedAnswerFile>
  onClearFile?: () => void
}

function renderField({
  descriptor = createDescriptor(),
  value = "",
  file,
  errorMessage = null,
  onChange = vi.fn(),
  onUpload = vi.fn(async () => ({ fileStorageId: 1, fileName: "badge.pdf" })),
  onClearFile = vi.fn(),
}: RenderOverrides = {}) {
  render(
    <ChakraProvider value={system}>
      <RegistrationField
        descriptor={descriptor}
        value={value}
        file={file}
        errorMessage={errorMessage}
        onChange={onChange}
        onUpload={onUpload}
        onClearFile={onClearFile}
      />
    </ChakraProvider>,
  )

  return { onChange, onUpload, onClearFile }
}

describe("RegistrationField", () => {
  it("Label_RequiredField_IsMarkedSoTheBuyerKnowsBeforeSubmitting", () => {
    renderField({ descriptor: createDescriptor({ isRequired: true }) })

    expect(screen.getByText("Shirt size")).toBeInTheDocument()
    expect(screen.getByText("*", { exact: false })).toBeInTheDocument()
  })

  it("Text_BuyerTypes_ReportsEveryKeystrokeToTheOwner", async () => {
    const { onChange } = renderField()

    await userEvent.type(screen.getByRole("textbox"), "XL")

    expect(onChange).toHaveBeenCalledWith("X")
    expect(onChange).toHaveBeenCalledWith("L")
  })

  it("Text_FieldWithAMaxLength_StopsTheBuyerAtTheOrganizersLimit", () => {
    renderField({ descriptor: createDescriptor({ maxLength: 3 }) })

    expect(screen.getByRole("textbox")).toHaveAttribute("maxlength", "3")
  })

  it("Options_FieldWithChoices_RendersASelectCarryingEachOptionValue", () => {
    renderField({
      descriptor: createDescriptor({
        options: [
          { value: "s", displayText: "Small" },
          { value: "l", displayText: "Large" },
        ],
      }),
    })

    expect(screen.getByRole("option", { name: "Small" })).toHaveValue("s")
    expect(screen.getByRole("option", { name: "Large" })).toHaveValue("l")
  })

  function createMultiSelectDescriptor() {
    return createDescriptor({
      controlType: "multiselect",
      options: [
        { value: "events", displayText: "Events" },
        { value: "training", displayText: "Training" },
      ],
    })
  }

  it("MultiSelect_SecondChoicePicked_KeepsTheFirstOneInTheAnswer", async () => {
    const { onChange } = renderField({ descriptor: createMultiSelectDescriptor(), value: "events" })

    await userEvent.click(screen.getByRole("checkbox", { name: "Training" }))

    expect(onChange).toHaveBeenCalledWith("events,training")
  })

  it("MultiSelect_ChoiceUnpicked_DropsOnlyThatChoice", async () => {
    const { onChange } = renderField({ descriptor: createMultiSelectDescriptor(), value: "events,training" })

    await userEvent.click(screen.getByRole("checkbox", { name: "Events" }))

    expect(onChange).toHaveBeenCalledWith("training")
  })

  it("MultiSelect_NothingPicked_ReportsAnEmptyAnswerSoRequiredStillBites", async () => {
    const { onChange } = renderField({ descriptor: createMultiSelectDescriptor(), value: "events" })

    await userEvent.click(screen.getByRole("checkbox", { name: "Events" }))

    expect(onChange).toHaveBeenCalledWith("")
  })

  it("Checkbox_Ticked_ReportsTheStringTrueBecauseAnswersAreStoredAsText", async () => {
    const { onChange } = renderField({ descriptor: createDescriptor({ controlType: "checkbox" }) })

    await userEvent.click(screen.getByRole("checkbox"))

    expect(onChange).toHaveBeenCalledWith("true")
  })

  it("Textarea_MultiLineControlType_RendersATextareaNotASingleLineInput", () => {
    renderField({ descriptor: createDescriptor({ controlType: "Multi Line Text" }) })

    expect(screen.getByRole("textbox").tagName).toBe("TEXTAREA")
  })

  it("UnknownControlType_FromTheOrganizersBuilder_FallsBackToATextInput", () => {
    renderField({ descriptor: createDescriptor({ controlType: "colour-picker" }) })

    expect(screen.getByRole("textbox")).toBeInTheDocument()
  })

  it("Error_ValidationFailed_ShowsTheMessageUnderTheControl", () => {
    renderField({ errorMessage: "Shirt size is required." })

    expect(screen.getByText("Shirt size is required.")).toBeInTheDocument()
  })

  it("File_AlreadyUploaded_ShowsTheNameAndOffersToRemoveIt", async () => {
    const { onClearFile } = renderField({
      descriptor: createDescriptor({ controlType: "file" }),
      file: { fileStorageId: 7, fileName: "badge.pdf" },
    })

    expect(screen.getByText("badge.pdf")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Remove badge.pdf" }))

    expect(onClearFile).toHaveBeenCalledOnce()
  })

  it("File_UploadRejected_ShowsWhyWithoutClearingTheField", async () => {
    renderField({
      descriptor: createDescriptor({ controlType: "file" }),
      onUpload: vi.fn(async () => {
        throw new Error("Only .pdf files are accepted here.")
      }),
    })

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, new File(["x"], "badge.png", { type: "image/png" }))

    expect(await screen.findByText("Only .pdf files are accepted here.")).toBeInTheDocument()
  })

  it("File_AcceptedTypesAsFreeText_AreNormalisedIntoTheAcceptAttribute", () => {
    renderField({ descriptor: createDescriptor({ controlType: "file", acceptedFileTypes: "pdf docx" }) })

    expect(document.querySelector('input[type="file"]')).toHaveAttribute("accept", ".pdf,.docx")
  })
})
