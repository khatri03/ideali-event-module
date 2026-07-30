import { useState } from "react"
import { Badge, Box, Button, Flex, SkeletonText, Stack, Table, Text } from "@chakra-ui/react"
import { extractApiError } from "@/utils/errors"
import { useAlertMemberPreview } from "../hooks/useAlerts"

const PREVIEW_PAGE_SIZE = 10

interface AlertAudiencePreviewProps {
  membershipTypeUniqueId: string
  membershipStatus: string
}

export function AlertAudiencePreview({
  membershipTypeUniqueId,
  membershipStatus,
}: AlertAudiencePreviewProps) {
  const [page, setPage] = useState(1)
  const hasFilters = membershipTypeUniqueId.trim().length > 0 || membershipStatus.trim().length > 0

  const previewQuery = useAlertMemberPreview(
    {
      membershipTypeUniqueIds: membershipTypeUniqueId ? [membershipTypeUniqueId] : [],
      membershipStatuses: membershipStatus ? [membershipStatus] : [],
    },
    page,
    PREVIEW_PAGE_SIZE,
    hasFilters,
  )

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
            Matched members
          </Text>
          <Text fontSize="sm" color="text.secondary" mt={1}>
            {hasFilters
              ? "This list stays paginated so we only load the members that match the applied filters."
              : "Choose at least one filter to preview the matched members."}
          </Text>
        </Box>

        <Badge
          variant="subtle"
          colorPalette="purple"
          borderRadius="full"
          px={3}
          py={1}
          fontWeight="800"
          alignSelf={{ base: "flex-start", md: "center" }}
        >
          {hasFilters ? `${total} matched` : "0 matched"}
        </Badge>
      </Flex>

      {!hasFilters ? (
        <Box
          py={12}
          textAlign="center"
          borderRadius="16px"
          border="1px dashed"
          borderColor="border.subtle"
          bg="app.bg"
        >
          <Text fontSize="sm" fontWeight="600" color="text.primary">
            Select a membership type or status, then press Apply.
          </Text>
          <Text mt={1} fontSize="xs" color="text.secondary">
            We only fetch the filtered page, not the entire member table.
          </Text>
        </Box>
      ) : previewQuery.isError ? (
        <Box
          borderRadius="16px"
          border="1px solid"
          borderColor="red.200"
          bg="red.50"
          px={4}
          py={3}
        >
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
                  <Table.ColumnHeader px={4} py={3}>
                    Member
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>
                    Email
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>
                    Membership type
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>
                    Status
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {members.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={4} py={10}>
                      <Text fontSize="sm" color="text.secondary" textAlign="center">
                        No members match the selected filters.
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  members.map((member) => (
                    <Table.Row key={member.uniqueId} _hover={{ bg: "app.bg" }}>
                      <Table.Cell px={4} py={3}>
                        <Text fontSize="sm" fontWeight="600" lineClamp={1}>
                          {member.memberFullName}
                        </Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        <Text fontSize="sm" color="text.secondary" lineClamp={1}>
                          {member.email ?? "—"}
                        </Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        <Text fontSize="sm" color="text.secondary" lineClamp={1}>
                          {member.activeMembershipName}
                        </Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        <Badge variant="surface" colorPalette="gray">
                          {member.membershipStatus}
                        </Badge>
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
