import { Stack, Text } from "@chakra-ui/react"

export function EventQuestionsStepPage() {
  return (
    <Stack h="full" gap={4}>
      <Stack flex="1" gap={4}>
        <Text fontSize="sm" fontWeight="700" color="text.primary">
          Questions
        </Text>
        <Text fontSize="sm" color="text.secondary">
          Configure attendee questions or registration prompts for this event in a future iteration.
        </Text>
      </Stack>
    </Stack>
  )
}
