import { Box, Stack, Text } from "@chakra-ui/react"
import { SeatingLayoutPreviewLink } from "@/features/seating-layouts"
import { useSessionWizardPreview } from "../hooks/useSessionWizardPreview"

/** What the panel shows on a step that has nothing to picture, so the column is never a blank rectangle. */
function EmptyPreview() {
  return (
    <Box
      w="full"
      minH={{ base: "220px", md: "300px" }}
      borderRadius="24px"
      border="1px dashed"
      borderColor="gray.200"
      bg="gray.50"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={6}
      py={8}
    >
      <Stack gap={2} align="center" textAlign="center" maxW="280px">
        <Text fontSize={{ base: "sm", md: "md" }} fontWeight="700" color="gray.700">
          Nothing to preview yet
        </Text>
        <Text fontSize="sm" color="gray.500">
          Steps that picture their answer, such as the seating layout, show it here.
        </Text>
      </Stack>
    </Box>
  )
}

/**
 * The wizard's preview column. It draws whatever the current step published, at the size the column affords, so an
 * answer an organizer can only verify by eye is verifiable without leaving the wizard.
 */
export function SessionWizardPreviewPanel() {
  const { preview } = useSessionWizardPreview()

  if (!preview) {
    return <EmptyPreview />
  }

  return (
    <Stack gap={2} w="full" minW={0}>
      <SeatingLayoutPreviewLink
        name={preview.name}
        thumbnailUrl={preview.thumbnailUrl}
        previewUrl={preview.previewUrl}
        size="panel"
      />
      <Text fontSize="sm" color="gray.600" textAlign="center">
        {preview.name}, as it is published on Seats.io.
      </Text>
    </Stack>
  )
}
