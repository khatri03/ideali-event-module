import { useState } from "react"
import { Box, Button, Checkbox, Flex, Input, Menu, Portal, SkeletonText, Table, Text } from "@chakra-ui/react"
import { ArrowDown, ArrowUp, ChevronsUpDown, MoreHorizontal, RotateCcw, Search, Trash2 } from "lucide-react"
import { useDebounce } from "@/hooks/useDebounce"
import { extractApiError } from "@/utils/errors"
import { useCustomListMembers } from "../hooks/useCustomLists"
import { MemberListPills } from "./MemberListPills"
import { RemoveMembersDialog } from "./RemoveMembersDialog"
import type {
  CustomListMember,
  CustomListMemberSortBy,
  CustomListRef,
  CustomListSortOrder,
} from "@/api/customLists"

interface PendingRemoval {
  members: CustomListMember[]
  listUniqueId: string
  listName: string
}

const MEMBER_PAGE_SIZE = 10
const DEFAULT_SORT_BY: CustomListMemberSortBy = "fullName"
const DEFAULT_SORT_ORDER: CustomListSortOrder = "asc"

interface CustomListMembersTableProps {
  customListUniqueId: string
  customListName: string
}

interface MemberSortableHeaderProps {
  label: string
  column: CustomListMemberSortBy
  activeSortBy: CustomListMemberSortBy
  activeSortOrder: CustomListSortOrder
  onSortChange: (sortBy: CustomListMemberSortBy) => void
}

function MemberSortableHeader({
  label,
  column,
  activeSortBy,
  activeSortOrder,
  onSortChange,
}: MemberSortableHeaderProps) {
  const isActive = activeSortBy === column

  return (
    <Button
      type="button"
      variant="plain"
      h="auto"
      p={0}
      w="full"
      fontSize="inherit"
      fontWeight="inherit"
      color={isActive ? "brand.600" : "inherit"}
      cursor="pointer"
      aria-sort={isActive ? (activeSortOrder === "asc" ? "ascending" : "descending") : "none"}
      title={`Sort by ${label}`}
      onClick={() => onSortChange(column)}
    >
      <Flex align="center" justify="flex-start" gap={1} w="full">
        {label}
        {isActive ? (
          activeSortOrder === "asc" ? (
            <ArrowUp size={13} />
          ) : (
            <ArrowDown size={13} />
          )
        ) : (
          <Box color="gray.400" display="flex">
            <ChevronsUpDown size={13} />
          </Box>
        )}
      </Flex>
    </Button>
  )
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
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<CustomListMemberSortBy>(DEFAULT_SORT_BY)
  const [sortOrder, setSortOrder] = useState<CustomListSortOrder>(DEFAULT_SORT_ORDER)
  const [page, setPage] = useState(1)
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<CustomListMember[]>([])
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const membersQuery = useCustomListMembers(
    customListUniqueId,
    { searchTerm: debouncedSearchTerm, sortBy, sortOrder },
    page,
    MEMBER_PAGE_SIZE,
  )

  const memberPage = membersQuery.data
  const members = memberPage?.items ?? []
  const totalPages = memberPage?.totalPages ?? 0
  const currentPage = memberPage?.page ?? page

  function handleSearchTermChange(value: string) {
    setSearchTerm(value)
    setPage(1)
  }

  const isSorted = sortBy !== DEFAULT_SORT_BY || sortOrder !== DEFAULT_SORT_ORDER
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
    setSortOrder((currentOrder) => (sortBy === nextSortBy && currentOrder === "asc" ? "desc" : "asc"))
    setSortBy(nextSortBy)
    setPage(1)
  }

  function handleClearSort() {
    setSortBy(DEFAULT_SORT_BY)
    setSortOrder(DEFAULT_SORT_ORDER)
    setPage(1)
  }

  return (
    <>
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

          <Flex align="center" gap={2} w={{ base: "full", md: "auto" }} ml={{ base: 0, md: "auto" }}>
            {isSorted ? (
              <Button
                variant="outline"
                size="sm"
                h="40px"
                px={3}
                borderRadius="12px"
                bg="card.bg"
                color="gray.600"
                cursor="pointer"
                flexShrink={0}
                title="Reset sorting to the default order"
                onClick={handleClearSort}
              >
                <RotateCcw size={14} />
                Clear Sort
              </Button>
            ) : null}

            <Flex position="relative" align="center" flex={1} w={{ base: "full", md: "300px" }}>
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
          <Box overflowX="auto">
            <Table.Root
              variant="line"
              size="sm"
              css={{ borderCollapse: "collapse", "& th, & td": { borderBottom: "1px solid", borderColor: "gray.200" } }}
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
                    <MemberSortableHeader
                      label="Member"
                      column="fullName"
                      activeSortBy={sortBy}
                      activeSortOrder={sortOrder}
                      onSortChange={handleSortChange}
                    />
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>
                    <MemberSortableHeader
                      label="Email"
                      column="email"
                      activeSortBy={sortBy}
                      activeSortOrder={sortOrder}
                      onSortChange={handleSortChange}
                    />
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>
                    <MemberSortableHeader
                      label="Membership Type"
                      column="membershipTypeName"
                      activeSortBy={sortBy}
                      activeSortOrder={sortOrder}
                      onSortChange={handleSortChange}
                    />
                  </Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>
                    <MemberSortableHeader
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
              <Table.Body>
                {members.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={7} py={12}>
                      <Text fontSize="sm" color="text.secondary" textAlign="center">
                        {debouncedSearchTerm.trim()
                          ? "No members match this search."
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
