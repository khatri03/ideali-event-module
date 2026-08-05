import { Box, SimpleGrid, Stack, Text } from "@chakra-ui/react"
import { QuestionnaireStepSkeleton } from "@/features/events/components/registration/QuestionnaireStep.skeleton"
import { RegistrationField } from "@/features/events/components/registration/RegistrationField"
import type { UploadedAnswerFile } from "@/features/events/schemas/eventCart.schemas"
import type {
  RegistrationFieldDescriptor,
  RegistrationFormSection,
} from "@/features/events/utils/registrationFields"

interface QuestionnaireStepProps {
  formSections: RegistrationFormSection[]
  questions: RegistrationFieldDescriptor[]
  isLoading: boolean
  getAnswer: (key: string) => string
  getFile: (key: string) => UploadedAnswerFile | undefined
  getErrorMessage: (descriptor: RegistrationFieldDescriptor) => string | null
  onChangeAnswer: (key: string, value: string) => void
  onUploadFile: (descriptor: RegistrationFieldDescriptor, file: File) => Promise<UploadedAnswerFile>
  onClearFile: (key: string) => void
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.14em">
      {children}
    </Text>
  )
}

/** Renders the custom forms and questions the organizer attached to this event. */
export function QuestionnaireStep({
  formSections,
  questions,
  isLoading,
  getAnswer,
  getFile,
  getErrorMessage,
  onChangeAnswer,
  onUploadFile,
  onClearFile,
}: QuestionnaireStepProps) {
  const isEmpty = formSections.length === 0 && questions.length === 0

  if (isLoading && isEmpty) {
    return <QuestionnaireStepSkeleton />
  }

  if (isEmpty) {
    return (
      <Box borderWidth="1px" borderColor="gray.200" borderRadius="18px" bg="gray.50" p={4}>
        <Text fontSize="sm" color="gray.600">
          This event does not ask for any custom forms or questions.
        </Text>
      </Box>
    )
  }

  function renderField(descriptor: RegistrationFieldDescriptor) {
    return (
      <Box
        key={descriptor.key}
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="16px"
        bg="white"
        p={4}
        gridColumn={{ base: "span 1", lg: `span ${descriptor.layoutColumn}` }}
      >
        <RegistrationField
          descriptor={descriptor}
          value={getAnswer(descriptor.key)}
          file={getFile(descriptor.key)}
          errorMessage={getErrorMessage(descriptor)}
          onChange={(value) => onChangeAnswer(descriptor.key, value)}
          onUpload={(file) => onUploadFile(descriptor, file)}
          onClearFile={() => onClearFile(descriptor.key)}
        />
      </Box>
    )
  }

  return (
    <Stack gap={5}>
      {formSections.map((section) => (
        <Box key={section.uniqueId} borderWidth="1px" borderColor="gray.200" borderRadius="20px" p={{ base: 4, md: 5 }} bg="gray.50">
          <Stack gap={4}>
            <Box>
              <Text fontSize={{ base: "md", md: "lg" }} fontWeight="700" color="gray.900">
                {section.title}
              </Text>
              {section.description ? (
                <Text mt={1} fontSize="sm" color="gray.600" lineHeight="1.7">
                  {section.description}
                </Text>
              ) : null}
            </Box>

            <SimpleGrid columns={{ base: 1, lg: section.layoutColumn }} gap={4}>
              {section.fields.map(renderField)}
            </SimpleGrid>
          </Stack>
        </Box>
      ))}

      {questions.length > 0 ? (
        <Box borderWidth="1px" borderColor="gray.200" borderRadius="20px" p={{ base: 4, md: 5 }} bg="gray.50">
          <Stack gap={4}>
            <SectionLabel>Custom Questions</SectionLabel>
            <Stack gap={4}>{questions.map(renderField)}</Stack>
          </Stack>
        </Box>
      ) : null}
    </Stack>
  )
}
