import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Badge,
  Box,
  Button,
  Flex,
  Input,
  Menu,
  NativeSelect,
  Portal,
  SkeletonText,
  Stack,
  Table,
  Text,
  Wrap,
} from "@chakra-ui/react"
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { useDebounce } from "@/hooks/useDebounce"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import { ConfirmDialog } from "@/features/custom-lists"
import type { DocumentCategoryFilters, DocumentCategoryListItem } from "@/api/documentCategories"
import { useDocumentCategories } from "../hooks/useDocumentCategories"
import { useDeleteDocumentCategory } from "../hooks/useDocumentCategoryMutations"
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, formatDateTime } from "../constants"

const DEFAULT_FILTERS: DocumentCategoryFilters = {
  searchTerm: "",
  sortBy: "name",
  sortOrder: "asc",
}

export function DocumentCategoriesManager() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [pendingDelete, setPendingDelete] = useState<DocumentCategoryListItem | null>(null)
  const debouncedSearch = useDebounce(searchTerm, 300)

  const deleteMutation = useDeleteDocumentCategory()
  const categoriesQuery = useDocumentCategories(
    { ...DEFAULT_FILTERS, searchTerm: debouncedSearch },
    page,
    pageSize,
  )

  const categoryPage = categoriesQuery.data
  const categories = categoryPage?.items ?? []
  const totalPages = categoryPage?.totalPages ?? 0

  function handleSearchChange(value: string) {
    setSearchTerm(value)
    setPage(1)
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) {
      return
    }
    await deleteMutation.mutateAsync(pendingDelete.uniqueId)
    setPendingDelete(null)
  }

  return (
    <Stack gap={5}>
      <Flex justify="space-between" align="center" gap={3} direction={{ base: "column", md: "row" }}>
        <Box>
          <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" color="gray.900">
            Document Categories
          </Text>
          <Text fontSize="sm" color="text.secondary">
            Share downloadable documents with your members.
          </Text>
        </Box>
        <Button
          w={{ base: "full", md: "auto" }}
          minH="11"
          px={6}
          borderRadius="14px"
          fontWeight="700"
          color="white"
          cursor="pointer"
          onClick={() => navigate(APP_ROUTES.documentCategories.create)}
          style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
        >
          <Plus size={16} />
          New category
        </Button>
      </Flex>

      <Flex
        gap={3}
        direction={{ base: "column", md: "row" }}
        borderRadius="16px"
        border="1px solid"
        borderColor="border.subtle"
        bg="card.bg"
        p={4}
      >
        <Flex position="relative" align="center" flex={1}>
          <Box position="absolute" left={4} color="gray.400" pointerEvents="none" display="flex">
            <Search size={16} />
          </Box>
          <Input
            value={searchTerm}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search by name"
            minH="11"
            borderRadius="14px"
            pl={10}
            pr={4}
          />
        </Flex>
      </Flex>

      {categoriesQuery.isError ? (
        <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
          <Text fontSize="sm" fontWeight="700" color="red.700">
            {extractApiError(categoriesQuery.error)}
          </Text>
        </Box>
      ) : null}

      <Box borderRadius="16px" border="1px solid" borderColor="border.subtle" overflow="hidden" bg="card.bg">
        {categoriesQuery.isLoading && !categoryPage ? (
          <Box px={4} py={4}>
            <SkeletonText noOfLines={6} />
          </Box>
        ) : (
          <Box overflowX="auto">
            <Table.Root variant="line" size="sm">
              <Table.Header>
                <Table.Row bg="app.bg">
                  <Table.ColumnHeader px={4} py={3} textAlign="center" w="70px">Actions</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>Name</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>Visible to</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>Access</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3} textAlign="right">Documents</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>Created</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {categories.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={6} py={12}>
                      <Text fontSize="sm" color="text.secondary" textAlign="center">
                        No document categories yet.
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  categories.map((category) => (
                    <Table.Row key={category.uniqueId} _hover={{ bg: "app.bg" }}>
                      <Table.Cell px={4} py={3} textAlign="center">
                        <Menu.Root>
                          <Menu.Trigger asChild>
                            <Button
                              variant="outline"
                              borderRadius="full"
                              h="34px"
                              w="34px"
                              minW="34px"
                              p={0}
                              cursor="pointer"
                              aria-label={`Actions for ${category.name}`}
                            >
                              <MoreHorizontal size={15} />
                            </Button>
                          </Menu.Trigger>
                          <Portal>
                            <Menu.Positioner>
                              <Menu.Content borderRadius="12px" p={1}>
                                <Menu.Item
                                  value="view"
                                  onClick={() => navigate(APP_ROUTES.documentCategories.detail(category.uniqueId))}
                                  cursor="pointer"
                                  px={3}
                                  py={2}
                                  borderRadius="8px"
                                >
                                  Manage documents
                                </Menu.Item>
                                <Menu.Item
                                  value="edit"
                                  onClick={() => navigate(APP_ROUTES.documentCategories.edit(category.uniqueId))}
                                  cursor="pointer"
                                  px={3}
                                  py={2}
                                  borderRadius="8px"
                                >
                                  <Pencil size={14} />
                                  Edit
                                </Menu.Item>
                                <Menu.Item
                                  value="delete"
                                  onClick={() => setPendingDelete(category)}
                                  color="red.600"
                                  cursor="pointer"
                                  px={3}
                                  py={2}
                                  borderRadius="8px"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </Menu.Item>
                              </Menu.Content>
                            </Menu.Positioner>
                          </Portal>
                        </Menu.Root>
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        <Text
                          fontSize="sm"
                          fontWeight="600"
                          color="brand.600"
                          cursor="pointer"
                          lineClamp={1}
                          onClick={() => navigate(APP_ROUTES.documentCategories.detail(category.uniqueId))}
                        >
                          {category.name}
                        </Text>
                        {category.description ? (
                          <Text fontSize="xs" color="text.secondary" lineClamp={1}>
                            {category.description}
                          </Text>
                        ) : null}
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        {category.membershipTypeNames.length === 0 ? (
                          <Badge colorPalette="green">All members</Badge>
                        ) : (
                          <Wrap gap={1}>
                            {category.membershipTypeNames.map((name) => (
                              <Badge key={name} colorPalette="purple">
                                {name}
                              </Badge>
                            ))}
                          </Wrap>
                        )}
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        <Badge colorPalette={category.allowDownload ? "blue" : "orange"}>
                          {category.allowDownload ? "View + download" : "View only"}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell px={4} py={3} textAlign="right">
                        <Text fontSize="sm" color="text.secondary">{category.documentCount}</Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        <Text fontSize="sm" color="text.secondary">{formatDateTime(category.createdOnUtc)}</Text>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table.Root>
          </Box>
        )}

        <Flex
          px={4}
          py={3}
          align="center"
          justify="space-between"
          borderTop="1px solid"
          borderColor="border.subtle"
          direction={{ base: "column", sm: "row" }}
          gap={3}
        >
          <Flex align="center" gap={2}>
            <Text fontSize="xs" color="text.secondary">Rows</Text>
            <NativeSelect.Root size="sm" w="80px">
              <NativeSelect.Field
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setPage(1)
                }}
                borderRadius="10px"
                ps={3}
                pe={7}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Flex>

          <Flex align="center" gap={3}>
            <Text fontSize="xs" color="text.secondary">
              Page {categoryPage?.page ?? page} of {Math.max(totalPages, 1)}
            </Text>
            <Button
              size="sm"
              variant="outline"
              borderRadius="10px"
              disabled={page <= 1}
              cursor={page <= 1 ? "not-allowed" : "pointer"}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              borderRadius="10px"
              disabled={page >= totalPages}
              cursor={page >= totalPages ? "not-allowed" : "pointer"}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </Flex>
        </Flex>
      </Box>

      {pendingDelete ? (
        <ConfirmDialog
          title="Delete category?"
          description={`"${pendingDelete.name}" and its ${pendingDelete.documentCount} document(s) will no longer be available to members.`}
          confirmLabel="Delete"
          tone="destructive"
          isPending={deleteMutation.isPending}
          onConfirm={() => void handleConfirmDelete()}
          onClose={() => setPendingDelete(null)}
        />
      ) : null}
    </Stack>
  )
}
