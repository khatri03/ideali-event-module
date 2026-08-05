import { useCallback, useMemo, useState } from "react"
import type {
  SubmitOrderAnswersRequest,
  UploadedAnswerFile,
} from "@/features/events/schemas/eventCart.schemas"
import {
  buildFormSections,
  buildQuestionDescriptors,
  type QuestionnaireSource,
  type RegistrationFieldDescriptor,
} from "@/features/events/utils/registrationFields"

function isFileControl(descriptor: RegistrationFieldDescriptor) {
  return descriptor.controlType.trim().toLowerCase().replace(/[\s_-]/g, "") === "file"
}

function isAnswered(
  descriptor: RegistrationFieldDescriptor,
  value: string | undefined,
  file: UploadedAnswerFile | undefined,
) {
  if (isFileControl(descriptor)) {
    return file != null
  }

  const trimmed = (value ?? "").trim()

  if (descriptor.controlType.trim().toLowerCase() === "checkbox") {
    return trimmed === "true"
  }

  return trimmed.length > 0
}

/**
 * Answers to the event's custom forms and questions. They are authored on the event and stored
 * against the order, so a single flat map keyed by field/question id is the whole state - there is
 * no per-session dimension to key by.
 */
export function useQuestionnaireAnswers(event: QuestionnaireSource | undefined) {
  const [valuesByKey, setValuesByKey] = useState<Record<string, string>>({})
  const [filesByKey, setFilesByKey] = useState<Record<string, UploadedAnswerFile>>({})
  const [showValidation, setShowValidation] = useState(false)

  const formSections = useMemo(() => buildFormSections(event), [event])
  const questions = useMemo(() => buildQuestionDescriptors(event), [event])

  const descriptors = useMemo(
    () => [...formSections.flatMap((section) => section.fields), ...questions],
    [formSections, questions],
  )

  const setAnswer = useCallback((key: string, value: string) => {
    setValuesByKey((current) => ({ ...current, [key]: value }))
  }, [])

  const getAnswer = useCallback((key: string) => valuesByKey[key] ?? "", [valuesByKey])

  const setFile = useCallback((key: string, file: UploadedAnswerFile | null) => {
    setFilesByKey((current) => {
      if (file == null) {
        return Object.fromEntries(Object.entries(current).filter(([entryKey]) => entryKey !== key))
      }

      return { ...current, [key]: file }
    })
  }, [])

  const getFile = useCallback((key: string) => filesByKey[key], [filesByKey])

  const missingRequiredKeys = useMemo(
    () =>
      descriptors
        .filter(
          (descriptor) =>
            descriptor.isRequired && !isAnswered(descriptor, valuesByKey[descriptor.key], filesByKey[descriptor.key]),
        )
        .map((descriptor) => descriptor.key),
    [descriptors, filesByKey, valuesByKey],
  )

  const getErrorMessage = useCallback(
    (descriptor: RegistrationFieldDescriptor) => {
      if (!showValidation || !missingRequiredKeys.includes(descriptor.key)) return null

      return descriptor.requiredMessage?.trim() || `${descriptor.label} is required.`
    },
    [missingRequiredKeys, showValidation],
  )

  /**
   * Option-backed controls send the option identifier the API keyed them by; everything else sends
   * the raw value. Fields left empty are omitted so a blank answer clears the stored one.
   */
  const buildAnswersRequest = useCallback((): SubmitOrderAnswersRequest => {
    const formResponses = formSections
      .flatMap((section) => section.fields)
      .flatMap((field) => {
        const value = valuesByKey[field.key] ?? ""
        const file = filesByKey[field.key]
        if (!value.trim() && !file) return []

        return [
          {
            fieldUniqueId: field.key,
            value: value.trim() ? value : null,
            fileStorageId: file?.fileStorageId ?? null,
          },
        ]
      })

    const questionResponses = questions.flatMap((question) => {
      const value = valuesByKey[question.key] ?? ""
      const file = filesByKey[question.key]
      if (!value.trim() && !file) return []

      const usesOptions = question.options.length > 0

      return [
        {
          questionUniqueId: question.key,
          optionUniqueId: usesOptions && value.trim() ? value : null,
          value: !usesOptions && value.trim() ? value : null,
          fileStorageId: file?.fileStorageId ?? null,
        },
      ]
    })

    return { formResponses, questionResponses }
  }, [filesByKey, formSections, questions, valuesByKey])

  const resetAnswers = useCallback(() => {
    setValuesByKey({})
    setFilesByKey({})
    setShowValidation(false)
  }, [])

  return {
    formSections,
    questions,
    hasQuestionnaire: descriptors.length > 0,
    getAnswer,
    setAnswer,
    getFile,
    setFile,
    getErrorMessage,
    buildAnswersRequest,
    missingRequiredCount: missingRequiredKeys.length,
    showValidation,
    setShowValidation,
    resetAnswers,
  }
}
