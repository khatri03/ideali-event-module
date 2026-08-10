import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Box, Stack, Text } from "@chakra-ui/react"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import type { EventInvoiceFilters, EventInvoiceListItem, EventInvoiceSortBy, EventInvoiceSortOrder } from "@/api/eventInvoices"
import { useEventInvoices } from "../hooks/useEventInvoices"
import { DEFAULT_PAGE_SIZE } from "../constants"
import { EventInvoiceFilterBar, type EventInvoiceDraftFilters } from "./EventInvoiceFilterBar"
import { EventInvoiceTable } from "./EventInvoiceTable"
import { TablePagination } from "./TablePagination"

const EMPTY_DRAFT: EventInvoiceDraftFilters = {
  searchTerm: "",
  eventUniqueIds: [],
  sessionUniqueIds: [],
  statuses: [],
  paymentMethods: [],
  invoiceDateFrom: "",
  invoiceDateTo: "",
}

const DEFAULT_FILTERS: EventInvoiceFilters = {
  eventUniqueIds: [],
  sessionUniqueIds: [],
  statuses: [],
  paymentMethods: [],
  invoiceDateFrom: null,
  invoiceDateTo: null,
  searchTerm: "",
}

function toFilters(draft: EventInvoiceDraftFilters): EventInvoiceFilters {
  return {
    eventUniqueIds: draft.eventUniqueIds,
    sessionUniqueIds: draft.sessionUniqueIds,
    statuses: draft.statuses,
    paymentMethods: draft.paymentMethods,
    invoiceDateFrom: draft.invoiceDateFrom || null,
    invoiceDateTo: draft.invoiceDateTo || null,
    searchTerm: draft.searchTerm,
  }
}

/**
 * The event card links here with the event it was opened from, so the list lands already narrowed to
 * that event instead of showing every invoice the organizer has.
 */
function draftForEvent(eventUniqueId: string): EventInvoiceDraftFilters {
  return eventUniqueId ? { ...EMPTY_DRAFT, eventUniqueIds: [eventUniqueId] } : EMPTY_DRAFT
}

interface EventInvoiceManagerProps {
  initialEventUniqueId?: string
}

export function EventInvoiceManager({ initialEventUniqueId = "" }: EventInvoiceManagerProps) {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [sortBy, setSortBy] = useState<EventInvoiceSortBy>("invoiceDateUtc")
  const [sortOrder, setSortOrder] = useState<EventInvoiceSortOrder>("desc")
  const [draft, setDraft] = useState<EventInvoiceDraftFilters>(() => draftForEvent(initialEventUniqueId))
  const [appliedFilters, setAppliedFilters] = useState<EventInvoiceFilters>(() =>
    toFilters(draftForEvent(initialEventUniqueId)),
  )

  const invoicesQuery = useEventInvoices(appliedFilters, page, pageSize, sortBy, sortOrder)
  const invoicesPage = invoicesQuery.data
  const invoices = invoicesPage?.items ?? []
  const totalPages = invoicesPage?.totalPages ?? 0
  const currentPage = invoicesPage?.page ?? page

  const hasAppliedFilter =
    appliedFilters.searchTerm.trim().length > 0 ||
    appliedFilters.eventUniqueIds.length > 0 ||
    appliedFilters.sessionUniqueIds.length > 0 ||
    appliedFilters.statuses.length > 0 ||
    appliedFilters.paymentMethods.length > 0 ||
    Boolean(appliedFilters.invoiceDateFrom) ||
    Boolean(appliedFilters.invoiceDateTo)

  function handleApplyFilters() {
    setAppliedFilters(toFilters(draft))
    setPage(1)
  }

  function handleClearFilters() {
    setDraft(EMPTY_DRAFT)
    setAppliedFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize)
    setPage(1)
  }

  function handleSortChange(nextSortBy: EventInvoiceSortBy) {
    setSortOrder((current) => (sortBy === nextSortBy && current === "asc" ? "desc" : "asc"))
    setSortBy(nextSortBy)
    setPage(1)
  }

  function handleOpenDetail(invoice: EventInvoiceListItem) {
    navigate(APP_ROUTES.eventInvoices.detail(invoice.invoiceUniqueId))
  }

  return (
    <Stack gap={5}>
      <EventInvoiceFilterBar
        draft={draft}
        hasAppliedFilter={hasAppliedFilter}
        isApplying={invoicesQuery.isFetching}
        onDraftChange={setDraft}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      {invoicesQuery.isError ? (
        <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
          <Text fontSize="sm" fontWeight="700" color="red.700">
            {extractApiError(invoicesQuery.error)}
          </Text>
        </Box>
      ) : null}

      <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" boxShadow="card" overflow="hidden">
        <EventInvoiceTable
          invoices={invoices}
          sortBy={sortBy}
          sortOrder={sortOrder}
          isFetching={invoicesQuery.isFetching}
          onSortChange={handleSortChange}
          onOpenDetail={handleOpenDetail}
        />

        <TablePagination
          page={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          total={invoicesPage?.total ?? 0}
          itemLabel="invoice"
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </Box>
    </Stack>
  )
}
