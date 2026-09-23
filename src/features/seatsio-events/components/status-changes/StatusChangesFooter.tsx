import { Button, Flex, NativeSelect, Text } from "@chakra-ui/react"
import { RotateCw } from "lucide-react"
import { STATUS_CHANGE_PAGE_SIZES, type StatusChangePageSize } from "@/api/seatsio"

interface StatusChangesFooterProps {
  loadedCount: number
  hasMore: boolean
  isLoadingMore: boolean
  hasLoadMoreFailed: boolean
  onLoadMore: () => void
  pageSize: StatusChangePageSize
  onPageSizeChange: (pageSize: StatusChangePageSize) => void
}

function loadedSummary(loadedCount: number, hasMore: boolean): string {
  const noun = loadedCount === 1 ? "change" : "changes"
  return hasMore ? `Showing the latest ${loadedCount} ${noun}` : `End of history · ${loadedCount} ${noun}`
}

function PageSizeSelect({ pageSize, onPageSizeChange }: Pick<StatusChangesFooterProps, "pageSize" | "onPageSizeChange">) {
  return (
    <Flex align="center" gap={2}>
      <Text fontSize="sm" color="text.secondary" whiteSpace="nowrap">
        Per page
      </Text>
      <NativeSelect.Root size="sm" w="88px">
        <NativeSelect.Field
          aria-label="Changes to load per page"
          value={String(pageSize)}
          minH="11"
          px={3}
          borderRadius="12px"
          cursor="pointer"
          onChange={(event) => onPageSizeChange(Number(event.currentTarget.value) as StatusChangePageSize)}
        >
          {STATUS_CHANGE_PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </Flex>
  )
}

export function StatusChangesFooter({
  loadedCount,
  hasMore,
  isLoadingMore,
  hasLoadMoreFailed,
  onLoadMore,
  pageSize,
  onPageSizeChange,
}: StatusChangesFooterProps) {
  return (
    <Flex
      direction={{ base: "column", sm: "row" }}
      align={{ base: "stretch", sm: "center" }}
      justify="space-between"
      gap={3}
      mt={4}
    >
      <Flex
        direction={{ base: "column", sm: "row" }}
        align={{ base: "stretch", sm: "center" }}
        gap={{ base: 2, sm: 4 }}
      >
        <PageSizeSelect pageSize={pageSize} onPageSizeChange={onPageSizeChange} />
        <Text fontSize="sm" color="text.secondary" role="status">
          {hasLoadMoreFailed ? "We couldn't load more changes." : loadedSummary(loadedCount, hasMore)}
        </Text>
      </Flex>
      {hasMore && (
        <Button
          minH="11"
          px={4}
          variant="outline"
          w={{ base: "full", sm: "auto" }}
          cursor="pointer"
          disabled={isLoadingMore}
          loading={isLoadingMore}
          loadingText="Loading more..."
          onClick={onLoadMore}
        >
          {hasLoadMoreFailed && <RotateCw size={16} />}
          {hasLoadMoreFailed ? "Try again" : "Load more"}
        </Button>
      )}
    </Flex>
  )
}
