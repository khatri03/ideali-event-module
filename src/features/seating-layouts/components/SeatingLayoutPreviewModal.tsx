import { useState } from "react"
import { Box, CloseButton, Dialog, Flex, Image, Skeleton, Stack, Text } from "@chakra-ui/react"

interface SeatingLayoutPreviewModalProps {
  /** Layout being previewed, or null when the modal is closed. */
  layout: { name: string; thumbnailUrl: string | null } | null
  /** Closes the modal. */
  onClose: () => void
}

function PreviewMessage({ title, detail }: { title: string; detail: string }) {
  return (
    <Stack gap={1} align="center" justify="center" h="full" px={6} textAlign="center">
      <Text fontSize="sm" fontWeight="700" color="text.primary">
        {title}
      </Text>
      <Text fontSize="sm" color="gray.600">
        {detail}
      </Text>
    </Stack>
  )
}

/**
 * Shows a seating layout the way Seats.io draws it, so the organizer can tell layouts apart without opening the
 * editor and risking a change to one.
 *
 * The picture is the public image Seats.io publishes for the chart. Seats.io has no public embed for a chart on its
 * own — its renderer draws an event, and its designer draws a chart only against the workspace secret key — so
 * showing that image is what keeps a look at a layout from carrying either an editor or a secret onto this screen.
 */
export function SeatingLayoutPreviewModal({ layout, onClose }: SeatingLayoutPreviewModalProps) {
  const thumbnailUrl = layout?.thumbnailUrl ?? null
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasFailed, setHasFailed] = useState(false)

  // The modal stays mounted between openings, so a different layout has to clear what the previous one left behind:
  // otherwise the next preview inherits the last one's failure, or skips its own loading state.
  const [previousThumbnailUrl, setPreviousThumbnailUrl] = useState(thumbnailUrl)
  if (thumbnailUrl !== previousThumbnailUrl) {
    setPreviousThumbnailUrl(thumbnailUrl)
    setIsLoaded(false)
    setHasFailed(false)
  }

  return (
    <Dialog.Root open={layout !== null} onOpenChange={(details) => (details.open ? undefined : onClose())} size="xl">
      <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
      <Dialog.Positioner>
        <Dialog.Content
          bg="white"
          borderRadius={{ base: 0, md: "24px" }}
          maxW={{ base: "100vw", md: "1000px" }}
          maxH={{ base: "100dvh", md: "90vh" }}
          m={{ base: 0, md: "auto" }}
          overflow="hidden"
          display="flex"
          flexDirection="column"
          _dark={{ bg: "navy.800" }}
        >
          <Box px={6} pt={6} pb={4} borderBottom="1px solid" borderColor="border.subtle">
            <Flex align="flex-start" justify="space-between" gap={4}>
              <Box minW={0}>
                <Text fontSize="lg" fontWeight="800" color="text.primary" truncate>
                  {layout?.name ?? "Seating layout"}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  A read-only view of the published layout. Nothing here changes the chart.
                </Text>
              </Box>

              <Dialog.CloseTrigger asChild>
                <CloseButton
                  aria-label="Close the seating layout preview"
                  w="44px"
                  h="44px"
                  minW="44px"
                  minH="44px"
                />
              </Dialog.CloseTrigger>
            </Flex>
          </Box>

          <Dialog.Body px={{ base: 3, md: 6 }} py={{ base: 3, md: 6 }} overflow="hidden">
            <Box h={{ base: "60vh", md: "600px" }} w="full" position="relative" bg="app.bg" borderRadius="16px">
              {!thumbnailUrl ? (
                <PreviewMessage
                  title="Nothing to preview yet"
                  detail="Seats.io only pictures a published layout. Open it in the designer and publish it first."
                />
              ) : hasFailed ? (
                <PreviewMessage
                  title="The preview could not be loaded"
                  detail="Seats.io did not return the layout picture. Try again in a moment."
                />
              ) : (
                <>
                  {!isLoaded ? <Skeleton h="full" w="full" borderRadius="16px" position="absolute" inset={0} /> : null}
                  <Image
                    src={thumbnailUrl}
                    alt={`Seating layout preview for ${layout?.name ?? "this layout"}`}
                    w="full"
                    h="full"
                    objectFit="contain"
                    borderRadius="16px"
                    onLoad={() => setIsLoaded(true)}
                    onError={() => setHasFailed(true)}
                  />
                </>
              )}
            </Box>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
