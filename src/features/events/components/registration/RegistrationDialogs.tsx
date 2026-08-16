import type { ReactNode } from "react"
import { Box, Button, CloseButton, Dialog, Flex, HStack, Heading, Stack, Text } from "@chakra-ui/react"
import { AlertCircle, Clock3, ShieldAlert, Trash2 } from "lucide-react"
import { CONTROL_BUTTON_OUTLINE } from "@/components/common/controlStyles"
import { RichTextBlock } from "@/features/events/components/registration/SupportCard"
import { hexToRgba } from "@/features/events/utils/registrationFormat"
import { isHtmlContent } from "@/features/events/utils/ticketSelection"

interface ContentDialogProps {
  isOpen: boolean
  onClose: () => void
  eyebrow: string
  title: string
  body: string | null
}

/** Scrollable read-only dialog used for terms and session descriptions. */
export function ContentDialog({ isOpen, onClose, eyebrow, title, body }: ContentDialogProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => (details.open ? undefined : onClose())} size={{ base: "full", md: "xl" }}>
      <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.600" />
      <Dialog.Positioner
        alignItems="center"
        justifyContent="center"
        px={{ base: 4, md: 6 }}
        py={{ base: 6, md: 8 }}
      >
        <Dialog.Content
          borderRadius="28px"
          overflow="hidden"
          bg="white"
          boxShadow="0 30px 70px rgba(15, 23, 42, 0.25)"
          maxH="80dvh"
          display="flex"
          flexDirection="column"
        >
          <Box px={{ base: 4, md: 6 }} py={4} borderBottomWidth="1px" borderBottomColor="gray.200">
            <Flex justify="space-between" align="start" gap={4}>
              <Stack gap={1}>
                <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.14em" color="gray.500" fontWeight="700">
                  {eyebrow}
                </Text>
                <Heading fontSize={{ base: "xl", md: "2xl" }} color="gray.900" letterSpacing="-0.03em">
                  {title}
                </Heading>
              </Stack>
              <CloseButton onClick={onClose} cursor="pointer" />
            </Flex>
          </Box>
          <Box px={{ base: 4, md: 6 }} py={{ base: 5, md: 6 }} flex="1" overflowY="auto">
            {body ? (
              isHtmlContent(body) ? (
                <RichTextBlock html={body} />
              ) : (
                <Text color="gray.700" lineHeight="1.75">
                  {body}
                </Text>
              )
            ) : null}
          </Box>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

interface NoticeDialogProps {
  isOpen: boolean
  onDismiss: () => void
  icon: ReactNode
  accentColor: string
  iconBackground: string
  title: string
  message: ReactNode
  actionLabel: string
}

/** Single-action notice, used for the missing-buyer warning and the expired purchase window. */
export function NoticeDialog({
  isOpen,
  onDismiss,
  icon,
  accentColor,
  iconBackground,
  title,
  message,
  actionLabel,
}: NoticeDialogProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => (details.open ? undefined : onDismiss())} size={{ base: "xs", md: "sm" }}>
      <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.700" />
      <Dialog.Positioner
        alignItems="center"
        justifyContent="center"
        px={{ base: 4, md: 6 }}
        py={{ base: 6, md: 8 }}
      >
        <Dialog.Content
          borderRadius="28px"
          overflow="hidden"
          bg="white"
          boxShadow="0 30px 80px rgba(15, 23, 42, 0.28)"
        >
          <Box h="5px" bg={accentColor} />
          <Box px={{ base: 4, md: 5 }} py={{ base: 5, md: 6 }}>
            <Stack gap={5} align="center" textAlign="center">
              <Box
                w="72px"
                h="72px"
                borderRadius="24px"
                display="grid"
                placeItems="center"
                bg={iconBackground}
                color={accentColor}
              >
                {icon}
              </Box>
              <Stack gap={2} maxW="2xl">
                <Heading fontSize={{ base: "xl", md: "3xl" }} letterSpacing="-0.04em">
                  {title}
                </Heading>
                <Text color="gray.600" lineHeight="1.7">
                  {message}
                </Text>
              </Stack>
              <Button
                minH="12"
                px={6}
                borderRadius="16px"
                color="white"
                bg={accentColor}
                cursor="pointer"
                w={{ base: "full", md: "auto" }}
                _hover={{ bg: hexToRgba(accentColor, 0.9) }}
                _active={{ bg: hexToRgba(accentColor, 0.82) }}
                onClick={onDismiss}
              >
                {actionLabel}
              </Button>
            </Stack>
          </Box>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

export function BuyerDetailsMissingDialog({
  isOpen,
  message,
  onDismiss,
}: {
  isOpen: boolean
  message: string | null
  onDismiss: () => void
}) {
  return (
    <NoticeDialog
      isOpen={isOpen}
      onDismiss={onDismiss}
      icon={<AlertCircle size={30} />}
      accentColor="var(--chakra-colors-orange-500)"
      iconBackground="orange.50"
      title="Buyer details missing"
      message={message}
      actionLabel="Ok"
    />
  )
}

export function PurchaseExpiredDialog({
  isOpen,
  accentColor,
  onRestart,
}: {
  isOpen: boolean
  accentColor: string
  onRestart: () => void
}) {
  return (
    <NoticeDialog
      isOpen={isOpen}
      onDismiss={onRestart}
      icon={<Clock3 size={30} />}
      accentColor={accentColor}
      iconBackground={hexToRgba(accentColor, 0.12)}
      title="Purchase time expired"
      message="The purchase window has ended. Press OK to reload the registration form and start again."
      actionLabel="OK"
    />
  )
}

/**
 * Shown when the server stops recognising the cart - a dropped, expired or mismatched capability. It is
 * terminal by design: there is nothing to retry, so the only action offered is starting over.
 */
export function SessionUnavailableDialog({
  isOpen,
  accentColor,
  onRestart,
}: {
  isOpen: boolean
  accentColor: string
  onRestart: () => void
}) {
  return (
    <NoticeDialog
      isOpen={isOpen}
      onDismiss={onRestart}
      icon={<ShieldAlert size={30} />}
      accentColor={accentColor}
      iconBackground={hexToRgba(accentColor, 0.12)}
      title="Registration session ended"
      message="This registration session is no longer available. Press OK to reload the form and start again."
      actionLabel="OK"
    />
  )
}

export function ConfirmRemoveDialog({
  isOpen,
  title,
  description,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean
  title: string | undefined
  description: string | undefined
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => (details.open ? undefined : onCancel())} size={{ base: "xs", md: "sm" }}>
      <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.600" />
      <Dialog.Positioner
        alignItems="center"
        justifyContent="center"
        px={{ base: 4, md: 6 }}
        py={{ base: 6, md: 8 }}
      >
        <Dialog.Content
          borderRadius="24px"
          overflow="hidden"
          bg="white"
          boxShadow="0 30px 70px rgba(15, 23, 42, 0.25)"
        >
          <Box px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }}>
            <Stack gap={5}>
              <HStack gap={3} align="start">
                <Flex
                  w="12"
                  h="12"
                  borderRadius="16px"
                  align="center"
                  justify="center"
                  bg="red.50"
                  color="red.500"
                  flexShrink={0}
                >
                  <Trash2 size={18} />
                </Flex>
                <Stack gap={1}>
                  <Heading fontSize={{ base: "lg", md: "xl" }} color="gray.900" letterSpacing="-0.03em">
                    {title}
                  </Heading>
                  <Text fontSize="sm" color="gray.600" lineHeight="1.7">
                    {description}
                  </Text>
                </Stack>
              </HStack>

              <Flex justify="flex-end" gap={3} direction={{ base: "column-reverse", sm: "row" }}>
                <Button {...CONTROL_BUTTON_OUTLINE} cursor="pointer" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  bg="red.500"
                  color="white"
                  borderRadius="16px"
                  minH="11"
                  px={5}
                  cursor="pointer"
                  _hover={{ bg: "red.600" }}
                  _active={{ bg: "red.700" }}
                  onClick={onConfirm}
                >
                  Remove
                </Button>
              </Flex>
            </Stack>
          </Box>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
