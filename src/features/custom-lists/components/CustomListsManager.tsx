import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react"
import { Plus } from "lucide-react"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import { useCustomLists } from "../hooks/useCustomLists"
import { CustomListFilterBar } from "./CustomListFilterBar"
import { CustomListsTable } from "./CustomListsTable"
import { CustomListsTableSkeleton } from "./CustomListsTable.skeleton"
import { DeleteCustomListDialog } from "./DeleteCustomListDialog"
import type {
  CustomListFilters,
  CustomListItem,
  CustomListSortBy,
  CustomListSortOrder,
} from "@/api/customLists"

const PAGE_SIZE = 10

const DEFAULT_FILTERS: CustomListFilters = {
  searchTerm: "",
  customListUniqueIds: [],
  sortBy: "name",
  sortOrder: "asc",
}

export function CustomListsManager() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [draftSearchTerm, setDraftSearchTerm] = useState("")
  const [draftCustomListIds, setDraftCustomListIds] = useState<string[]>([])
  const [appliedFilters, setAppliedFilters] = useState<CustomListFilters>(DEFAULT_FILTERS)
  const [deletingList, setDeletingList] = useState<CustomListItem | null>(null)

  const customListsQuery = useCustomLists(appliedFilters, page, PAGE_SIZE)
  const customListsPage = customListsQuery.data
  const customLists = customListsPage?.items ?? []
  const totalPages = customListsPage?.totalPages ?? 0
  const currentPage = customListsPage?.page ?? page

  const hasAppliedFilter =
    appliedFilters.searchTerm.trim().length > 0 || appliedFilters.customListUniqueIds.length > 0
  const isSorted =
    appliedFilters.sortBy !== DEFAULT_FILTERS.sortBy || appliedFilters.sortOrder !== DEFAULT_FILTERS.sortOrder

  function handleApplyFilters() {
    setAppliedFilters((current) => ({
      ...current,
      searchTerm: draftSearchTerm,
      customListUniqueIds: draftCustomListIds,
    }))
    setPage(1)
  }

  function handleClearFilters() {
    setDraftSearchTerm("")
    setDraftCustomListIds([])
    setAppliedFilters((current) => ({
      ...DEFAULT_FILTERS,
      sortBy: current.sortBy,
      sortOrder: current.sortOrder,
    }))
    setPage(1)
  }

  function handleClearSort() {
    setAppliedFilters((current) => ({
      ...current,
      sortBy: DEFAULT_FILTERS.sortBy,
      sortOrder: DEFAULT_FILTERS.sortOrder,
    }))
    setPage(1)
  }

  function handleSortChange(nextSortBy: CustomListSortBy) {
    setAppliedFilters((current) => {
      const nextSortOrder: CustomListSortOrder =
        current.sortBy === nextSortBy && current.sortOrder === "asc" ? "desc" : "asc"

      return { ...current, sortBy: nextSortBy, sortOrder: nextSortOrder }
    })
    setPage(1)
  }

  return (
    <Stack gap={5}>
      <Flex justify="flex-end">
        <Button
          w={{ base: "full", md: "auto" }}
          minH="11"
          px={6}
          py={3}
          borderRadius="14px"
          fontWeight="700"
          bg="linear-gradient(135deg, #7551FF 0%, #422AFB 100%)"
          color="white"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          gap={2}
          cursor="pointer"
          onClick={() => navigate(APP_ROUTES.customLists.create)}
        >
          <Plus size={16} />
          New custom list
        </Button>
      </Flex>

      <CustomListFilterBar
        draftSearchTerm={draftSearchTerm}
        draftCustomListIds={draftCustomListIds}
        hasAppliedFilter={hasAppliedFilter}
        isSorted={isSorted}
        isApplying={customListsQuery.isFetching}
        onSearchTermChange={setDraftSearchTerm}
        onCustomListIdsChange={setDraftCustomListIds}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        onClearSort={handleClearSort}
      />

      {customListsQuery.isError ? (
        <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
          <Text fontSize="sm" fontWeight="700" color="red.700">
            {extractApiError(customListsQuery.error)}
          </Text>
        </Box>
      ) : null}

      {customListsQuery.isLoading && !customListsQuery.data ? (
        <CustomListsTableSkeleton />
      ) : (
        <Box
          borderRadius="20px"
          border="1px solid"
          borderColor="border.subtle"
          bg="card.bg"
          boxShadow="card"
          overflow="hidden"
        >
          <CustomListsTable
            customLists={customLists}
            sortBy={appliedFilters.sortBy}
            sortOrder={appliedFilters.sortOrder}
            onSortChange={handleSortChange}
            onCreate={() => navigate(APP_ROUTES.customLists.create)}
            onEdit={(customList) => navigate(APP_ROUTES.customLists.edit(customList.uniqueId))}
            onDelete={setDeletingList}
          />

          <Flex
            px={{ base: 4, md: 6 }}
            py={4}
            align={{ base: "stretch", md: "center" }}
            justify="space-between"
            direction={{ base: "column", md: "row" }}
            gap={3}
            borderTop="1px solid"
            borderColor="border.subtle"
          >
            <Text fontSize="sm" color="gray.600">
              {customListsPage?.total ?? 0} list{(customListsPage?.total ?? 0) === 1 ? "" : "s"} · page {currentPage} of{" "}
              {Math.max(totalPages, 1)}
            </Text>

            {totalPages > 1 ? (
              <Flex gap={2} align="center" wrap="wrap" justify="flex-end">
                <Button
                  variant="outline"
                  cursor={currentPage <= 1 ? "not-allowed" : "pointer"}
                  disabled={currentPage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  cursor={currentPage >= totalPages ? "not-allowed" : "pointer"}
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages || 1, current + 1))}
                >
                  Next
                </Button>
              </Flex>
            ) : null}
          </Flex>
        </Box>
      )}

      {deletingList ? (
        <DeleteCustomListDialog customList={deletingList} onClose={() => setDeletingList(null)} />
      ) : null}
    </Stack>
  )
}
