import { Button, Image, Text, VStack } from "@chakra-ui/react"
import { ImageOff } from "lucide-react"

interface SeatingLayoutPreviewButtonProps {
  /** Layout name, used to say which layout the preview belongs to. */
  name: string
  /** Preview image Seats.io renders for the published chart, or null when there is nothing to show. */
  thumbnailUrl: string | null
  /** Opens the full preview. Not called while there is no preview to open. */
  onOpen: () => void
}

const PREVIEW_WIDTH = "132px"
const PREVIEW_HEIGHT = "84px"

/**
 * The seating layout's preview image in a list row, which opens the full chart when clicked.
 *
 * A chart the organizer has drawn but never published has no preview, and that is shown as a labelled placeholder
 * rather than a broken image or an empty cell: the reason it is missing is the thing the organizer needs to know.
 */
export function SeatingLayoutPreviewButton({ name, thumbnailUrl, onOpen }: SeatingLayoutPreviewButtonProps) {
  if (!thumbnailUrl) {
    return (
      <VStack
        gap={1}
        w={PREVIEW_WIDTH}
        h={PREVIEW_HEIGHT}
        justify="center"
        borderRadius="12px"
        border="1px dashed"
        borderColor="border.subtle"
        bg="app.bg"
        color="gray.500"
        cursor="not-allowed"
        title="Publish the layout in the designer to see a preview"
      >
        <ImageOff size={18} aria-hidden />
        <Text fontSize="xs" fontWeight="600" textAlign="center" px={2} lineHeight="1.3">
          Not published yet
        </Text>
      </VStack>
    )
  }

  return (
    <Button
      variant="plain"
      onClick={onOpen}
      aria-label={`Preview the ${name} seating layout`}
      w={PREVIEW_WIDTH}
      h={PREVIEW_HEIGHT}
      p={0}
      overflow="hidden"
      borderRadius="12px"
      border="1px solid"
      borderColor="border.subtle"
      bg="white"
      cursor="pointer"
      transition="border-color 0.15s, box-shadow 0.15s"
      _hover={{ borderColor: "purple.400", boxShadow: "0 6px 18px rgba(117, 81, 255, 0.18)" }}
      _focusVisible={{ outline: "2px solid", outlineColor: "purple.500", outlineOffset: "2px" }}
      _dark={{ bg: "navy.800" }}
    >
      <Image
        src={thumbnailUrl}
        alt={`Seating layout preview for ${name}`}
        w="100%"
        h="100%"
        objectFit="contain"
        loading="lazy"
      />
    </Button>
  )
}
