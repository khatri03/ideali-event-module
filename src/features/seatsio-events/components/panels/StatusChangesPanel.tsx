import { useMemo, useState } from "react"
import { Button, Stack } from "@chakra-ui/react"
import { ErrorState } from "@/components/common"
import {
  DEFAULT_STATUS_CHANGE_PAGE_SIZE,
  STATUS_CHANGE_SORT,
  type StatusChangeFilters,
  type StatusChangePageSize,
  type StatusChangeSort,
} from "@/api/seatsio"
import { useDebounce } from "@/hooks/useDebounce"
import { extractApiError } from "@/utils/errors"
import { useEventStatusChanges } from "../../hooks/useEventReports"
import { nextStatusChangeSort, type StatusChangeSortColumn } from "../../utils/statusChangeDisplay"
import { ReportEmpty, ReportPanelShell, ReportSkeleton } from "../ReportStates"
import { StatusChangesFooter } from "../status-changes/StatusChangesFooter"
import { StatusChangesTable } from "../status-changes/StatusChangesTable"
import { StatusChangesToolbar } from "../status-changes/StatusChangesToolbar"

interface StatusChangesPanelProps {
  eventUniqueId: string
}

function NoMatch({ search, onClear }: { search: string; onClear: () => void }) {
  return (
    <Stack align="center" gap={3}>
      <ReportEmpty
        title={`No changes match “${search}”`}
        description="Check the object label, or switch between contains and exact match."
      />
      <Button minH="11" px={4} variant="outline" cursor="pointer" onClick={onClear}>
        Clear search
      </Button>
    </Stack>
  )
}

export function StatusChangesPanel({ eventUniqueId }: StatusChangesPanelProps) {
  const [search, setSearch] = useState("")
  const [isExactMatch, setIsExactMatch] = useState(false)
  const [sort, setSort] = useState<StatusChangeSort>(STATUS_CHANGE_SORT.dateDesc)
  const [pageSize, setPageSize] = useState<StatusChangePageSize>(DEFAULT_STATUS_CHANGE_PAGE_SIZE)
  const debouncedSearch = useDebounce(search)

  const filters = useMemo<StatusChangeFilters>(() => {
    const trimmed = debouncedSearch.trim()
    return { search: trimmed, exactMatch: isExactMatch && trimmed !== "", sort, pageSize }
  }, [debouncedSearch, isExactMatch, sort, pageSize])
  const query = useEventStatusChanges(eventUniqueId, filters, true)
  const changes = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data])

  function handleObjectSelect(objectLabel: string) {
    setSearch(objectLabel)
    setIsExactMatch(true)
  }

  function handleSort(column: StatusChangeSortColumn) {
    setSort((current) => nextStatusChangeSort(current, column))
  }

  function renderBody() {
    if (query.isError && !query.data) {
      return (
        <ErrorState
          title="We couldn't load the status history"
          message={extractApiError(query.error)}
          onRetry={() => void query.refetch()}
          isRetrying={query.isRefetching}
        />
      )
    }
    if (query.isPending) {
      return <ReportSkeleton rows={8} />
    }
    if (changes.length === 0) {
      return filters.search ? (
        <NoMatch search={filters.search} onClear={() => setSearch("")} />
      ) : (
        <ReportEmpty
          title="No status changes yet"
          description="When seats are held, booked or released for this event, every change shows up here."
        />
      )
    }
    return (
      <>
        <StatusChangesTable
          changes={changes}
          sort={sort}
          canSort={!filters.exactMatch}
          onSort={handleSort}
          onObjectSelect={handleObjectSelect}
        />
        <StatusChangesFooter
          loadedCount={changes.length}
          hasMore={query.hasNextPage}
          isLoadingMore={query.isFetchingNextPage}
          hasLoadMoreFailed={query.isFetchNextPageError}
          onLoadMore={() => void query.fetchNextPage()}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      </>
    )
  }

  return (
    <ReportPanelShell>
      <StatusChangesToolbar
        search={search}
        isExactMatch={isExactMatch}
        onSearchChange={setSearch}
        onExactMatchChange={setIsExactMatch}
      />
      {renderBody()}
    </ReportPanelShell>
  )
}
