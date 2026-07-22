import { useMemo, useState } from "react"
import { Box, Button, Checkbox, Field, Flex, Input, SkeletonText, Stack, Table, Text } from "@chakra-ui/react"
import ReactSelect from "react-select"
import { Filter, Search } from "lucide-react"
import { useDebounce } from "@/hooks/useDebounce"
import { extractApiError } from "@/utils/errors"
import { useCustomListMemberOptions, useMembershipTypeOptions } from "../hooks/useCustomLists"

const MEMBER_PAGE_SIZE = 10

interface MembershipTypeSelectOption {
  value: string
  label: string
}

interface MemberPickerProps {
  selectedMemberIds: string[]
  onToggleMember: (memberUniqueId: string) => void
  onReplaceSelection: (memberUniqueIds: string[]) => void
  excludingCustomListUniqueId?: string
  emptyMessage?: string
}

export function MemberPicker({
  selectedMemberIds,
  onToggleMember,
  onReplaceSelection,
  excludingCustomListUniqueId,
  emptyMessage = "No members match this filter.",
}: MemberPickerProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [draftMembershipTypeIds, setDraftMembershipTypeIds] = useState<string[]>([])
  const [appliedMembershipTypeIds, setAppliedMembershipTypeIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const membershipTypesQuery = useMembershipTypeOptions()
  const memberOptionsQuery = useCustomListMemberOptions(
    debouncedSearchTerm,
    appliedMembershipTypeIds,
    page,
    MEMBER_PAGE_SIZE,
    excludingCustomListUniqueId,
  )

  const hasMembershipTypeFilter = appliedMembershipTypeIds.length > 0
  const hasPendingFilterChange =
    draftMembershipTypeIds.length !== appliedMembershipTypeIds.length ||
    draftMembershipTypeIds.some((id) => !appliedMembershipTypeIds.includes(id))
  const memberPage = memberOptionsQuery.data
  const members = memberPage?.items ?? []
  const totalPages = memberPage?.totalPages ?? 0
  const currentPage = memberPage?.page ?? page

  const membershipTypeOptions = useMemo<MembershipTypeSelectOption[]>(
    () => (membershipTypesQuery.data ?? []).map((option) => ({ value: option.value, label: option.text })),
    [membershipTypesQuery.data],
  )
  const draftMembershipTypeOptions = useMemo(
    () => membershipTypeOptions.filter((option) => draftMembershipTypeIds.includes(option.value)),
    [membershipTypeOptions, draftMembershipTypeIds],
  )

  const visibleMemberIds = members.map((member) => member.memberUniqueId)
  const areAllVisibleSelected =
    visibleMemberIds.length > 0 && visibleMemberIds.every((memberId) => selectedMemberIds.includes(memberId))

  function handleApplyFilter() {
    if (draftMembershipTypeIds.length === 0) {
      return
    }

    setAppliedMembershipTypeIds(draftMembershipTypeIds)
    setPage(1)
  }

  function handleClearFilter() {
    setDraftMembershipTypeIds([])
    setAppliedMembershipTypeIds([])
    setSearchTerm("")
    setPage(1)
  }

  function handleSearchTermChange(value: string) {
    setSearchTerm(value)
    setPage(1)
  }

  function handleToggleAllVisible() {
    if (areAllVisibleSelected) {
      onReplaceSelection(selectedMemberIds.filter((memberId) => !visibleMemberIds.includes(memberId)))
      return
    }

    onReplaceSelection([...new Set([...selectedMemberIds, ...visibleMemberIds])])
  }

  return (
    <Stack gap={4}>
      <Field.Root>
        <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
          Membership type
        </Field.Label>
        <Flex direction={{ base: "column", md: "row" }} gap={3} w="full" align={{ base: "stretch", md: "flex-start" }}>
          <Box flex={1} minW={0}>
            <ReactSelect
              isMulti
              options={membershipTypeOptions}
              value={draftMembershipTypeOptions}
              onChange={(values) => setDraftMembershipTypeIds(values.map((option) => option.value))}
              placeholder={membershipTypesQuery.isLoading ? "Loading membership types..." : "Select membership type(s)"}
              isLoading={membershipTypesQuery.isLoading}
              closeMenuOnSelect={false}
              isClearable
            />
          </Box>

          <Flex gap={2} flexShrink={0}>
            <Button
              minH="10"
              px={5}
              borderRadius="12px"
              fontWeight="700"
              color="white"
              w={{ base: "full", md: "auto" }}
              cursor={draftMembershipTypeIds.length === 0 ? "not-allowed" : "pointer"}
              disabled={draftMembershipTypeIds.length === 0}
              loading={memberOptionsQuery.isFetching}
              loadingText="Applying..."
              onClick={handleApplyFilter}
              style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
            >
              <Filter size={15} />
              Apply Filter
            </Button>

            {hasMembershipTypeFilter ? (
              <Button
                variant="outline"
                minH="10"
                px={4}
                borderRadius="12px"
                cursor="pointer"
                onClick={handleClearFilter}
              >
                Clear
              </Button>
            ) : null}
          </Flex>
        </Flex>
        <Field.HelperText>
          {hasPendingFilterChange && draftMembershipTypeIds.length > 0
            ? "Filter changed — press Apply Filter to refresh the results."
            : "Members load only after you apply a membership type filter."}
        </Field.HelperText>
      </Field.Root>

      {!hasMembershipTypeFilter ? (
        <Box
          py={12}
          textAlign="center"
          borderRadius="16px"
          border="1px dashed"
          borderColor="border.subtle"
          bg="app.bg"
        >
          <Text fontSize="sm" fontWeight="600" color="text.primary">
            Select a membership type, then press Apply Filter
          </Text>
          <Text mt={1} fontSize="xs" color="text.secondary">
            Nothing is loaded until a filter is applied.
          </Text>
        </Box>
      ) : (
        <Box borderRadius="16px" border="1px solid" borderColor="border.subtle" overflow="hidden">
          <Flex
            px={{ base: 3, md: 4 }}
            py={3}
            align={{ base: "stretch", md: "center" }}
            justify="space-between"
            direction={{ base: "column", md: "row" }}
            gap={3}
            borderBottom="1px solid"
            borderColor="border.subtle"
            bg="app.bg"
          >
            <Flex align="center" gap={3} flexWrap="wrap">
              <Text fontSize="sm" fontWeight="700" color="text.primary">
                {memberPage?.total ?? 0} member{(memberPage?.total ?? 0) === 1 ? "" : "s"}
              </Text>
              <Text fontSize="xs" color="text.secondary">
                {selectedMemberIds.length} selected
              </Text>
            </Flex>

            <Flex position="relative" align="center" w={{ base: "full", md: "300px" }} ml={{ base: 0, md: "auto" }}>
              <Box position="absolute" left={3} color="gray.400" pointerEvents="none" display="flex">
                <Search size={15} />
              </Box>
              <Input
                value={searchTerm}
                onChange={(event) => handleSearchTermChange(event.target.value)}
                placeholder="Filter by name or email"
                minH="10"
                borderRadius="12px"
                bg="card.bg"
                pl={9}
                pr={3}
                fontSize="sm"
              />
            </Flex>
          </Flex>

          {memberOptionsQuery.isError ? (
            <Box p={4}>
              <Text fontSize="sm" fontWeight="700" color="red.700">
                {extractApiError(memberOptionsQuery.error)}
              </Text>
            </Box>
          ) : memberOptionsQuery.isLoading && !memberPage ? (
            <Box px={4} py={4}>
              <SkeletonText noOfLines={6} />
            </Box>
          ) : (
            <Box overflowX="auto">
              <Table.Root
                variant="line"
                size="sm"
                css={{ borderCollapse: "collapse", "& th, & td": { borderBottom: "1px solid", borderColor: "gray.200" } }}
              >
                <Table.Header>
                  <Table.Row bg="card.bg">
                    <Table.ColumnHeader px={4} py={3} w="56px">
                      <Checkbox.Root
                        checked={areAllVisibleSelected}
                        onCheckedChange={handleToggleAllVisible}
                        disabled={members.length === 0}
                        cursor={members.length === 0 ? "not-allowed" : "pointer"}
                        aria-label="Select all members on this page"
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                      </Checkbox.Root>
                    </Table.ColumnHeader>
                    <Table.ColumnHeader px={4} py={3}>
                      Member
                    </Table.ColumnHeader>
                    <Table.ColumnHeader px={4} py={3}>
                      Email
                    </Table.ColumnHeader>
                    <Table.ColumnHeader px={4} py={3}>
                      Membership Type
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {members.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={4} py={10}>
                        <Text fontSize="sm" color="text.secondary" textAlign="center">
                          {emptyMessage}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    members.map((member) => (
                      <Table.Row
                        key={member.memberUniqueId}
                        _hover={{ bg: "app.bg" }}
                        cursor="pointer"
                        onClick={() => onToggleMember(member.memberUniqueId)}
                      >
                        <Table.Cell px={4} py={3}>
                          <Checkbox.Root
                            checked={selectedMemberIds.includes(member.memberUniqueId)}
                            onCheckedChange={() => onToggleMember(member.memberUniqueId)}
                            cursor="pointer"
                            aria-label={`Select ${member.fullName}`}
                          >
                            <Checkbox.HiddenInput />
                            <Checkbox.Control />
                          </Checkbox.Root>
                        </Table.Cell>
                        <Table.Cell px={4} py={3}>
                          <Text fontSize="sm" fontWeight="600" color="text.primary" lineClamp={1}>
                            {member.fullName}
                          </Text>
                        </Table.Cell>
                        <Table.Cell px={4} py={3}>
                          <Text fontSize="sm" color="text.secondary" lineClamp={1}>
                            {member.email ?? "—"}
                          </Text>
                        </Table.Cell>
                        <Table.Cell px={4} py={3}>
                          <Text fontSize="sm" color="text.secondary" lineClamp={1}>
                            {member.membershipTypeName ?? "—"}
                          </Text>
                        </Table.Cell>
                      </Table.Row>
                    ))
                  )}
                </Table.Body>
              </Table.Root>
            </Box>
          )}

          <Flex
            px={{ base: 3, md: 4 }}
            py={3}
            align={{ base: "stretch", md: "center" }}
            justify="space-between"
            direction={{ base: "column", md: "row" }}
            gap={3}
            borderTop="1px solid"
            borderColor="border.subtle"
            bg="app.bg"
          >
            <Text fontSize="xs" color="text.secondary">
              Page {currentPage} of {Math.max(totalPages, 1)}
            </Text>

            {totalPages > 1 ? (
              <Flex gap={2} justify="flex-end">
                <Button
                  variant="outline"
                  size="sm"
                  borderRadius="10px"
                  cursor={currentPage <= 1 ? "not-allowed" : "pointer"}
                  disabled={currentPage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  borderRadius="10px"
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
    </Stack>
  )
}
