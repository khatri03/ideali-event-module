import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react"
import { Plus } from "lucide-react"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import { useCustomLists } from "../hooks/useCustomLists"
import { AddMembersDialog } from "./AddMembersDialog"
import { CustomListFilterBar } from "./CustomListFilterBar"
import { CustomListsTable } from "./CustomListsTable"
import { CustomListsTableSkeleton } from "./CustomListsTable.skeleton"
import { DeleteCustomListDialog } from "./DeleteCustomListDialog"
import { TablePagination } from "./TablePagination"
import { PAGE_SIZE_OPTIONS } from "../constants"
import type {
  CustomListFilters,
  CustomListItem,
  CustomListSortBy,
  CustomListSortOrder,
} from "@/api/customLists"

const DEFAULT_FILTERS: CustomListFilters = {
  searchTerm: "",
  customListUniqueIds: [],
  sortBy: "name",
  sortOrder: "asc",
}

export function CustomListsManager() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0])
  const [draftSearchTerm, setDraftSearchTerm] = useState("")
  const [draftCustomListIds, setDraftCustomListIds] = useState<string[]>([])
  const [appliedFilters, setAppliedFilters] = useState<CustomListFilters>(DEFAULT_FILTERS)
  const [deletingList, setDeletingList] = useState<CustomListItem | null>(null)
  const [addingMembersToList, setAddingMembersToList] = useState<CustomListItem | null>(null)

  const customListsQuery = useCustomLists(appliedFilters, page, pageSize)
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

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize)
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
            isFetching={customListsQuery.isFetching}
            onSortChange={handleSortChange}
            onCreate={() => navigate(APP_ROUTES.customLists.create)}
            onEdit={(customList) => navigate(APP_ROUTES.customLists.edit(customList.uniqueId))}
            onAddMembers={setAddingMembersToList}
            onDelete={setDeletingList}
          />

          <TablePagination
            page={currentPage}
            pageSize={pageSize}
            totalPages={totalPages}
            total={customListsPage?.total ?? 0}
            itemLabel="list"
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </Box>
      )}

      {addingMembersToList ? (
        <AddMembersDialog
          customListUniqueId={addingMembersToList.uniqueId}
          customListName={addingMembersToList.name}
          onClose={() => setAddingMembersToList(null)}
        />
      ) : null}

      {deletingList ? (
        <DeleteCustomListDialog customList={deletingList} onClose={() => setDeletingList(null)} />
      ) : null}
    </Stack>
  )
}
