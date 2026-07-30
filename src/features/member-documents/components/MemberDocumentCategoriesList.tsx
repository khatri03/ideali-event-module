import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  NativeSelect,
  SkeletonText,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react"
import { FolderOpen, Search } from "lucide-react"
import { useDebounce } from "@/hooks/useDebounce"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../constants"
import { useMemberDocumentCategories } from "../hooks/useMemberDocuments"

export function MemberDocumentCategoriesList() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const debouncedSearch = useDebounce(searchTerm, 300)

  const categoriesQuery = useMemberDocumentCategories(debouncedSearch, page, pageSize)
  const categoryPage = categoriesQuery.data
  const categories = categoryPage?.items ?? []
  const totalPages = categoryPage?.totalPages ?? 0

  function handleSearchChange(value: string) {
    setSearchTerm(value)
    setPage(1)
  }

  return (
    <Stack gap={5} w="full">
      <Box>
        <Heading fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" color="gray.900">
          Documents
        </Heading>
        <Text fontSize="sm" color="text.secondary" mt={1}>
          Browse the categories shared with you and open the files inside.
        </Text>
      </Box>

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
            placeholder="Search categories"
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
                  <Table.ColumnHeader px={4} py={3}>Category</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3} textAlign="right">Documents</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3} textAlign="right" w="110px">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {categories.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={3} py={12}>
                      <Flex justify="center" color="gray.400" mb={3}>
                        <FolderOpen size={26} />
                      </Flex>
                      <Text fontSize="sm" fontWeight="700" color="gray.900" textAlign="center">
                        {debouncedSearch ? "No categories match your search" : "No documents shared yet"}
                      </Text>
                      <Text fontSize="sm" color="text.secondary" textAlign="center" mt={1}>
                        {debouncedSearch
                          ? "Try a different search term."
                          : "When your organizer shares documents, they will appear here."}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  categories.map((category) => (
                    <Table.Row key={category.uniqueId} _hover={{ bg: "app.bg" }}>
                      <Table.Cell px={4} py={3}>
                        <Text
                          fontSize="sm"
                          fontWeight="600"
                          color="brand.600"
                          cursor="pointer"
                          lineClamp={1}
                          onClick={() => navigate(APP_ROUTES.memberDocuments.detail(category.uniqueId))}
                        >
                          {category.name}
                        </Text>
                        {category.description ? (
                          <Text fontSize="xs" color="text.secondary" lineClamp={1}>
                            {category.description}
                          </Text>
                        ) : null}
                      </Table.Cell>
                      <Table.Cell px={4} py={3} textAlign="right">
                        <Text fontSize="sm" color="text.secondary">{category.documentCount}</Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        <Flex justify="flex-end">
                          <Button
                            size="sm"
                            variant="outline"
                            borderRadius="10px"
                            minH="9"
                            px={4}
                            cursor="pointer"
                            onClick={() => navigate(APP_ROUTES.memberDocuments.detail(category.uniqueId))}
                          >
                            <FolderOpen size={14} />
                            Open
                          </Button>
                        </Flex>
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
    </Stack>
  )
}
