import { useEffect } from "react"
import { Badge, Stack, Text } from "@chakra-ui/react"
import { useSessionWizardActions } from "../hooks/useSessionWizardActions"

export function SessionBannerStep() {
  const { setPrimaryAction } = useSessionWizardActions()

  useEffect(() => {
    setPrimaryAction(async () => {})

    return () => setPrimaryAction(null)
  }, [setPrimaryAction])

  return (
    <Stack gap={4}>
      <Badge borderRadius="999px" px={3} py={1} colorPalette="green" variant="subtle" alignSelf="flex-start">
        Banner
      </Badge>

      <Text fontSize="lg" fontWeight="800" color="gray.900">
        Banner
      </Text>

      <Text fontSize="sm" color="gray.600">
        This step is scaffolded for now. We&apos;ll define the banner workflow next.
      </Text>
    </Stack>
  )
}
