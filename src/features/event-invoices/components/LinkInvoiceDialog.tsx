import { useState } from "react"
import { Box, Button, CloseButton, Dialog, Flex, Portal, Stack, Text } from "@chakra-ui/react"
import type { CustomInvoiceModule } from "@/api/customInvoices"
import { useModalGuardRelease } from "@/hooks/useModalGuardRelease"
import { extractApiError } from "@/utils/errors"
import { useLinkCustomInvoice } from "../hooks/useCustomInvoices"
import { LinkInvoicePicker } from "./LinkInvoicePicker"

interface LinkInvoiceDialogProps {
  open: boolean
  invoiceUniqueId: string
  /** The invoice's own module; only invoices of the same module can be linked. */
  moduleType: CustomInvoiceModule
  onClose: () => void
}

interface LinkInvoiceDialogBodyProps {
  invoiceUniqueId: string
  moduleType: CustomInvoiceModule
  onClose: () => void
}

function LinkInvoiceDialogBody({ invoiceUniqueId, moduleType, onClose }: LinkInvoiceDialogBodyProps) {
  const [selectedInvoiceUniqueId, setSelectedInvoiceUniqueId] = useState<string | null>(null)
  const linkMutation = useLinkCustomInvoice(invoiceUniqueId)
  const canConfirm = Boolean(selectedInvoiceUniqueId) && !linkMutation.isPending

  const handleLink = async () => {
    if (!selectedInvoiceUniqueId) return
    try {
      await linkMutation.mutateAsync(selectedInvoiceUniqueId)
      onClose()
    } catch {
      // Stays open with the selection kept, so the organizer can read the reason and retry or pick again.
    }
  }

  return (
    <Dialog.Body px={{ base: 5, md: 6 }} py={5}>
      <Stack gap={4}>
        <LinkInvoicePicker
          moduleType={moduleType}
          excludeInvoiceUniqueId={invoiceUniqueId}
          selectedInvoiceUniqueId={selectedInvoiceUniqueId}
          onSelect={(invoice) => setSelectedInvoiceUniqueId(invoice.invoiceUniqueId)}
        />

        {linkMutation.error ? (
          <Box role="alert" p={4} borderRadius="16px" bg="status.error.bg">
            <Text fontSize="sm" fontWeight="700" color="status.error.fg">
              {extractApiError(linkMutation.error)}
            </Text>
          </Box>
        ) : null}

        <Flex justify="flex-end" gap={3} direction={{ base: "column-reverse", md: "row" }}>
          <Button variant="outline" borderRadius="14px" minH="11" px={6} w={{ base: "full", md: "auto" }} cursor="pointer" onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorPalette="brand"
            color="white"
            bg="brand.gradient"
            borderRadius="14px"
            minH="11"
            px={6}
            w={{ base: "full", md: "auto" }}
            disabled={!canConfirm}
            loading={linkMutation.isPending}
            loadingText="Linking..."
            cursor={canConfirm ? "pointer" : "not-allowed"}
            onClick={handleLink}
          >
            Link invoice
          </Button>
        </Flex>
      </Stack>
    </Dialog.Body>
  )
}

/** Picks an invoice of the same module to link to, searched and paged by the server. */
export function LinkInvoiceDialog({ open, invoiceUniqueId, moduleType, onClose }: LinkInvoiceDialogProps) {
  useModalGuardRelease(open)

  return (
    <Dialog.Root
      open={open}
      lazyMount
      unmountOnExit
      onOpenChange={(details) => (details.open ? null : onClose())}
      size={{ base: "full", md: "lg" }}
    >
      <Portal>
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner p={{ base: 0, md: 4 }}>
          <Dialog.Content
            bg="card.bg"
            borderRadius={{ base: 0, md: "24px" }}
            w="full"
            maxW={{ base: "full", md: "760px" }}
            minH={{ base: "100dvh", md: "auto" }}
            maxH={{ base: "100dvh", md: "calc(100dvh - 2rem)" }}
            alignSelf="center"
            mx="auto"
            overflowY="auto"
          >
            <Box px={{ base: 5, md: 6 }} pt={6} pb={4} borderBottom="1px solid" borderColor="border.subtle">
              <Flex align="flex-start" justify="space-between" gap={4}>
                <Dialog.Title fontSize="lg" fontWeight="800" color="text.primary">
                  Link to an existing invoice
                </Dialog.Title>
                <Dialog.CloseTrigger asChild>
                  <CloseButton size="lg" aria-label="Close link invoice" cursor="pointer" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>
            <LinkInvoiceDialogBody invoiceUniqueId={invoiceUniqueId} moduleType={moduleType} onClose={onClose} />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
