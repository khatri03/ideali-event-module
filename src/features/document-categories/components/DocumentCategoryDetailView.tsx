import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  SkeletonText,
  Stack,
  Table,
  Text,
  Wrap,
} from "@chakra-ui/react"
import { ArrowLeft, Download, Pencil, Trash2 } from "lucide-react"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import { ConfirmDialog } from "@/components/common"
import type { DocumentFile } from "@/api/documentCategories"
import { useDocumentCategory } from "../hooks/useDocumentCategories"
import {
  useDownloadDocument,
  useRemoveDocuments,
  useUploadDocuments,
} from "../hooks/useDocumentCategoryMutations"
import { DocumentUploadZone } from "./DocumentUploadZone"
import { formatDateTime, formatFileSize } from "../constants"

interface DocumentCategoryDetailViewProps {
  uniqueId: string
}

export function DocumentCategoryDetailView({ uniqueId }: DocumentCategoryDetailViewProps) {
  const navigate = useNavigate()
  const [pendingRemove, setPendingRemove] = useState<DocumentFile | null>(null)
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const [isConfirmingUpload, setIsConfirmingUpload] = useState(false)

  const categoryQuery = useDocumentCategory(uniqueId)
  const uploadMutation = useUploadDocuments()
  const removeMutation = useRemoveDocuments()
  const downloadMutation = useDownloadDocument()

  async function handleConfirmUpload() {
    if (stagedFiles.length === 0) {
      return
    }

    try {
      await uploadMutation.mutateAsync({ uniqueId, files: stagedFiles })
      // Cleared only on success, so a failed batch stays staged and can be retried as-is.
      setStagedFiles([])
    } catch {
      // The mutation hook already toasts the reason; the staged files remain for a retry.
    }

    setIsConfirmingUpload(false)
  }

  async function handleConfirmRemove() {
    if (!pendingRemove) {
      return
    }
    await removeMutation.mutateAsync({ uniqueId, documentUniqueIds: [pendingRemove.uniqueId] })
    setPendingRemove(null)
  }

  if (categoryQuery.isLoading) {
    return (
      <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" boxShadow="card" p={6}>
        <SkeletonText noOfLines={6} />
      </Box>
    )
  }

  if (categoryQuery.isError || !categoryQuery.data) {
    return (
      <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
        <Text fontSize="sm" fontWeight="700" color="red.700">
          {extractApiError(categoryQuery.error)}
        </Text>
      </Box>
    )
  }

  const category = categoryQuery.data
  const documents = category.documents

  return (
    <Stack gap={5} w="full">
      <Flex align="center" gap={3}>
        <Button
          variant="outline"
          borderRadius="14px"
          minH="11"
          px={4}
          cursor="pointer"
          onClick={() => navigate(APP_ROUTES.documentCategories.list)}
        >
          <ArrowLeft size={16} />
          Back to categories
        </Button>
      </Flex>

      <Box
        borderRadius="20px"
        border="1px solid"
        borderColor="border.subtle"
        bg="card.bg"
        boxShadow="card"
        p={{ base: 4, md: 6 }}
      >
        <Flex
          direction={{ base: "column", md: "row" }}
          align={{ base: "flex-start", md: "center" }}
          justify="space-between"
          gap={3}
        >
          <Box>
            <Heading fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" color="gray.900">
              {category.name}
            </Heading>
            {category.description ? (
              <Text fontSize="sm" color="text.secondary" mt={1}>
                {category.description}
              </Text>
            ) : null}
            <Wrap gap={1} mt={3}>
              {category.membershipTypeUniqueIds.length === 0 ? (
                <Badge colorPalette="green">Visible to all members</Badge>
              ) : (
                <Badge colorPalette="purple">
                  Restricted to {category.membershipTypeUniqueIds.length} membership type(s)
                </Badge>
              )}
              <Badge colorPalette={category.allowDownload ? "blue" : "orange"}>
                {category.allowDownload ? "Members can download" : "Members can view only"}
              </Badge>
            </Wrap>
          </Box>
          <Button
            variant="outline"
            borderRadius="14px"
            minH="11"
            px={4}
            w={{ base: "full", md: "auto" }}
            cursor="pointer"
            onClick={() => navigate(APP_ROUTES.documentCategories.edit(uniqueId))}
          >
            <Pencil size={16} />
            Edit category
          </Button>
        </Flex>
      </Box>

      <Box borderRadius="16px" border="1px solid" borderColor="border.subtle" overflow="hidden" bg="card.bg">
        <Box px={4} py={4} borderBottom="1px solid" borderColor="border.subtle">
          <Text fontSize="sm" fontWeight="700" color="gray.900" mb={3}>
            Documents ({documents.length})
          </Text>
          <DocumentUploadZone
            files={stagedFiles}
            onFilesChange={setStagedFiles}
            isUploading={uploadMutation.isPending}
            onUpload={() => setIsConfirmingUpload(true)}
          />
        </Box>

        <Box overflowX="auto">
          <Table.Root variant="line" size="sm">
            <Table.Header>
              <Table.Row bg="app.bg">
                <Table.ColumnHeader px={4} py={3}>File</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3} textAlign="right">Size</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3}>Uploaded</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3} textAlign="right" w="160px">Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {documents.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={4} py={12}>
                    <Text fontSize="sm" color="text.secondary" textAlign="center">
                      No documents yet. Upload one to share it with your members.
                    </Text>
                  </Table.Cell>
                </Table.Row>
              ) : (
                documents.map((document) => (
                  <Table.Row key={document.uniqueId} _hover={{ bg: "app.bg" }}>
                    <Table.Cell px={4} py={3}>
                      <Text fontSize="sm" fontWeight="600" color="gray.900" lineClamp={1}>
                        {document.fileName}
                      </Text>
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
                          cursor="pointer"
                          aria-label={`Download ${document.fileName}`}
                          onClick={() =>
                            downloadMutation.mutate({
                              documentUniqueId: document.uniqueId,
                              fileName: document.fileName,
                            })
                          }
                        >
                          <Download size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          borderRadius="10px"
                          minH="9"
                          colorPalette="red"
                          cursor="pointer"
                          aria-label={`Remove ${document.fileName}`}
                          onClick={() => setPendingRemove(document)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>

      {isConfirmingUpload ? (
        <ConfirmDialog
          title="Upload documents?"
          description={`${stagedFiles.length} file${stagedFiles.length === 1 ? "" : "s"} will be added to "${category.name}" and become available to ${
            category.membershipTypeUniqueIds.length === 0
              ? "every member of your organization"
              : `members of the ${category.membershipTypeUniqueIds.length} membership type${category.membershipTypeUniqueIds.length === 1 ? "" : "s"} this category is restricted to`
          }.`}
          confirmLabel="Upload"
          tone="primary"
          isPending={uploadMutation.isPending}
          onConfirm={() => void handleConfirmUpload()}
          onClose={() => {
            if (!uploadMutation.isPending) {
              setIsConfirmingUpload(false)
            }
          }}
        />
      ) : null}

      {pendingRemove ? (
        <ConfirmDialog
          title="Remove document?"
          description={`"${pendingRemove.fileName}" will no longer be available to members.`}
          confirmLabel="Remove"
          tone="destructive"
          isPending={removeMutation.isPending}
          onConfirm={() => void handleConfirmRemove()}
          onClose={() => setPendingRemove(null)}
        />
      ) : null}
    </Stack>
  )
}
