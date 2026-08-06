import type { EventRegistrationForm, EventRegistrationQuestion } from "@/api/events"
import { clampFormColumns, getFieldColumnSpan } from "@/features/events/utils/customFormLayout"

/** Everything the questionnaire needs from an event, whichever endpoint delivered it. */
export interface QuestionnaireSource {
  customForms: EventRegistrationForm[]
  customQuestions: EventRegistrationQuestion[]
}

export interface RegistrationFieldOption {
  /** Already the value the API expects back, so callers never re-derive it. */
  value: string
  displayText: string
}

export interface RegistrationFieldDescriptor {
  key: string
  kind: "form" | "question"
  controlType: string
  label: string
  placeHolder: string | null
  tooltip: string | null
  isRequired: boolean
  requiredMessage: string | null
  acceptedFileTypes: string | null
  minLength: number | null
  maxLength: number | null
  defaultValue: string | null
  /** Columns of its section this field spans. Custom questions have no layout, so they get 1. */
  layoutColumn: number
  options: RegistrationFieldOption[]
}

export interface RegistrationFormSection {
  uniqueId: string
  title: string
  description: string | null
  /** Column count the organizer authored, already clamped to what the grid supports. */
  layoutColumn: number
  fields: RegistrationFieldDescriptor[]
}

/**
 * Custom form fields and custom questions are authored through different screens but render and
 * post identically, so the questionnaire step works from one descriptor rather than two branches.
 */
export function toFormFieldDescriptors(form: EventRegistrationForm): RegistrationFieldDescriptor[] {
  const formColumns = clampFormColumns(form.layoutColumn)

  return [...form.fields]
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((field) => ({
      key: field.uniqueId,
      kind: "form" as const,
      controlType: field.controlType,
      label: field.controlLabel,
      placeHolder: field.placeHolder,
      tooltip: field.tooltip,
      isRequired: field.isMandatory,
      requiredMessage: field.requiredMessage,
      acceptedFileTypes: field.acceptedFileTypes,
      minLength: field.minLength,
      maxLength: field.maxLength,
      defaultValue: field.defaultValue,
      layoutColumn: getFieldColumnSpan(field.layoutColumn, formColumns),
      options: toFieldOptions(field.options),
    }))
}

export function toQuestionDescriptor(question: EventRegistrationQuestion): RegistrationFieldDescriptor {
  return {
    key: question.uniqueId,
    kind: "question",
    controlType: question.controlType,
    label: question.label,
    placeHolder: question.placeHolder,
    tooltip: question.tooltip,
    isRequired: question.required,
    requiredMessage: question.requiredMessage,
    acceptedFileTypes: question.acceptedFileTypes,
    minLength: toOptionalNumber(question.minLength),
    maxLength: toOptionalNumber(question.maxLength),
    defaultValue: question.defaultValue,
    layoutColumn: 1,
    // The API keys a question answer by the option's uniqueId, not its display value.
    options: question.options.map((option) => ({ value: option.uniqueId, displayText: option.displayText })),
  }
}

export function buildFormSections(event: QuestionnaireSource | undefined): RegistrationFormSection[] {
  if (!event) return []

  return [...event.customForms]
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((form) => ({
      uniqueId: form.uniqueId,
      title: form.headerText?.trim() || form.name,
      description: form.description,
      layoutColumn: clampFormColumns(form.layoutColumn),
      fields: toFormFieldDescriptors(form),
    }))
    .filter((section) => section.fields.length > 0)
}

export function buildQuestionDescriptors(event: QuestionnaireSource | undefined): RegistrationFieldDescriptor[] {
  if (!event) return []

  return [...event.customQuestions]
    .filter((question) => question.isActive)
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map(toQuestionDescriptor)
}

/**
 * The organizer's builder keeps an option that has display text but no value, and an answer keyed by
 * an empty string reads back as unanswered. Fall back to the display text so the choice survives.
 */
function toFieldOptions(options: EventRegistrationForm["fields"][number]["options"]): RegistrationFieldOption[] {
  return options.flatMap((option) => {
    const value = option.value.trim() || option.displayText.trim()
    if (!value) return []

    return [{ value, displayText: option.displayText.trim() || value }]
  })
}

/** Question min/max arrive as free text from the organizer's builder; a non-number means no limit. */
function toOptionalNumber(value: string | null): number | null {
  if (value == null || value.trim() === "") return null

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
