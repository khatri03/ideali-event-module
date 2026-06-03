import { Badge, Box, Stack, Text } from "@chakra-ui/react"
import { useSessionWizardNavigation } from "../hooks/useSessionWizard"

export function SessionWizardStepPage() {
  const { activeStep } = useSessionWizardNavigation()

  return (
    <Stack gap={4}>
      <Box>
        <Badge borderRadius="999px" px={3} py={1} colorPalette="blue" variant="subtle">
          {activeStep?.label ?? "Session step"}
        </Badge>
      </Box>
      <Text fontSize="lg" fontWeight="800" color="gray.900">
        {activeStep?.label ?? "Session step"}
      </Text>
      <Text fontSize="sm" color="gray.600">
        This step is scaffolded. We can wire the actual fields and API save contract next.
      </Text>
    </Stack>
  )
}
