import { Stack, Text } from "@chakra-ui/react"

export function EventThankYouEmailStepPage() {
  return (
    <Stack h="full" gap={4}>
      <Stack flex="1" gap={4}>
        <Text fontSize="sm" fontWeight="700" color="text.primary">
          Thank you Email
        </Text>
        <Text fontSize="sm" color="text.secondary">
          Draft the post-registration confirmation email and sender experience for attendees.
        </Text>
      </Stack>
    </Stack>
  )
}
