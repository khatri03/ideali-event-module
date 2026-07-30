import { useCallback, useMemo, useState } from "react"
import type { EventRegistrationQuestion, EventRegistrationSession } from "@/api/events"
import type { EventLineCustomQuestionResponse } from "@/features/events/schemas/eventCart.schemas"

/** Answer keys are scoped per session so the same question on two sessions stays independent. */
function buildAnswerKey(sessionUniqueId: string, questionUniqueId: string) {
  return `${sessionUniqueId}:${questionUniqueId}`
}

function isAnswered(question: EventRegistrationQuestion, value: string | undefined) {
  const trimmed = (value ?? "").trim()

  if (question.controlType.trim().toLowerCase() === "checkbox") {
    return trimmed === "true"
  }

  return trimmed.length > 0
}

function isOptionBackedQuestion(question: EventRegistrationQuestion) {
  return question.options.length > 0
}

export function useQuestionnaireAnswers(sessions: EventRegistrationSession[]) {
  const [answersByKey, setAnswersByKey] = useState<Record<string, string>>({})
  const [showValidation, setShowValidation] = useState(false)

  const setAnswer = useCallback((sessionUniqueId: string, questionUniqueId: string, value: string) => {
    setAnswersByKey((current) => ({
      ...current,
      [buildAnswerKey(sessionUniqueId, questionUniqueId)]: value,
    }))
  }, [])

  const getAnswer = useCallback(
    (sessionUniqueId: string, questionUniqueId: string) => answersByKey[buildAnswerKey(sessionUniqueId, questionUniqueId)] ?? "",
    [answersByKey],
  )

  /** Every unanswered required question, keyed the same way the inputs are. */
  const missingRequiredKeys = useMemo(() => {
    const missing: string[] = []

    sessions.forEach((session) => {
      session.customQuestions.forEach((question) => {
        if (!question.required || !question.isActive) {
          return
        }

        const key = buildAnswerKey(session.uniqueId, question.uniqueId)
        if (!isAnswered(question, answersByKey[key])) {
          missing.push(key)
        }
      })
    })

    return missing
  }, [answersByKey, sessions])

  const getErrorMessage = useCallback(
    (sessionUniqueId: string, question: EventRegistrationQuestion) => {
      if (!showValidation) return null

      const key = buildAnswerKey(sessionUniqueId, question.uniqueId)
      if (!missingRequiredKeys.includes(key)) return null

      return question.requiredMessage?.trim() || `${question.label} is required.`
    },
    [missingRequiredKeys, showValidation],
  )

  /**
   * Maps collected answers into the request shape. Questions backed by options send the chosen
   * option's id; free-text questions send the raw value.
   */
  const buildQuestionResponses = useCallback(
    (sessionUniqueId: string): EventLineCustomQuestionResponse[] => {
      const session = sessions.find((item) => item.uniqueId === sessionUniqueId)
      if (!session) return []

      return session.customQuestions.flatMap<EventLineCustomQuestionResponse>((question) => {
        const value = answersByKey[buildAnswerKey(sessionUniqueId, question.uniqueId)] ?? ""
        if (!value.trim()) return []

        if (isOptionBackedQuestion(question)) {
          return [{ questionUniqueId: question.uniqueId, optionUniqueId: value, value: null }]
        }

        return [{ questionUniqueId: question.uniqueId, optionUniqueId: null, value }]
      })
    },
    [answersByKey, sessions],
  )

  const resetAnswers = useCallback(() => {
    setAnswersByKey({})
    setShowValidation(false)
  }, [])

  return {
    getAnswer,
    setAnswer,
    getErrorMessage,
    buildQuestionResponses,
    missingRequiredCount: missingRequiredKeys.length,
    showValidation,
    setShowValidation,
    resetAnswers,
  }
}
