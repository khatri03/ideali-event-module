import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Button,
  Flex,
  Heading,
  NativeSelect,
  SkeletonText,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react"
import { ArrowLeft, Download, Eye, FileText } from "lucide-react"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import { formatDateTime, formatFileSize } from "@/features/document-categories"
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../constants"
import {
  useDownloadMemberDocument,
  useMemberDocumentCategory,
  useMemberDocuments,
  useViewMemberDocument,
} from "../hooks/useMemberDocuments"

interface MemberDocumentCategoryViewProps {
  uniqueId: string
}

/** Read-only: view and download are the only actions a member has over a shared document. */
export function MemberDocumentCategoryView({ uniqueId }: MemberDocumentCategoryViewProps) {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)

  const categoryQuery = useMemberDocumentCategory(uniqueId)
  const documentsQuery = useMemberDocuments(uniqueId, page, pageSize)
  const viewMutation = useViewMemberDocument()
  const downloadMutation = useDownloadMemberDocument()

  const documentPage = documentsQuery.data
  const documents = documentPage?.items ?? []
  const totalPages = documentPage?.totalPages ?? 0

  if (categoryQuery.isLoading) {
    return (
      <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" p={6}>
        <SkeletonText noOfLines={6} />
      </Box>
    )
  }

  if (categoryQuery.isError || !categoryQuery.data) {
    return (
      <Stack gap={4}>
        <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
          <Text fontSize="sm" fontWeight="700" color="red.700">
            {extractApiError(categoryQuery.error)}
          </Text>
        </Box>
        <Button
          variant="outline"
          borderRadius="14px"
          minH="11"
          px={4}
          w="fit-content"
          cursor="pointer"
          onClick={() => navigate(APP_ROUTES.memberDocuments.list)}
        >
          <ArrowLeft size={16} />
          Back to documents
        </Button>
      </Stack>
    )
  }

  const category = categoryQuery.data

  return (
    <Stack gap={5} w="full">
      <Flex align="center" gap={3}>
        <Button
          variant="outline"
          borderRadius="14px"
          minH="11"
          px={4}
          cursor="pointer"
          onClick={() => navigate(APP_ROUTES.memberDocuments.list)}
        >
          <ArrowLeft size={16} />
          Back to documents
        </Button>
      </Flex>

      <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" p={{ base: 4, md: 6 }}>
        <Heading fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" color="gray.900">
          {category.name}
        </Heading>
        {category.description ? (
          <Text fontSize="sm" color="text.secondary" mt={1}>
            {category.description}
          </Text>
        ) : null}
      </Box>

      {documentsQuery.isError ? (
        <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
          <Text fontSize="sm" fontWeight="700" color="red.700">
            {extractApiError(documentsQuery.error)}
          </Text>
        </Box>
      ) : null}

      <Box borderRadius="16px" border="1px solid" borderColor="border.subtle" overflow="hidden" bg="card.bg">
        {documentsQuery.isLoading && !documentPage ? (
          <Box px={4} py={4}>
            <SkeletonText noOfLines={6} />
          </Box>
        ) : (
          <Box overflowX="auto">
            <Table.Root variant="line" size="sm">
              <Table.Header>
                <Table.Row bg="app.bg">
                  <Table.ColumnHeader px={4} py={3}>File</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3} textAlign="right">Size</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>Uploaded</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3} textAlign="right" w="200px">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {documents.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={4} py={12}>
                      <Flex justify="center" color="gray.400" mb={3}>
                        <FileText size={26} />
                      </Flex>
                      <Text fontSize="sm" fontWeight="700" color="gray.900" textAlign="center">
                        No documents in this category
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  documents.map((document) => (
                    <Table.Row key={document.uniqueId} _hover={{ bg: "app.bg" }}>
                      <Table.Cell px={4} py={3}>
                        <Flex align="center" gap={3} minW={0}>
                          <Box color="brand.600" flexShrink={0} display="flex">
                            <FileText size={16} />
                          </Box>
                          <Text fontSize="sm" fontWeight="600" color="gray.900" lineClamp={1}>
                            {document.fileName}
                          </Text>
                        </Flex>
                      </Table.Cell>
                      <Table.Cell px={4} py={3} textAlign="right">
                        <Text fontSize="sm" color="text.secondary">{formatFileSize(document.fileSize)}</Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        <Text fontSize="sm" color="text.secondary">{formatDateTime(document.uploadedOnUtc)}</Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        <Flex justify="flex-end" gap={2}>
                          <Button
                            size="sm"
                            variant="outline"
                            borderRadius="10px"
                            minH="9"
                            px={3}
                            cursor="pointer"
                            // Scoped to this row: the mutation is shared, so isPending alone would spin
                            // every button in the table.
                            loading={viewMutation.isPending && viewMutation.variables === document.uniqueId}
                            onClick={() => viewMutation.mutate(document.uniqueId)}
                          >
                            <Eye size={14} />
                            View
                          </Button>
                          {category.allowDownload ? (
                            <Button
                              size="sm"
                              borderRadius="10px"
                              minH="9"
                              px={3}
                              color="white"
                              cursor="pointer"
                              loading={
                                downloadMutation.isPending &&
                                downloadMutation.variables?.documentUniqueId === document.uniqueId
                              }
                              onClick={() =>
                                downloadMutation.mutate({
                                  documentUniqueId: document.uniqueId,
                                  fileName: document.fileName,
                                })
                              }
                              style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                            >
                              <Download size={14} />
                              Download
                            </Button>
                          ) : null}
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
              Page {documentPage?.page ?? page} of {Math.max(totalPages, 1)}
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
