import { useState } from "react"
import { Box, Button, CloseButton, Dialog, Field, Flex, Input, Portal, Stack, Text } from "@chakra-ui/react"
import type { EventInvoiceFilters } from "@/api/eventInvoices"
import { DEFAULT_PAGE_SIZE, ErrorState, TablePagination } from "@/components/common"
import { useDebounce } from "@/hooks/useDebounce"
import { useModalGuardRelease } from "@/hooks/useModalGuardRelease"
import { extractApiError } from "@/utils/errors"
import { useEventInvoices, useLinkEventInvoice } from "../hooks/useEventInvoices"
import { LinkInvoicePickerTable } from "./LinkInvoicePickerTable"

interface LinkInvoiceDialogProps {
  open: boolean
  invoiceUniqueId: string
  onClose: () => void
}

interface LinkInvoicePickerProps {
  invoiceUniqueId: string
  onClose: () => void
}

const UNFILTERED: Omit<EventInvoiceFilters, "searchTerm"> = {
  eventUniqueIds: [],
  sessionUniqueIds: [],
  statuses: [],
  paymentMethods: [],
  invoiceTypes: [],
  overdueOnly: false,
  invoiceDateFrom: null,
  invoiceDateTo: null,
}

function LinkInvoicePicker({ invoiceUniqueId, onClose }: LinkInvoicePickerProps) {
  const [searchInput, setSearchInput] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [selectedInvoiceUniqueId, setSelectedInvoiceUniqueId] = useState<string | null>(null)
  const searchTerm = useDebounce(searchInput, 300)
  const invoicesQuery = useEventInvoices({ ...UNFILTERED, searchTerm }, page, pageSize, "invoiceDateUtc", "desc")
  const linkMutation = useLinkEventInvoice(invoiceUniqueId)

  // The list endpoint is shared with the main screen, so the invoice being linked is dropped here rather than
  // offered as a target the server would refuse.
  const candidates = (invoicesQuery.data?.items ?? []).filter((invoice) => invoice.invoiceUniqueId !== invoiceUniqueId)
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
        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
            Search invoices
          </Field.Label>
          <Input
            value={searchInput}
            minH="11"
            borderRadius="12px"
            placeholder="Search by invoice no, buyer name or email"
            onChange={(event) => {
              setSearchInput(event.target.value)
              setPage(1)
            }}
          />
        </Field.Root>

        {invoicesQuery.isError ? (
          <ErrorState
            title="Could not load invoices"
            message={extractApiError(invoicesQuery.error)}
            isRetrying={invoicesQuery.isFetching}
            onRetry={() => void invoicesQuery.refetch()}
          />
        ) : (
          <Box border="1px solid" borderColor="border.subtle" borderRadius="16px" overflow="hidden">
            <LinkInvoicePickerTable
              invoices={candidates}
              isFetching={invoicesQuery.isFetching}
              selectedInvoiceUniqueId={selectedInvoiceUniqueId}
              emptyMessage={searchTerm.trim() ? "No invoices match. Try a different search." : "There are no other invoices to link to yet."}
              onSelect={setSelectedInvoiceUniqueId}
            />
            {invoicesQuery.data ? (
              <TablePagination
                page={page}
                pageSize={pageSize}
                totalPages={invoicesQuery.data.totalPages}
                total={invoicesQuery.data.total}
                itemLabel="invoice"
                size="sm"
                onPageChange={setPage}
                onPageSizeChange={(nextPageSize) => {
                  setPageSize(nextPageSize)
                  setPage(1)
                }}
              />
            ) : null}
          </Box>
        )}

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

/** Picks an existing invoice to link to, searched and paged by the server through the shipped list endpoint. */
export function LinkInvoiceDialog({ open, invoiceUniqueId, onClose }: LinkInvoiceDialogProps) {
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
            <LinkInvoicePicker invoiceUniqueId={invoiceUniqueId} onClose={onClose} />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
