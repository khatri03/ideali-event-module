import { useState } from "react"
import { Box, Button, Checkbox, Flex, Menu, Portal, SkeletonText, Table, Text } from "@chakra-ui/react"
import { MoreHorizontal, Trash2 } from "lucide-react"
import { extractApiError } from "@/utils/errors"
import { useCustomListMembers } from "../hooks/useCustomLists"
import { CustomListMemberFilterBar } from "./CustomListMemberFilterBar"
import { MemberListPills } from "./MemberListPills"
import { SortableColumnHeader } from "./SortableColumnHeader"
import { RemoveMembersDialog } from "./RemoveMembersDialog"
import { TableBodySkeleton } from "./TableBodySkeleton"
import { STICKY_HEADER_CSS, TABLE_MAX_HEIGHT } from "../constants"
import { TablePagination } from "@/components/common"
import { PAGE_SIZE_OPTIONS } from "../constants"
import type {
  CustomListMember,
  CustomListMemberFilters,
  CustomListMemberSortBy,
  CustomListRef,
  CustomListSortOrder,
} from "@/api/customLists"

interface PendingRemoval {
  members: CustomListMember[]
  listUniqueId: string
  listName: string
}

const DEFAULT_FILTERS: CustomListMemberFilters = {
  searchTerm: "",
  membershipTypeUniqueIds: [],
  sortBy: "fullName",
  sortOrder: "asc",
}

interface CustomListMembersTableProps {
  customListUniqueId: string
  customListName: string
}

function formatAddedOn(value: string | null) {
  if (!value) {
    return "—"
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(parsed)
}

export function CustomListMembersTable({ customListUniqueId, customListName }: CustomListMembersTableProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0])
  const [draftSearchTerm, setDraftSearchTerm] = useState("")
  const [draftMembershipTypeIds, setDraftMembershipTypeIds] = useState<string[]>([])
  const [appliedFilters, setAppliedFilters] = useState<CustomListMemberFilters>(DEFAULT_FILTERS)
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<CustomListMember[]>([])

  const membersQuery = useCustomListMembers(customListUniqueId, appliedFilters, page, pageSize)

  const memberPage = membersQuery.data
  const members = memberPage?.items ?? []
  const totalPages = memberPage?.totalPages ?? 0
  const currentPage = memberPage?.page ?? page
  const sortBy = appliedFilters.sortBy
  const sortOrder = appliedFilters.sortOrder

  const hasAppliedFilter =
    appliedFilters.searchTerm.trim().length > 0 || appliedFilters.membershipTypeUniqueIds.length > 0

  function handleApplyFilters() {
    setAppliedFilters((current) => ({
      ...current,
      searchTerm: draftSearchTerm,
      membershipTypeUniqueIds: draftMembershipTypeIds,
    }))
    setPage(1)
  }

  function handleClearFilters() {
    setDraftSearchTerm("")
    setDraftMembershipTypeIds([])
    setAppliedFilters((current) => ({
      ...DEFAULT_FILTERS,
      sortBy: current.sortBy,
      sortOrder: current.sortOrder,
    }))
    setPage(1)
  }

  const isSorted = sortBy !== DEFAULT_FILTERS.sortBy || sortOrder !== DEFAULT_FILTERS.sortOrder
  const hasSelection = selectedMembers.length > 0
  const selectedMemberIds = selectedMembers.map((member) => member.memberUniqueId)
  const visibleMemberIds = members.map((member) => member.memberUniqueId)
  const areAllVisibleSelected =
    visibleMemberIds.length > 0 && visibleMemberIds.every((memberId) => selectedMemberIds.includes(memberId))

  function handleRemoveFromCurrentList(member: CustomListMember) {
    setPendingRemoval({ members: [member], listUniqueId: customListUniqueId, listName: customListName })
  }

  function handleRemoveFromOtherList(member: CustomListMember, list: CustomListRef) {
    setPendingRemoval({ members: [member], listUniqueId: list.uniqueId, listName: list.name })
  }

  function handleRemoveSelected() {
    if (selectedMembers.length === 0) {
      return
    }

    setPendingRemoval({
      members: selectedMembers,
      listUniqueId: customListUniqueId,
      listName: customListName,
    })
  }

  function handleToggleMember(member: CustomListMember) {
    setSelectedMembers((current) =>
      current.some((selected) => selected.memberUniqueId === member.memberUniqueId)
        ? current.filter((selected) => selected.memberUniqueId !== member.memberUniqueId)
        : [...current, member],
    )
  }

  function handleToggleAllVisible() {
    setSelectedMembers((current) => {
      if (areAllVisibleSelected) {
        return current.filter((selected) => !visibleMemberIds.includes(selected.memberUniqueId))
      }

      const additions = members.filter(
        (member) => !current.some((selected) => selected.memberUniqueId === member.memberUniqueId),
      )

      return [...current, ...additions]
    })
  }

  function handleRemoved(removedMemberIds: string[]) {
    setSelectedMembers((current) =>
      current.filter((selected) => !removedMemberIds.includes(selected.memberUniqueId)),
    )
  }

  function handleSortChange(nextSortBy: CustomListMemberSortBy) {
    setAppliedFilters((current) => {
      const nextSortOrder: CustomListSortOrder =
        current.sortBy === nextSortBy && current.sortOrder === "asc" ? "desc" : "asc"

      return { ...current, sortBy: nextSortBy, sortOrder: nextSortOrder }
    })
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

  return (
    <>
      <CustomListMemberFilterBar
        draftSearchTerm={draftSearchTerm}
        draftMembershipTypeIds={draftMembershipTypeIds}
        hasAppliedFilter={hasAppliedFilter}
        isSorted={isSorted}
        isApplying={membersQuery.isFetching}
        onSearchTermChange={setDraftSearchTerm}
        onMembershipTypeIdsChange={setDraftMembershipTypeIds}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        onClearSort={handleClearSort}
      />

      <Box borderRadius="16px" border="1px solid" borderColor="border.subtle" overflow="hidden">
        <Flex
          px={{ base: 3, md: 4 }}
          py={3}
          minH="64px"
          align={{ base: "stretch", md: "center" }}
          justify="space-between"
          direction={{ base: "column", md: "row" }}
          gap={3}
          borderBottom="1px solid"
          borderColor={hasSelection ? "brand.100" : "border.subtle"}
          bg={hasSelection ? "brand.50" : "app.bg"}
          transition="background-color 0.15s ease, border-color 0.15s ease"
        >
          {hasSelection ? (
            <Flex align="center" gap={2} flexWrap="wrap">
              <Text fontSize="sm" fontWeight="800" color="brand.600">
                {selectedMembers.length} selected
              </Text>
              <Button
                variant="plain"
                size="sm"
                h="32px"
                px={2}
                color="gray.600"
                cursor="pointer"
                _hover={{ bg: "brand.100" }}
                onClick={() => setSelectedMembers([])}
              >
                Clear
              </Button>
              <Button
                colorPalette="red"
                size="sm"
                h="32px"
                borderRadius="10px"
                px={3}
                cursor="pointer"
                onClick={handleRemoveSelected}
              >
                <Trash2 size={14} />
                Remove from list
              </Button>
            </Flex>
          ) : (
            <Text fontSize="sm" fontWeight="700" color="text.primary">
              {memberPage?.total ?? 0} member{(memberPage?.total ?? 0) === 1 ? "" : "s"}
            </Text>
          )}

        </Flex>

        {membersQuery.isError ? (
          <Box p={4}>
            <Text fontSize="sm" fontWeight="700" color="red.700">
              {extractApiError(membersQuery.error)}
            </Text>
          </Box>
        ) : membersQuery.isLoading && !memberPage ? (
          <Box px={4} py={4}>
            <SkeletonText noOfLines={6} />
          </Box>
        ) : (
          <Box overflow="auto" maxH={TABLE_MAX_HEIGHT}>
            <Table.Root
              variant="line"
              size="sm"
              css={{
                borderCollapse: "separate",
                borderSpacing: 0,
                "& th, & td": { borderBottom: "1px solid", borderColor: "gray.200" },
                ...STICKY_HEADER_CSS("card.bg"),
              }}
            >
              <Table.Header>
                <Table.Row bg="card.bg">
                  <Table.ColumnHeader px={4} py={3} w="52px">
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
                  <Table.ColumnHeader px={4} py={3} textAlign="center" w="90px">
                    Actions
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>
                    <SortableColumnHeader
                      label="Member"
                      column="fullName"
                      activeSortBy={sortBy}
                      activeSortOrder={sortOrder}
                      onSortChange={handleSortChange}
                    />
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>
                    <SortableColumnHeader
                      label="Email"
                      column="email"
                      activeSortBy={sortBy}
                      activeSortOrder={sortOrder}
                      onSortChange={handleSortChange}
                    />
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>
                    <SortableColumnHeader
                      label="Membership Type"
                      column="membershipTypeName"
                      activeSortBy={sortBy}
                      activeSortOrder={sortOrder}
                      onSortChange={handleSortChange}
                    />
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>
                    <SortableColumnHeader
                      label="Added"
                      column="addedOnUtc"
                      activeSortBy={sortBy}
                      activeSortOrder={sortOrder}
                      onSortChange={handleSortChange}
                    />
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3} minW="200px">
                    Also In
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              {membersQuery.isFetching ? (
                <TableBodySkeleton columns={7} rows={Math.max(members.length, 3)} />
              ) : (
              <Table.Body>
                {members.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={7} py={12}>
                      <Text fontSize="sm" color="text.secondary" textAlign="center">
                        {hasAppliedFilter
                          ? "No members match this filter."
                          : "This list has no members yet."}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  members.map((member) => (
                    <Table.Row
                      key={member.memberUniqueId}
                      _hover={{ bg: "app.bg" }}
                      bg={selectedMemberIds.includes(member.memberUniqueId) ? "brand.50" : undefined}
                    >
                      <Table.Cell px={4} py={3}>
                        <Checkbox.Root
                          checked={selectedMemberIds.includes(member.memberUniqueId)}
                          onCheckedChange={() => handleToggleMember(member)}
                          cursor="pointer"
                          aria-label={`Select ${member.fullName}`}
                        >
                          <Checkbox.HiddenInput />
                          <Checkbox.Control />
                        </Checkbox.Root>
                      </Table.Cell>
                      <Table.Cell px={4} py={3} textAlign="center">
                        <Menu.Root>
                          <Menu.Trigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              aria-label={`Actions for ${member.fullName}`}
                              title={`Actions for ${member.fullName}`}
                              borderRadius="full"
                              h="36px"
                              w="36px"
                              minW="36px"
                              p={0}
                              cursor="pointer"
                            >
                              <MoreHorizontal size={15} />
                            </Button>
                          </Menu.Trigger>
                          <Portal>
                            <Menu.Positioner>
                              <Menu.Content
                                minW="13rem"
                                borderRadius="14px"
                                border="1px solid"
                                borderColor="gray.200"
                                bg="white"
                                boxShadow="0 16px 40px rgba(15, 23, 42, 0.12)"
                                p={1}
                              >
                                <Menu.Item
                                  value={`remove-${member.memberUniqueId}`}
                                  onClick={() => handleRemoveFromCurrentList(member)}
                                  borderRadius="10px"
                                  fontSize="sm"
                                  fontWeight="600"
                                  color="red.600"
                                  px={3}
                                  py={2}
                                  cursor="pointer"
                                >
                                  <Trash2 size={14} />
                                  Remove from list
                                </Menu.Item>
                              </Menu.Content>
                            </Menu.Positioner>
                          </Portal>
                        </Menu.Root>
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
                      <Table.Cell px={4} py={3}>
                        <Text fontSize="sm" color="text.secondary">
                          {formatAddedOn(member.addedOnUtc)}
                        </Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        <MemberListPills
                          lists={member.otherLists}
                          onRemoveFromList={(list) => handleRemoveFromOtherList(member, list)}
                        />
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
              )}
            </Table.Root>
          </Box>
        )}

        <TablePagination
          page={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          total={memberPage?.total ?? 0}
          itemLabel="member"
          size="sm"
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </Box>

      {pendingRemoval ? (
        <RemoveMembersDialog
          customListUniqueId={pendingRemoval.listUniqueId}
          customListName={pendingRemoval.listName}
          members={pendingRemoval.members}
          onRemoved={handleRemoved}
          onClose={() => setPendingRemoval(null)}
        />
      ) : null}
    </>
  )
}
