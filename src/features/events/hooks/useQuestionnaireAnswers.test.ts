import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { EventRegistrationForm, EventRegistrationQuestion } from "@/api/events"
import { useQuestionnaireAnswers } from "@/features/events/hooks/useQuestionnaireAnswers"
import type { QuestionnaireSource } from "@/features/events/utils/registrationFields"

const FIELD_KEY = "field-guid"
const QUESTION_KEY = "question-guid"

function createForm(fieldOverrides: Partial<EventRegistrationForm["fields"][number]> = {}): EventRegistrationForm {
  return {
    uniqueId: "form-guid",
    name: "Attendee details",
    headerText: null,
    description: null,
    displayOrder: 1,
    layoutColumn: 1,
    fields: [
      {
        uniqueId: FIELD_KEY,
        controlType: "text",
        controlLabel: "Shirt size",
        placeHolder: null,
        tooltip: null,
        isMandatory: false,
        requiredMessage: null,
        acceptedFileTypes: null,
        minLength: null,
        maxLength: null,
        defaultValue: null,
        layoutColumn: null,
        displayOrder: 1,
        hasOptions: false,
        options: [],
        ...fieldOverrides,
      },
    ],
  }
}

function createQuestion(overrides: Partial<EventRegistrationQuestion> = {}): EventRegistrationQuestion {
  return {
    uniqueId: QUESTION_KEY,
    controlId: 1,
    controlName: "dietary",
    controlType: "text",
    iconClass: "",
    label: "Dietary restrictions?",
    placeHolder: null,
    tooltip: null,
    required: false,
    requiredMessage: null,
    acceptedFileTypes: null,
    minLength: null,
    maxLength: null,
    defaultValue: null,
    isActive: true,
    displayOrder: 1,
    options: [],
    ...overrides,
  }
}

function renderAnswers(source: Partial<QuestionnaireSource>) {
  return renderHook(() =>
    useQuestionnaireAnswers({ customForms: [], customQuestions: [], ...source }),
  )
}

describe("useQuestionnaireAnswers", () => {
  it("Request_NothingAnswered_SendsNoResponsesAtAll", () => {
    const { result } = renderAnswers({ customForms: [createForm()], customQuestions: [createQuestion()] })

    expect(result.current.buildAnswersRequest()).toEqual({ formResponses: [], questionResponses: [] })
  })

  it("Request_FormFieldAnswered_SendsTheFieldUniqueIdAndValue", () => {
    const { result } = renderAnswers({ customForms: [createForm()] })

    act(() => result.current.setAnswer(FIELD_KEY, "XL"))

    expect(result.current.buildAnswersRequest().formResponses).toEqual([
      { fieldUniqueId: FIELD_KEY, value: "XL", fileStorageId: null },
    ])
  })

  it("Request_OptionBackedQuestion_SendsTheOptionIdRatherThanTheRawValue", () => {
    const { result } = renderAnswers({
      customQuestions: [
        createQuestion({ options: [{ uniqueId: "option-guid", displayText: "Vegan", value: "vegan", isDefault: false }] }),
      ],
    })

    act(() => result.current.setAnswer(QUESTION_KEY, "option-guid"))

    expect(result.current.buildAnswersRequest().questionResponses).toEqual([
      { questionUniqueId: QUESTION_KEY, optionUniqueId: "option-guid", value: null, fileStorageId: null },
    ])
  })

  it("Request_FreeTextQuestion_SendsTheValueAndNoOption", () => {
    const { result } = renderAnswers({ customQuestions: [createQuestion()] })

    act(() => result.current.setAnswer(QUESTION_KEY, "Vegetarian"))

    expect(result.current.buildAnswersRequest().questionResponses).toEqual([
      { questionUniqueId: QUESTION_KEY, optionUniqueId: null, value: "Vegetarian", fileStorageId: null },
    ])
  })

  it("Request_FileAnswer_SendsTheStoredFileIdWithNoValue", () => {
    const { result } = renderAnswers({ customForms: [createForm({ controlType: "file" })] })

    act(() => result.current.setFile(FIELD_KEY, { fileStorageId: 7, fileName: "badge.pdf" }))

    expect(result.current.buildAnswersRequest().formResponses).toEqual([
      { fieldUniqueId: FIELD_KEY, value: null, fileStorageId: 7 },
    ])
  })

  it("Validation_MandatoryFieldLeftBlank_CountsAsMissing", () => {
    const { result } = renderAnswers({ customForms: [createForm({ isMandatory: true })] })

    expect(result.current.missingRequiredCount).toBe(1)

    act(() => result.current.setAnswer(FIELD_KEY, "XL"))

    expect(result.current.missingRequiredCount).toBe(0)
  })

  it("Validation_MandatoryFileField_IsSatisfiedByAnUploadNotAValue", () => {
    const { result } = renderAnswers({ customForms: [createForm({ controlType: "file", isMandatory: true })] })

    act(() => result.current.setAnswer(FIELD_KEY, "badge.pdf"))
    expect(result.current.missingRequiredCount).toBe(1)

    act(() => result.current.setFile(FIELD_KEY, { fileStorageId: 7, fileName: "badge.pdf" }))
    expect(result.current.missingRequiredCount).toBe(0)
  })

  it("Validation_UncheckedRequiredCheckbox_CountsAsMissing", () => {
    const { result } = renderAnswers({
      customQuestions: [createQuestion({ controlType: "checkbox", required: true })],
    })

    act(() => result.current.setAnswer(QUESTION_KEY, "false"))
    expect(result.current.missingRequiredCount).toBe(1)

    act(() => result.current.setAnswer(QUESTION_KEY, "true"))
    expect(result.current.missingRequiredCount).toBe(0)
  })

  it("Validation_BeforeTheBuyerSubmits_ShowsNoComplaint", () => {
    const { result } = renderAnswers({ customForms: [createForm({ isMandatory: true })] })
    const descriptor = result.current.formSections[0].fields[0]

    expect(result.current.getErrorMessage(descriptor)).toBeNull()

    act(() => result.current.setShowValidation(true))

    expect(result.current.getErrorMessage(descriptor)).toBe("Shirt size is required.")
  })

  it("Validation_FieldWithACustomMessage_UsesTheOrganizersWording", () => {
    const { result } = renderAnswers({
      customForms: [createForm({ isMandatory: true, requiredMessage: "Pick a size so we can order your shirt." })],
    })

    act(() => result.current.setShowValidation(true))

    expect(result.current.getErrorMessage(result.current.formSections[0].fields[0])).toBe(
      "Pick a size so we can order your shirt.",
    )
  })

  it("Reset_AfterAnswering_ClearsValuesFilesAndValidation", () => {
    const { result } = renderAnswers({ customForms: [createForm()] })

    act(() => {
      result.current.setAnswer(FIELD_KEY, "XL")
      result.current.setFile(FIELD_KEY, { fileStorageId: 7, fileName: "badge.pdf" })
      result.current.setShowValidation(true)
    })

    act(() => result.current.resetAnswers())

    expect(result.current.getAnswer(FIELD_KEY)).toBe("")
    expect(result.current.getFile(FIELD_KEY)).toBeUndefined()
    expect(result.current.showValidation).toBe(false)
  })

  it("File_Cleared_DropsTheAttachmentFromTheRequest", () => {
    const { result } = renderAnswers({ customForms: [createForm({ controlType: "file" })] })

    act(() => result.current.setFile(FIELD_KEY, { fileStorageId: 7, fileName: "badge.pdf" }))
    act(() => result.current.setFile(FIELD_KEY, null))

    expect(result.current.buildAnswersRequest().formResponses).toEqual([])
  })

  it("Questionnaire_EventAsksNothing_ReportsItselfEmpty", () => {
    const { result } = renderAnswers({})

    expect(result.current.hasQuestionnaire).toBe(false)
  })
})
