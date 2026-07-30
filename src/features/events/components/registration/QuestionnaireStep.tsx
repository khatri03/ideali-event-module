import { Box, SimpleGrid, Stack, Text } from "@chakra-ui/react"
import type { EventRegistrationQuestion } from "@/api/events"
import { QuestionField } from "@/features/events/components/registration/QuestionField"
import { QuestionnaireStepSkeleton } from "@/features/events/components/registration/QuestionnaireStep.skeleton"
import type { SelectedSessionSummary } from "@/features/events/components/registration/types"

interface QuestionnaireStepProps {
  sessionSummaries: SelectedSessionSummary[]
  isLoading: boolean
  getAnswer: (sessionUniqueId: string, questionUniqueId: string) => string
  getErrorMessage: (sessionUniqueId: string, question: EventRegistrationQuestion) => string | null
  onChangeAnswer: (sessionUniqueId: string, questionUniqueId: string, value: string) => void
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.14em">
      {children}
    </Text>
  )
}

/** Renders the custom forms and questions attached to whichever sessions the buyer selected. */
export function QuestionnaireStep({
  sessionSummaries,
  isLoading,
  getAnswer,
  getErrorMessage,
  onChangeAnswer,
}: QuestionnaireStepProps) {
  const sessionsWithQuestions = sessionSummaries.filter((summary) => summary.hasQuestions)

  if (isLoading && sessionsWithQuestions.length === 0) {
    return <QuestionnaireStepSkeleton />
  }

  if (sessionsWithQuestions.length === 0) {
    return (
      <Box borderWidth="1px" borderColor="gray.200" borderRadius="18px" bg="gray.50" p={4}>
        <Text fontSize="sm" color="gray.600">
          No selected session currently requires custom forms or questions.
        </Text>
      </Box>
    )
  }

  return (
    <Stack gap={5}>
      {sessionsWithQuestions.map(({ session }) => (
        <Box key={session.uniqueId} borderWidth="1px" borderColor="gray.200" borderRadius="20px" p={5} bg="gray.50">
          <Stack gap={4}>
            <Box>
              <Text fontSize={{ base: "md", md: "lg" }} fontWeight="700" color="gray.900">
                {session.name}
              </Text>
              <Text fontSize="sm" color="gray.600">
                Questionnaire content mapped to this selected session.
              </Text>
            </Box>

            {session.customForms.length > 0 ? (
              <Stack gap={3}>
                <SectionLabel>Custom Forms</SectionLabel>
                <SimpleGrid columns={{ base: 1, lg: 2 }} gap={3}>
                  {session.customForms.map((form) => (
                    <Box key={form.uniqueId} borderWidth="1px" borderColor="gray.200" borderRadius="16px" bg="white" p={4}>
                      <Text fontWeight="700" color="gray.900">
                        {form.headerText ?? form.name}
                      </Text>
                      {form.description ? (
                        <Text mt={2} fontSize="sm" color="gray.600" lineHeight="1.7">
                          {form.description}
                        </Text>
                      ) : null}
                    </Box>
                  ))}
                </SimpleGrid>
              </Stack>
            ) : null}

            {session.customQuestions.length > 0 ? (
              <Stack gap={3}>
                <SectionLabel>Custom Questions</SectionLabel>
                <Stack gap={4}>
                  {session.customQuestions
                    .filter((question) => question.isActive)
                    .map((question) => (
                      <Box
                        key={question.uniqueId}
                        borderWidth="1px"
                        borderColor="gray.200"
                        borderRadius="16px"
                        bg="white"
                        p={4}
                      >
                        <QuestionField
                          question={question}
                          value={getAnswer(session.uniqueId, question.uniqueId)}
                          errorMessage={getErrorMessage(session.uniqueId, question)}
                          onChange={(value) => onChangeAnswer(session.uniqueId, question.uniqueId, value)}
                        />
                      </Box>
                    ))}
                </Stack>
              </Stack>
            ) : null}
          </Stack>
        </Box>
      ))}
    </Stack>
  )
}
