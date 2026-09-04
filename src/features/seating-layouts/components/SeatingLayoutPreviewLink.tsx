import { Box, Image, Link, Text, Tooltip, VStack } from "@chakra-ui/react"
import { ExternalLink, ImageOff } from "lucide-react"

/** How much room the preview is given: a row-sized thumbnail, or the large view a preview panel affords. */
export type SeatingLayoutPreviewSize = "thumbnail" | "panel"

interface SeatingLayoutPreviewLinkProps {
  /** Layout name, used to say which layout the preview belongs to. */
  name: string
  /** Preview image Seats.io renders for the published chart, or null when there is nothing to show. */
  thumbnailUrl: string | null
  /** Public Seats.io page for the chart, or null when the layout has never reached Seats.io. */
  previewUrl: string | null
  /** Room the preview gets. Defaults to the row-sized thumbnail the layout list uses. */
  size?: SeatingLayoutPreviewSize
}

const SIZES = {
  thumbnail: { w: "132px", h: "84px" },
  panel: { w: "full", h: { base: "220px", md: "300px", lg: "340px" } },
} as const

const OPEN_PREVIEW_HINT = "Opens the full layout on Seats.io in a new tab"

/** The placeholder a layout with no published picture shows, in place of an empty cell or a broken image. */
function MissingPreview({ size }: { size: SeatingLayoutPreviewSize }) {
  return (
    <VStack
      gap={1}
      w={SIZES[size].w}
      h={SIZES[size].h}
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

/**
 * The seating layout's preview image, linking to the layout on Seats.io.
 *
 * Seats.io serves a public page per chart but refuses to be framed, and its embeddable renderer draws an event
 * rather than a chart, so a new tab is the only way to show the layout interactively. The tooltip says that before
 * the click rather than letting a tab appear unannounced.
 */
export function SeatingLayoutPreviewLink({
  name,
  thumbnailUrl,
  previewUrl,
  size = "thumbnail",
}: SeatingLayoutPreviewLinkProps) {
  if (!thumbnailUrl || !previewUrl) {
    return <MissingPreview size={size} />
  }

  return (
    <Tooltip.Root openDelay={250} closeDelay={100}>
      <Tooltip.Trigger asChild>
        <Link
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open the ${name} seating layout on Seats.io in a new tab`}
          display="block"
          position="relative"
          w={SIZES[size].w}
          h={SIZES[size].h}
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
          <Box
            position="absolute"
            top="1"
            right="1"
            p="1"
            borderRadius="8px"
            bg="blackAlpha.600"
            color="white"
            lineHeight="0"
            aria-hidden
          >
            <ExternalLink size={12} />
          </Box>
        </Link>
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content>{OPEN_PREVIEW_HINT}</Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  )
}
