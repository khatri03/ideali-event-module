import { useState } from "react"
import { Box, Field, Input, Stack } from "@chakra-ui/react"
import type { CustomInvoiceLinkCandidate, CustomInvoiceModule } from "@/api/customInvoices"
import { DEFAULT_PAGE_SIZE, ErrorState, TablePagination } from "@/components/common"
import { useDebounce } from "@/hooks/useDebounce"
import { extractApiError } from "@/utils/errors"
import { useCustomInvoiceLinkCandidates } from "../hooks/useCustomInvoiceAuthoringOptions"
import { LinkInvoicePickerTable } from "./LinkInvoicePickerTable"

interface LinkInvoicePickerProps {
  moduleType: CustomInvoiceModule
  /** The invoice being linked from; the server leaves it out of the list. Absent on a new invoice. */
  excludeInvoiceUniqueId?: string
  selectedInvoiceUniqueId: string | null
  onSelect: (invoice: CustomInvoiceLinkCandidate) => void
}

/**
 * Searches and pages, on the server, the organizer's invoices of one module that may be linked to. Shared by
 * the editor's link switch and the detail page's Link invoice dialog so both offer exactly the same choices.
 */
export function LinkInvoicePicker({ moduleType, excludeInvoiceUniqueId, selectedInvoiceUniqueId, onSelect }: LinkInvoicePickerProps) {
  const [searchInput, setSearchInput] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const searchTerm = useDebounce(searchInput, 300)
  const candidatesQuery = useCustomInvoiceLinkCandidates({ moduleType, searchTerm, pageNo: page, pageSize, excludeInvoiceUniqueId })

  return (
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

      {candidatesQuery.isError ? (
        <ErrorState
          title="Could not load invoices"
          message={extractApiError(candidatesQuery.error)}
          isRetrying={candidatesQuery.isFetching}
          onRetry={() => void candidatesQuery.refetch()}
        />
      ) : (
        <Box border="1px solid" borderColor="border.subtle" borderRadius="16px" overflow="hidden">
          <LinkInvoicePickerTable
            invoices={candidatesQuery.data?.items ?? []}
            isFetching={candidatesQuery.isFetching}
            selectedInvoiceUniqueId={selectedInvoiceUniqueId}
            emptyMessage={
              searchTerm.trim() ? "No invoices match. Try a different search." : "There are no other invoices of this module to link to yet."
            }
            onSelect={onSelect}
          />
          {candidatesQuery.data ? (
            <TablePagination
              page={page}
              pageSize={pageSize}
              totalPages={candidatesQuery.data.totalPages}
              total={candidatesQuery.data.total}
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
    </Stack>
  )
}
