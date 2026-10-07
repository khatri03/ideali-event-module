import { Box, Button, Stack, Text } from "@chakra-ui/react"
import { RotateCcw } from "lucide-react"
import type { ReactNode } from "react"
import { ErrorState, TablePagination } from "@/components/common"
import { extractApiError } from "@/utils/errors"
import { useCustomInvoiceList } from "../hooks/useCustomInvoiceList"
import type { CustomInvoiceListSearchParams } from "../hooks/useCustomInvoiceListSearchParams"
import { CustomInvoiceListCards } from "./CustomInvoiceListCards"
import { CustomInvoiceListCardsSkeleton } from "./CustomInvoiceListCards.skeleton"
import { CustomInvoiceListTable } from "./CustomInvoiceListTable"
import { NewCustomInvoiceButton } from "./NewCustomInvoiceButton"

interface CustomInvoiceListResultsProps {
  filters: CustomInvoiceListSearchParams
}

function ResultsCard({ children }: { children: ReactNode }) {
  return (
    <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" boxShadow="card" overflow="hidden">
      {children}
    </Box>
  )
}

function EmptyResults({ title, message, action }: { title: string; message: string; action: ReactNode }) {
  return (
    <ResultsCard>
      <Stack align="center" textAlign="center" gap={2} px={4} py={14}>
        <Text fontSize="lg" fontWeight="700" color="text.primary">
          {title}
        </Text>
        <Text fontSize="sm" color="text.secondary">
          {message}
        </Text>
        <Box mt={3} w={{ base: "full", md: "auto" }}>
          {action}
        </Box>
      </Stack>
    </ResultsCard>
  )
}

export function CustomInvoiceListResults({ filters }: CustomInvoiceListResultsProps) {
  const listQuery = useCustomInvoiceList(filters.query)
  const page = listQuery.data

  // Placeholder rows from the previous filters would misreport this request, so a failure always replaces them.
  if (listQuery.isError) {
    return (
      <ErrorState
        title="Could not load invoices"
        message={extractApiError(listQuery.error)}
        isRetrying={listQuery.isFetching}
        onRetry={() => void listQuery.refetch()}
      />
    )
  }

  if (!page) {
    return (
      <ResultsCard>
        <Box display={{ base: "none", md: "block" }}>
          <CustomInvoiceListTable invoices={[]} isLoading />
        </Box>
        <Box display={{ base: "block", md: "none" }}>
          <CustomInvoiceListCardsSkeleton />
        </Box>
      </ResultsCard>
    )
  }

  if (page.items.length === 0 && filters.hasActiveFilters) {
    return (
      <EmptyResults
        title="No invoices match these filters"
        message="Try other filters or clear them."
        action={
          <Button variant="outline" w="full" minH="11" px={6} borderRadius="14px" cursor="pointer" onClick={filters.clearFilters}>
            <RotateCcw size={15} />
            Clear filters
          </Button>
        }
      />
    )
  }

  if (page.items.length === 0) {
    return (
      <EmptyResults
        title="No custom invoices yet"
        message="Create one with New Invoice."
        action={<NewCustomInvoiceButton lockedModule={filters.lockedModule} />}
      />
    )
  }

  return (
    <ResultsCard>
      <Box display={{ base: "none", md: "block" }}>
        <CustomInvoiceListTable invoices={page.items} isLoading={false} />
      </Box>
      <Box display={{ base: "block", md: "none" }}>
        <CustomInvoiceListCards invoices={page.items} />
      </Box>
      <TablePagination
        page={page.page}
        pageSize={filters.query.pageSize}
        totalPages={page.totalPages}
        total={page.total}
        itemLabel="invoice"
        onPageChange={filters.setPage}
        onPageSizeChange={filters.setPageSize}
      />
    </ResultsCard>
  )
}
