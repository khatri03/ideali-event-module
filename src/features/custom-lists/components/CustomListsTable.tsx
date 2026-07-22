import { Box, Button, Flex, Menu, Portal, Table, Text } from "@chakra-ui/react"
import { ArrowDown, ArrowUp, ChevronsUpDown, MoreHorizontal, PencilLine, Plus, Trash2 } from "lucide-react"
import type { CustomListItem, CustomListSortBy, CustomListSortOrder } from "@/api/customLists"

interface CustomListsTableProps {
  customLists: CustomListItem[]
  sortBy: CustomListSortBy
  sortOrder: CustomListSortOrder
  onSortChange: (sortBy: CustomListSortBy) => void
  onCreate: () => void
  onEdit: (customList: CustomListItem) => void
  onDelete: (customList: CustomListItem) => void
}

interface SortableHeaderProps {
  label: string
  column: CustomListSortBy
  activeSortBy: CustomListSortBy
  activeSortOrder: CustomListSortOrder
  onSortChange: (sortBy: CustomListSortBy) => void
  justify?: "flex-start" | "center"
}

function SortableHeader({
  label,
  column,
  activeSortBy,
  activeSortOrder,
  onSortChange,
  justify = "flex-start",
}: SortableHeaderProps) {
  const isActive = activeSortBy === column
  const ariaSort = isActive ? (activeSortOrder === "asc" ? "ascending" : "descending") : "none"

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
      aria-sort={ariaSort}
      title={`Sort by ${label}`}
      onClick={() => onSortChange(column)}
    >
      <Flex align="center" justify={justify} gap={1} w="full">
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

function formatCreatedOn(value: string) {
  if (!value) {
    return "—"
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(parsed)
}

export function CustomListsTable({
  customLists,
  sortBy,
  sortOrder,
  onSortChange,
  onCreate,
  onEdit,
  onDelete,
}: CustomListsTableProps) {
  return (
    <Box overflowX="auto">
      <Table.Root
        variant="line"
        size="sm"
        css={{
          borderCollapse: "collapse",
          "& th, & td": { border: "1px solid", borderColor: "gray.300" },
        }}
      >
        <Table.Header>
          <Table.Row bg="app.bg">
            <Table.ColumnHeader px={4} py={3} textAlign="center">
              Actions
            </Table.ColumnHeader>
            <Table.ColumnHeader px={6} py={3}>
              <SortableHeader
                label="List Name"
                column="name"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSortChange={onSortChange}
              />
            </Table.ColumnHeader>
            <Table.ColumnHeader px={4} py={3}>
              <SortableHeader
                label="Members"
                column="memberCount"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSortChange={onSortChange}
                justify="center"
              />
            </Table.ColumnHeader>
            <Table.ColumnHeader px={4} py={3}>
              <SortableHeader
                label="Created"
                column="createdOnUtc"
                activeSortBy={sortBy}
                activeSortOrder={sortOrder}
                onSortChange={onSortChange}
                justify="center"
              />
            </Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {customLists.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={4} py={14}>
                <Box textAlign="center">
                  <Text fontSize="lg" fontWeight="700" color="gray.900">
                    No custom lists yet
                  </Text>
                  <Text mt={2} fontSize="sm" color="gray.600">
                    Group members into a named list you can reuse later.
                  </Text>
                  <Button
                    mt={5}
                    px={6}
                    py={3}
                    minH="11"
                    borderRadius="14px"
                    display="inline-flex"
                    alignItems="center"
                    justifyContent="center"
                    gap={2}
                    cursor="pointer"
                    onClick={onCreate}
                  >
                    <Plus size={16} />
                    Create custom list
                  </Button>
                </Box>
              </Table.Cell>
            </Table.Row>
          ) : (
            customLists.map((customList) => (
              <Table.Row key={customList.uniqueId} _hover={{ bg: "app.bg" }} transition="background 0.15s">
                <Table.Cell px={4} py={4} textAlign="center">
                  <Menu.Root>
                    <Menu.Trigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        aria-label={`Actions for ${customList.name}`}
                        title={`Actions for ${customList.name}`}
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
                            value={`edit-${customList.uniqueId}`}
                            onClick={() => onEdit(customList)}
                            borderRadius="10px"
                            fontSize="sm"
                            fontWeight="600"
                            color="gray.700"
                            px={3}
                            py={2}
                            cursor="pointer"
                          >
                            <PencilLine size={14} />
                            Edit list
                          </Menu.Item>
                          <Menu.Item
                            value={`delete-${customList.uniqueId}`}
                            onClick={() => onDelete(customList)}
                            borderRadius="10px"
                            fontSize="sm"
                            fontWeight="600"
                            color="red.600"
                            px={3}
                            py={2}
                            cursor="pointer"
                          >
                            <Trash2 size={14} />
                            Delete
                          </Menu.Item>
                        </Menu.Content>
                      </Menu.Positioner>
                    </Portal>
                  </Menu.Root>
                </Table.Cell>
                <Table.Cell px={6} py={4}>
                  <Button
                    type="button"
                    variant="plain"
                    h="auto"
                    p={0}
                    fontSize="sm"
                    fontWeight="700"
                    color="brand.600"
                    cursor="pointer"
                    justifyContent="flex-start"
                    _hover={{ textDecoration: "underline" }}
                    onClick={() => onEdit(customList)}
                  >
                    {customList.name}
                  </Button>
                </Table.Cell>
                <Table.Cell px={4} py={4} textAlign="center">
                  <Text fontSize="sm" color="text.primary">
                    {customList.memberCount}
                  </Text>
                </Table.Cell>
                <Table.Cell px={4} py={4} textAlign="center">
                  <Text fontSize="sm" color="text.secondary">
                    {formatCreatedOn(customList.createdOnUtc)}
                  </Text>
                </Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}
