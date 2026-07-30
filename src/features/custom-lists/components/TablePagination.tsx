import { useMemo } from "react"
import { Button, Flex, NativeSelect, Text } from "@chakra-ui/react"
import { PAGE_SIZE_OPTIONS } from "../constants"

interface TablePaginationProps {
  page: number
  pageSize: number
  totalPages: number
  total: number
  /** Singular noun for the record type, e.g. "list" or "member". */
  itemLabel: string
  size?: "sm" | "md"
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function TablePagination({
  page,
  pageSize,
  totalPages,
  total,
  itemLabel,
  size = "md",
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const resolvedTotalPages = Math.max(totalPages, 1)
  const pageNumbers = useMemo(
    () => Array.from({ length: resolvedTotalPages }, (_, index) => index + 1),
    [resolvedTotalPages],
  )

  const isFirstPage = page <= 1
  const isLastPage = page >= resolvedTotalPages
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)
  const controlHeight = size === "sm" ? "32px" : "36px"
  const fontSize = size === "sm" ? "xs" : "sm"

  return (
    <Flex
      px={{ base: 3, md: 4 }}
      py={3}
      align={{ base: "stretch", lg: "center" }}
      justify="space-between"
      direction={{ base: "column", lg: "row" }}
      gap={3}
      borderTop="1px solid"
      borderColor="border.subtle"
      bg="app.bg"
    >
      <Flex align="center" gap={2} flexWrap="wrap">
        <Text fontSize={fontSize} color="text.secondary" whiteSpace="nowrap">
          {total === 0 ? `No ${itemLabel}s` : `${rangeStart}–${rangeEnd} of ${total}`}
        </Text>

        <Flex align="center" gap={2}>
          <Text fontSize={fontSize} color="text.secondary" whiteSpace="nowrap">
            Rows
          </Text>
          <NativeSelect.Root size="sm" w="auto">
            <NativeSelect.Field
              value={String(pageSize)}
              onChange={(event) => onPageSizeChange(Number(event.currentTarget.value))}
              aria-label={`${itemLabel}s per page`}
              h={controlHeight}
              minW="86px"
              borderRadius="10px"
              bg="card.bg"
              fontSize={fontSize}
              ps={3}
              pe={8}
              textAlign="start"
              cursor="pointer"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Flex>
      </Flex>

      <Flex align="center" gap={2} flexWrap="wrap" justify={{ base: "space-between", lg: "flex-end" }}>
        <Flex align="center" gap={2}>
          <Text fontSize={fontSize} color="text.secondary" whiteSpace="nowrap">
            Page
          </Text>
          <NativeSelect.Root size="sm" w="auto" disabled={resolvedTotalPages <= 1}>
            <NativeSelect.Field
              value={String(page)}
              onChange={(event) => onPageChange(Number(event.currentTarget.value))}
              aria-label="Go to page"
              h={controlHeight}
              minW="86px"
              borderRadius="10px"
              bg="card.bg"
              fontSize={fontSize}
              ps={3}
              pe={8}
              textAlign="start"
              cursor={resolvedTotalPages <= 1 ? "not-allowed" : "pointer"}
            >
              {pageNumbers.map((pageNumber) => (
                <option key={pageNumber} value={pageNumber}>
                  {pageNumber}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <Text fontSize={fontSize} color="text.secondary" whiteSpace="nowrap">
            of {resolvedTotalPages}
          </Text>
        </Flex>

        <Flex gap={2}>
          <Button
            variant="outline"
            size="sm"
            h={controlHeight}
            borderRadius="10px"
            cursor={isFirstPage ? "not-allowed" : "pointer"}
            disabled={isFirstPage}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            h={controlHeight}
            borderRadius="10px"
            cursor={isLastPage ? "not-allowed" : "pointer"}
            disabled={isLastPage}
            onClick={() => onPageChange(Math.min(resolvedTotalPages, page + 1))}
          >
            Next
          </Button>
        </Flex>
      </Flex>
    </Flex>
  )
}
