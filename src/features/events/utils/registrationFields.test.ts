import { describe, expect, it } from "vitest"
import type { EventRegistrationForm, EventRegistrationQuestion } from "@/api/events"
import {
  buildFormSections,
  buildQuestionDescriptors,
  toQuestionDescriptor,
  type QuestionnaireSource,
} from "@/features/events/utils/registrationFields"

function createForm(overrides: Partial<EventRegistrationForm> = {}): EventRegistrationForm {
  return {
    uniqueId: "form-1",
    name: "Attendee details",
    headerText: null,
    description: null,
    displayOrder: 1,
    layoutColumn: 1,
    fields: [],
    ...overrides,
  }
}

function createField(overrides: Partial<EventRegistrationForm["fields"][number]> = {}) {
  return {
    uniqueId: "field-1",
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
    ...overrides,
  }
}

function createQuestion(overrides: Partial<EventRegistrationQuestion> = {}): EventRegistrationQuestion {
  return {
    uniqueId: "question-1",
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

function createSource(overrides: Partial<QuestionnaireSource> = {}): QuestionnaireSource {
  return { customForms: [], customQuestions: [], ...overrides }
}

describe("registration field descriptors", () => {
  it("Sections_FormWithNoFields_IsDroppedBecauseItCannotBeAnswered", () => {
    const sections = buildFormSections(createSource({ customForms: [createForm()] }))

    expect(sections).toEqual([])
  })

  it("Sections_MultipleForms_FollowTheOrganizersDisplayOrder", () => {
    const sections = buildFormSections(
      createSource({
        customForms: [
          createForm({ uniqueId: "second", displayOrder: 2, fields: [createField({ uniqueId: "b" })] }),
          createForm({ uniqueId: "first", displayOrder: 1, fields: [createField({ uniqueId: "a" })] }),
        ],
      }),
    )

    expect(sections.map((section) => section.uniqueId)).toEqual(["first", "second"])
  })

  it("Sections_FormWithHeaderText_PrefersItOverTheLibraryFormName", () => {
    const sections = buildFormSections(
      createSource({
        customForms: [createForm({ headerText: "Tell us more", fields: [createField()] })],
      }),
    )

    expect(sections[0].title).toBe("Tell us more")
  })

  it("Fields_WithinAForm_FollowTheirDisplayOrder", () => {
    const sections = buildFormSections(
      createSource({
        customForms: [
          createForm({
            fields: [
              createField({ uniqueId: "late", displayOrder: 5 }),
              createField({ uniqueId: "early", displayOrder: 1 }),
            ],
          }),
        ],
      }),
    )

    expect(sections[0].fields.map((field) => field.key)).toEqual(["early", "late"])
  })

  it("Questions_Inactive_AreNotOfferedToTheBuyer", () => {
    const descriptors = buildQuestionDescriptors(
      createSource({ customQuestions: [createQuestion({ isActive: false })] }),
    )

    expect(descriptors).toEqual([])
  })

  it("Questions_WithOptions_CarryTheOptionUniqueIdAsTheValueToPost", () => {
    const descriptor = toQuestionDescriptor(
      createQuestion({
        options: [{ uniqueId: "option-guid", displayText: "Vegan", value: "vegan", isDefault: false }],
      }),
    )

    expect(descriptor.options).toEqual([{ value: "option-guid", displayText: "Vegan" }])
  })

  it("Questions_LengthLimitsAsFreeText_AreParsedToNumbersOrIgnored", () => {
    const parsed = toQuestionDescriptor(createQuestion({ minLength: "2", maxLength: "not a number" }))

    expect(parsed.minLength).toBe(2)
    expect(parsed.maxLength).toBeNull()
  })

  it("Sections_FormAuthoredInTwoColumns_KeepTheOrganizersColumnCount", () => {
    const sections = buildFormSections(
      createSource({ customForms: [createForm({ layoutColumn: 2, fields: [createField()] })] }),
    )

    expect(sections[0].layoutColumn).toBe(2)
  })

  it("Sections_FormLayoutColumnMissing_FallsBackToASingleColumn", () => {
    const sections = buildFormSections(
      createSource({ customForms: [createForm({ layoutColumn: null, fields: [createField()] })] }),
    )

    expect(sections[0].layoutColumn).toBe(1)
  })

  it("Fields_SpanningWiderThanTheirForm_AreCappedAtTheFormsColumnCount", () => {
    const sections = buildFormSections(
      createSource({
        customForms: [createForm({ layoutColumn: 2, fields: [createField({ layoutColumn: 4 })] })],
      }),
    )

    expect(sections[0].fields[0].layoutColumn).toBe(2)
  })

  it("Fields_WithoutALayoutColumn_OccupyOneColumn", () => {
    const sections = buildFormSections(
      createSource({
        customForms: [createForm({ layoutColumn: 3, fields: [createField({ layoutColumn: null })] })],
      }),
    )

    expect(sections[0].fields[0].layoutColumn).toBe(1)
  })

  it("Options_SavedWithoutAValue_AnswerUnderTheirDisplayText", () => {
    const sections = buildFormSections(
      createSource({
        customForms: [
          createForm({
            fields: [
              createField({
                options: [{ value: "  ", displayText: "Workshops", isDefault: false }],
              }),
            ],
          }),
        ],
      }),
    )

    // An option keyed by "" reads back as unanswered, so a required field could never be satisfied.
    expect(sections[0].fields[0].options).toEqual([{ value: "Workshops", displayText: "Workshops" }])
  })

  it("Options_WithNeitherValueNorDisplayText_AreNotOffered", () => {
    const sections = buildFormSections(
      createSource({
        customForms: [
          createForm({
            fields: [createField({ options: [{ value: "", displayText: "  ", isDefault: false }] })],
          }),
        ],
      }),
    )

    expect(sections[0].fields[0].options).toEqual([])
  })

  it("Questions_HaveNoAuthoredLayout_SoTheyAlwaysOccupyOneColumn", () => {
    const descriptor = toQuestionDescriptor(createQuestion())

    expect(descriptor.layoutColumn).toBe(1)
  })

  it("Descriptors_NoEventLoadedYet_ProduceNothingRatherThanThrowing", () => {
    expect(buildFormSections(undefined)).toEqual([])
    expect(buildQuestionDescriptors(undefined)).toEqual([])
  })
})
