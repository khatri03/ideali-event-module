import { Box, Button, CloseButton, Dialog, Flex, Heading, Stack, Text } from "@chakra-ui/react"

interface OrderNextStepDialogProps {
  isOpen: boolean
  eventName: string
  /** True once the browser has refused to close the tab, so the buyer is told to do it themselves. */
  hasCloseFailed: boolean
  onBuyAgain: () => void
  onCloseTab: () => void
  /** Runs when the dialog is dismissed without a choice - escape, backdrop or the close button. */
  onDismiss: () => void
}

/**
 * The one decision left after a registration settles: buy again, or be done. Dismissing it is not a
 * third answer - the owner reloads the page so nobody is left on a screen whose cart is spent.
 */
export function OrderNextStepDialog({
  isOpen,
  eventName,
  hasCloseFailed,
  onBuyAgain,
  onCloseTab,
  onDismiss,
}: OrderNextStepDialogProps) {
  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(details) => {
        if (!details.open) onDismiss()
      }}
      size="md"
      role="alertdialog"
    >
      <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.650" />
      <Dialog.Positioner alignItems="center" justifyContent="center" minH="100dvh" px={4} py={4}>
        <Dialog.Content
          data-testid="order-next-step-dialog-content"
          borderRadius="24px"
          bg="white"
          overflow="hidden"
          w="full"
          maxW="md"
          maxH="calc(100dvh - 32px)"
        >
          <Box px={{ base: 4, md: 6 }} py={4} borderBottomWidth="1px" borderBottomColor="gray.200">
            <Flex justify="space-between" align="start" gap={4}>
              <Stack gap={1} minW={0}>
                <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.14em" color="gray.500" fontWeight="700">
                  Registration complete
                </Text>
                <Heading fontSize={{ base: "lg", md: "xl" }} color="gray.900" letterSpacing="-0.02em" lineHeight="1.3">
                  {eventName}
                </Heading>
              </Stack>
              <CloseButton cursor="pointer" onClick={onDismiss} />
            </Flex>
          </Box>

          <Stack gap={3} px={{ base: 4, md: 6 }} py={{ base: 5, md: 6 }}>
            <Text fontSize="sm" color="gray.700" lineHeight="1.6">
              Would you like to make another purchase? Starting again opens a fresh registration for this event.
            </Text>

            {hasCloseFailed ? (
              <Box borderWidth="1px" borderColor="orange.200" bg="orange.50" borderRadius="16px" px={4} py={3} role="alert">
                <Text fontSize="sm" color="orange.800" lineHeight="1.6">
                  Your browser would not close this tab. Close it yourself when you are ready - your tickets are
                  already emailed to you and this page keeps working.
                </Text>
              </Box>
            ) : null}
          </Stack>

          <Box px={{ base: 4, md: 6 }} py={4} borderTopWidth="1px" borderTopColor="gray.200" bg="gray.50">
            <Flex justify="flex-end" gap={3} direction={{ base: "column-reverse", sm: "row" }}>
              <Button
                variant="outline"
                borderColor="gray.300"
                fontWeight="700"
                minH="11"
                cursor="pointer"
                w={{ base: "full", sm: "auto" }}
                onClick={onCloseTab}
              >
                Close this tab
              </Button>
              <Button
                colorPalette="blue"
                fontWeight="700"
                minH="11"
                px={5}
                cursor="pointer"
                w={{ base: "full", sm: "auto" }}
                onClick={onBuyAgain}
              >
                Buy more tickets
              </Button>
            </Flex>
          </Box>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
