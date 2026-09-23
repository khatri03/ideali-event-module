import { Button, Flex, Text } from "@chakra-ui/react"
import { RotateCw } from "lucide-react"

interface StatusChangesFooterProps {
  loadedCount: number
  hasMore: boolean
  isLoadingMore: boolean
  hasLoadMoreFailed: boolean
  onLoadMore: () => void
}

function loadedSummary(loadedCount: number, hasMore: boolean): string {
  const noun = loadedCount === 1 ? "change" : "changes"
  return hasMore ? `Showing the latest ${loadedCount} ${noun}` : `End of history · ${loadedCount} ${noun}`
}

export function StatusChangesFooter({
  loadedCount,
  hasMore,
  isLoadingMore,
  hasLoadMoreFailed,
  onLoadMore,
}: StatusChangesFooterProps) {
  return (
    <Flex
      direction={{ base: "column", sm: "row" }}
      align={{ base: "stretch", sm: "center" }}
      justify="space-between"
      gap={3}
      mt={4}
    >
      <Text fontSize="sm" color="text.secondary" role="status">
        {hasLoadMoreFailed ? "We couldn't load more changes." : loadedSummary(loadedCount, hasMore)}
      </Text>
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
