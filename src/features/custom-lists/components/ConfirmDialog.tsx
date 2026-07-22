import type { ReactNode } from "react"
import { Box, Button, CloseButton, Dialog, Flex, Text } from "@chakra-ui/react"
import { AlertTriangle } from "lucide-react"

interface ConfirmDialogProps {
  title: string
  description: ReactNode
  confirmLabel: string
  loadingLabel?: string
  errorMessage?: string | null
  isPending: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  loadingLabel = "Working...",
  errorMessage,
  isPending,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root
      open
      role="alertdialog"
      onOpenChange={(details) => (details.open ? null : onClose())}
      size="md"
    >
      <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
      <Dialog.Positioner p={4}>
        <Dialog.Content
          bg="white"
          borderRadius="24px"
          w="full"
          maxW="520px"
          h="auto"
          maxH="calc(100dvh - 2rem)"
          alignSelf="center"
          mx="auto"
          overflow="hidden"
        >
          <Box px={6} pt={6} pb={4}>
            <Flex align="flex-start" justify="space-between" gap={4}>
              <Flex align="center" gap={3}>
                <Flex
                  w="44px"
                  h="44px"
                  borderRadius="14px"
                  bg="red.50"
                  color="red.600"
                  align="center"
                  justify="center"
                  flexShrink={0}
                >
                  <AlertTriangle size={20} />
                </Flex>
                <Dialog.Title fontSize="lg" fontWeight="800" color="gray.900">
                  {title}
                </Dialog.Title>
              </Flex>

              <Dialog.CloseTrigger asChild>
                <CloseButton aria-label="Close confirmation" cursor="pointer" />
              </Dialog.CloseTrigger>
            </Flex>
          </Box>

          <Dialog.Body px={6} pb={6}>
            <Box fontSize="sm" color="gray.700">
              {description}
            </Box>

            {errorMessage ? (
              <Box mt={4} p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
                <Text fontSize="sm" fontWeight="700" color="red.700">
                  {errorMessage}
                </Text>
              </Box>
            ) : null}

            <Flex pt={6} justify="flex-end" gap={3} flexWrap="wrap" direction={{ base: "column-reverse", md: "row" }}>
              <Button
                variant="outline"
                colorPalette="gray"
                borderRadius="14px"
                h="44px"
                px={6}
                minW={{ base: "full", md: "120px" }}
                cursor="pointer"
                onClick={onClose}
              >
                Cancel
              </Button>

              <Button
                colorPalette="red"
                borderRadius="14px"
                h="44px"
                px={6}
                minW={{ base: "full", md: "150px" }}
                cursor={isPending ? "not-allowed" : "pointer"}
                disabled={isPending}
                loading={isPending}
                loadingText={loadingLabel}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </Flex>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
