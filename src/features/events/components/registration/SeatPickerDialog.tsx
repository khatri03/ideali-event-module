import type { ReactNode } from "react"
import { Box, Button, Dialog, Flex, Stack, Text } from "@chakra-ui/react"
import { CONTROL_BUTTON_PRIMARY } from "@/components/common/controlStyles"
import { hexToRgba } from "@/features/events/utils/registrationFormat"

interface SeatPickerDialogProps {
  isOpen: boolean
  /** Called with the state the dialog is asking to move to. */
  onOpenChange: (isOpen: boolean) => void
  /** Session the seats are being picked for, so the buyer can tell which one they opened. */
  sessionName: string
  /** The organizer's form colour, matching the rule the other registration dialogs wear. */
  accentColor: string
  children: ReactNode
}

/**
 * Full-screen shell the seat map is drawn in.
 *
 * It is full width at every breakpoint rather than a centred panel, because a seating chart squeezed into a
 * dialog-sized box is the cramped inline map it replaces. The body is mounted only while the dialog is open and
 * torn down on close, so the vendor renderer costs nothing on a form where most sessions are never opened.
 *
 * A phone gets the whole screen, because a chart in anything smaller is unreadable. Above that the panel is capped
 * rather than full-bleed: the seating plan needs room, not the entire desktop, and a dialog that covers a 1920px
 * screen edge to edge reads as a page the buyer has navigated to rather than a step they can back out of.
 *
 * The panel is sized against the viewport rather than to its children: the chart measures the box it is handed, and
 * a box still growing to fit it has no height to report.
 */
export function SeatPickerDialog({ isOpen, onOpenChange, sessionName, accentColor, children }: SeatPickerDialogProps) {
  return (
    <Dialog.Root
      open={isOpen}
      size="cover"
      lazyMount
      unmountOnExit
      // A stray click on the backdrop must not throw away a map the buyer is midway through picking on. The only
      // way out is the Close button below, so leaving is always a choice the buyer made rather than a slip.
      closeOnInteractOutside={false}
      onOpenChange={(details) => onOpenChange(details.open)}
    >
      <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.650" />
      <Dialog.Positioner p={{ base: 0, md: 6, xl: 8 }}>
        <Dialog.Content
          bg="white"
          borderRadius={{ base: "0", md: "24px" }}
          w="full"
          maxW={{ base: "full", md: "56rem", xl: "68rem" }}
          h={{ base: "full", md: "auto" }}
          maxH="full"
          overflow="hidden"
          display="flex"
          flexDirection="column"
        >
          <Box h="5px" bg={accentColor} flexShrink={0} />
          <Box
            px={{ base: 4, md: 6 }}
            py={4}
            borderBottomWidth="1px"
            borderBottomColor="gray.200"
            flexShrink={0}
          >
            <Stack gap={1} minW={0}>
              <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.14em" color="gray.500" fontWeight="700">
                Pick your seats
              </Text>
              <Dialog.Title fontSize={{ base: "md", md: "xl" }} fontWeight="800" color="gray.900" truncate>
                {sessionName}
              </Dialog.Title>
            </Stack>
          </Box>

          <Dialog.Body px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} flex="1" overflowY="auto">
            {children}
          </Dialog.Body>

          <Box
            px={{ base: 4, md: 6 }}
            py={4}
            borderTopWidth="1px"
            borderTopColor="gray.200"
            bg="gray.50"
            flexShrink={0}
          >
            <Flex justify="flex-end">
              <Button
                {...CONTROL_BUTTON_PRIMARY}
                bg={accentColor}
                minH="11"
                px={5}
                w={{ base: "full", sm: "auto" }}
                cursor="pointer"
                _hover={{ bg: hexToRgba(accentColor, 0.88) }}
                _active={{ bg: hexToRgba(accentColor, 0.95) }}
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </Flex>
          </Box>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
