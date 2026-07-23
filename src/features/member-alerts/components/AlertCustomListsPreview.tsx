import { useState } from "react"
import { Badge, Box, Button, Flex, SkeletonText, Stack, Table, Text } from "@chakra-ui/react"
import type { AlertCustomListPreviewFilters } from "@/api/alerts"
import { extractApiError } from "@/utils/errors"
import { formatDateTime } from "../constants"
import { useAlertCustomListPreview } from "../hooks/useAlerts"

const PREVIEW_PAGE_SIZE = 10

interface AlertCustomListsPreviewProps {
  filters: AlertCustomListPreviewFilters
}

export function AlertCustomListsPreview({ filters }: AlertCustomListsPreviewProps) {
  const [page, setPage] = useState(1)
  const hasLists = filters.customListUniqueIds.length > 0

  const previewQuery = useAlertCustomListPreview(filters, page, PREVIEW_PAGE_SIZE, hasLists)

  const previewPage = previewQuery.data
  const members = previewPage?.items ?? []
  const total = previewPage?.total ?? 0
  const totalPages = Math.max(previewPage?.totalPages ?? 0, 1)
  const currentPage = previewPage?.page ?? page

  return (
    <Stack gap={4}>
      <Flex
        align={{ base: "flex-start", md: "center" }}
        justify="space-between"
        gap={3}
        direction={{ base: "column", md: "row" }}
      >
        <Box>
          <Text
            fontSize="xs"
            fontWeight="800"
            letterSpacing="0.14em"
            textTransform="uppercase"
            color="text.secondary"
          >
            Audience preview
          </Text>
          <Text fontSize={{ base: "md", md: "lg" }} color="gray.900" fontWeight="800" mt={1}>
            Custom lists
          </Text>
          <Text fontSize="sm" color="text.secondary" mt={1}>
            {hasLists
              ? "This list stays paginated so we only load the members that belong to the applied custom lists and refiners."
              : "Choose at least one custom list to preview the matched members."}
          </Text>
        </Box>

        <Badge
          variant="subtle"
          colorPalette="green"
          borderRadius="full"
          px={3}
          py={1}
          fontWeight="800"
          alignSelf={{ base: "flex-start", md: "center" }}
        >
          {hasLists ? `${total} matched` : "0 matched"}
        </Badge>
      </Flex>

      {!hasLists ? (
        <Box
          py={12}
          textAlign="center"
          borderRadius="16px"
          border="1px dashed"
          borderColor="border.subtle"
          bg="app.bg"
        >
          <Text fontSize="sm" fontWeight="600" color="text.primary">
            Select one or more custom lists, then press Apply.
          </Text>
          <Text mt={1} fontSize="xs" color="text.secondary">
            We only fetch the filtered page, not every member in every list.
          </Text>
        </Box>
      ) : previewQuery.isError ? (
        <Box borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50" px={4} py={3}>
          <Text fontSize="sm" fontWeight="700" color="red.700">
            {extractApiError(previewQuery.error)}
          </Text>
        </Box>
      ) : previewQuery.isLoading && !previewPage ? (
        <Box borderRadius="16px" border="1px solid" borderColor="border.subtle" bg="card.bg" px={4} py={4}>
          <SkeletonText noOfLines={6} />
        </Box>
      ) : (
        <Box borderRadius="16px" border="1px solid" borderColor="border.subtle" overflow="hidden" bg="card.bg">
          <Box overflowX="auto">
            <Table.Root variant="line" size="sm">
              <Table.Header>
                <Table.Row bg="app.bg">
                  <Table.ColumnHeader px={4} py={3}>Member</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>Email</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>Membership type</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>Membership status</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>Added on</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {members.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={5} py={10}>
                      <Text fontSize="sm" color="text.secondary" textAlign="center">
                        No members match the selected custom lists and refiners.
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  members.map((member) => (
                    <Table.Row key={member.memberUniqueId} _hover={{ bg: "app.bg" }}>
                      <Table.Cell px={4} py={3}>
                        <Text fontSize="sm" fontWeight="600" lineClamp={1}>
                          {member.fullName}
                        </Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        <Text fontSize="sm" color="text.secondary" lineClamp={1}>
                          {member.email ?? "-"}
                        </Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        <Text fontSize="sm" color="text.secondary" lineClamp={1}>
                          {member.membershipTypeName ?? "-"}
                        </Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        <Badge variant="surface" colorPalette="gray">
                          {member.membershipStatus ?? "-"}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        <Text fontSize="sm" color="text.secondary" lineClamp={1}>
                          {formatDateTime(member.addedOnUtc)}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table.Root>
          </Box>

          <Flex
            px={4}
            py={3}
            align="center"
            justify="space-between"
            gap={3}
            borderTop="1px solid"
            borderColor="border.subtle"
            direction={{ base: "column", md: "row" }}
          >
            <Text fontSize="xs" color="text.secondary">
              Page {currentPage} of {totalPages}
            </Text>

            <Flex gap={2}>
              <Button
                size="sm"
                variant="outline"
                borderRadius="10px"
                cursor={page <= 1 ? "not-allowed" : "pointer"}
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                borderRadius="10px"
                cursor={page >= totalPages ? "not-allowed" : "pointer"}
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </Button>
            </Flex>
          </Flex>
        </Box>
      )}
    </Stack>
  )
}
