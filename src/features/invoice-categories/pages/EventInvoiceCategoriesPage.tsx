import { useState } from "react"
import { Box, Heading, Stack, Text } from "@chakra-ui/react"
import { Tags } from "lucide-react"
import { ErrorState, TablePagination } from "@/components/common"
import { extractApiError } from "@/utils/errors"
import type { EventInvoiceCategoryFilters } from "@/api/eventInvoiceCategories"
import { useEventInvoiceCategories } from "../hooks/useEventInvoiceCategories"
import { EventInvoiceCategoriesTable } from "../components/EventInvoiceCategoriesTable"
import { DEFAULT_PAGE_SIZE } from "../constants"

// Search and sorting controls arrive with the management UI in plan 03; the tracer lists the
// organizer's categories in display order.
const LIST_FILTERS: EventInvoiceCategoryFilters = {
  searchTerm: "",
  sortBy: "displayOrder",
  sortOrder: "asc",
}

export function EventInvoiceCategoriesPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)

  const categoriesQuery = useEventInvoiceCategories(LIST_FILTERS, page, pageSize)
  const categoriesPage = categoriesQuery.data

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize)
    setPage(1)
  }

  return (
    <Stack gap={6}>
      <Box border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 6 }}>
        <Stack direction={{ base: "column", md: "row" }} align={{ base: "flex-start", md: "center" }} gap={4}>
          <Box w="64px" h="64px" borderRadius="18px" display="flex" alignItems="center" justifyContent="center" bg="brand.gradient" flexShrink={0}>
            <Tags size={28} color="white" />
          </Box>
          <Box flex={1}>
            <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="text.primary">
              Invoice Categories
            </Heading>
            <Text mt={2} fontSize={{ base: "sm", md: "md" }} color="text.secondary" maxW="3xl">
              Manage the sponsorship types you bill custom invoices under. Add, rename, or remove a
              category, then pick one when creating a custom invoice.
            </Text>
          </Box>
        </Stack>
      </Box>

      {categoriesQuery.isError ? (
        <ErrorState
          title="Could not load categories"
          message={extractApiError(categoriesQuery.error)}
          isRetrying={categoriesQuery.isFetching}
          onRetry={() => void categoriesQuery.refetch()}
        />
      ) : (
        <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" boxShadow="card" overflow="hidden">
          <EventInvoiceCategoriesTable
            categories={categoriesPage?.items ?? []}
            isFetching={categoriesQuery.isLoading}
          />
          <TablePagination
            page={categoriesPage?.page ?? page}
            pageSize={pageSize}
            totalPages={categoriesPage?.totalPages ?? 0}
            total={categoriesPage?.total ?? 0}
            itemLabel="category"
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </Box>
      )}
    </Stack>
  )
}
