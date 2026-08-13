import { useState } from "react"
import { Box, Input, InputGroup, Stack, Text } from "@chakra-ui/react"
import { Search } from "lucide-react"
import { TablePagination } from "@/components/common"
import { useDebounce } from "@/hooks/useDebounce"
import { extractApiError } from "@/utils/errors"
import { DEFAULT_PAGE_SIZE } from "../constants"
import { useReportTemplates } from "../hooks/useCustomFormReports"
import { DeleteReportTemplateDialog } from "./DeleteReportTemplateDialog"
import { ReportTemplatesTable } from "./ReportTemplatesTable"
import { ReportTemplatesTableSkeleton } from "./ReportTemplatesTable.skeleton"
import type { ReportTemplateListItem } from "@/api/customFormReports"

export function ReportTemplatesManager() {
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [deletingTemplate, setDeletingTemplate] = useState<ReportTemplateListItem | null>(null)

  const debouncedSearchTerm = useDebounce(searchTerm)
  const templatesQuery = useReportTemplates(debouncedSearchTerm, page, pageSize)
  const templatesPage = templatesQuery.data

  function handleSearchTermChange(nextSearchTerm: string) {
    setSearchTerm(nextSearchTerm)
    setPage(1)
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize)
    setPage(1)
  }

  return (
    <Stack gap={5}>
      <Box
        border="1px solid"
        borderColor="border.subtle"
        borderRadius="20px"
        bg="card.bg"
        boxShadow="card"
        p={{ base: 4, md: 5 }}
      >
        <InputGroup startElement={<Search size={16} color="#718096" />} maxW={{ base: "full", md: "360px" }}>
          <Input
            value={searchTerm}
            onChange={(event) => handleSearchTermChange(event.target.value)}
            placeholder="Search templates by name"
            aria-label="Search templates by name"
            h="44px"
            pl="2.5rem"
            borderRadius="14px"
          />
        </InputGroup>
      </Box>

      {templatesQuery.isError ? (
        <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
          <Text fontSize="sm" fontWeight="700" color="red.700">
            {extractApiError(templatesQuery.error)}
          </Text>
        </Box>
      ) : null}

      {templatesQuery.isLoading && !templatesPage ? (
        <ReportTemplatesTableSkeleton />
      ) : (
        <Box
          borderRadius="20px"
          border="1px solid"
          borderColor="border.subtle"
          bg="card.bg"
          boxShadow="card"
          overflow="hidden"
        >
          <ReportTemplatesTable
            templates={templatesPage?.items ?? []}
            isFetching={templatesQuery.isFetching}
            onDelete={setDeletingTemplate}
          />

          <TablePagination
            page={templatesPage?.page ?? page}
            pageSize={pageSize}
            totalPages={templatesPage?.totalPages ?? 0}
            total={templatesPage?.total ?? 0}
            itemLabel="template"
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </Box>
      )}

      {deletingTemplate ? (
        <DeleteReportTemplateDialog template={deletingTemplate} onClose={() => setDeletingTemplate(null)} />
      ) : null}
    </Stack>
  )
}
