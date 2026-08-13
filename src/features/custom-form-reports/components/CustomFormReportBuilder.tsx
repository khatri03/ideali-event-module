import { useRef, useState } from "react"
import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react"
import { PencilLine, Play, Save } from "lucide-react"
import { TablePagination } from "@/components/common"
import { extractApiError } from "@/utils/errors"
import { DEFAULT_PAGE_SIZE } from "../constants"
import {
  useCustomFormReport,
  useReportColumns,
  useReportEntities,
  useReportForms,
  useReportModules,
  useReportTemplate,
  useReportTemplateOptions,
} from "../hooks/useCustomFormReports"
import { REPORT_FILTER_OPERATOR, REPORT_SYSTEM_FIELD, type ReportFilter } from "@/api/customFormReports"
import {
  filterDraftError,
  nextReportSort,
  systemFieldTarget,
  toReportFilters,
  toReportSortRequest,
  type ReportFilterDraft,
  type ReportSort,
} from "../schemas/customFormReport.schemas"
import { ReportColumnPicker } from "./ReportColumnPicker"
import { ReportFilterPanel } from "./ReportFilterPanel"
import { ReportResultsTable } from "./ReportResultsTable"
import { ReportResultsTableSkeleton } from "./ReportResultsTable.skeleton"
import { ReportSourcePicker } from "./ReportSourcePicker"
import { SaveReportTemplateDialog } from "./SaveReportTemplateDialog"

interface AppliedReport {
  moduleId: number
  entityUniqueId: string
  formUniqueId: string
  fieldUniqueIds: string[]
  filters: ReportFilter[]
}

export function CustomFormReportBuilder() {
  const [moduleId, setModuleId] = useState<number | null>(null)
  const [entityUniqueId, setEntityUniqueId] = useState<string | null>(null)
  const [formUniqueId, setFormUniqueId] = useState<string | null>(null)
  const [templateUniqueId, setTemplateUniqueId] = useState<string | null>(null)
  // Null means "whatever the chosen template says"; any edit turns it into an explicit choice.
  const [fieldSelection, setFieldSelection] = useState<string[] | null>(null)
  const [filterDrafts, setFilterDrafts] = useState<ReportFilterDraft[]>([])
  const [appliedReport, setAppliedReport] = useState<AppliedReport | null>(null)
  const [sort, setSort] = useState<ReportSort | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [isEditingTemplate, setIsEditingTemplate] = useState(false)
  const nextFilterId = useRef(0)

  const modulesQuery = useReportModules()
  const entitiesQuery = useReportEntities(moduleId)
  const formsQuery = useReportForms(moduleId, entityUniqueId)
  const columnsQuery = useReportColumns(formUniqueId)
  const templateOptionsQuery = useReportTemplateOptions(moduleId, formUniqueId)
  const templateQuery = useReportTemplate(templateUniqueId)
  const reportQuery = useCustomFormReport(
    appliedReport ? { ...appliedReport, ...toReportSortRequest(sort), pageNo: page, pageSize } : null,
  )

  const fields = columnsQuery.data?.fields ?? []
  const maxColumns = columnsQuery.data?.maxColumns ?? 0
  const template = templateQuery.data
  const templateFieldIds = template?.columns.map((column) => column.uniqueId) ?? []
  const selectedFieldIds = fieldSelection ?? templateFieldIds
  const hasIncompleteFilter = filterDrafts.some((draft) => filterDraftError(draft) !== null)
  const canApply =
    moduleId !== null &&
    entityUniqueId !== null &&
    formUniqueId !== null &&
    selectedFieldIds.length > 0 &&
    !hasIncompleteFilter

  function handleModuleChange(nextModuleId: number) {
    setModuleId(nextModuleId)
    setEntityUniqueId(null)
    setFormUniqueId(null)
    resetSelection()
  }

  function handleEntityChange(nextEntityUniqueId: string) {
    setEntityUniqueId(nextEntityUniqueId)
    setFormUniqueId(null)
    resetSelection()
  }

  function handleFormChange(nextFormUniqueId: string) {
    setFormUniqueId(nextFormUniqueId)
    resetSelection()
  }

  /** Columns, filters and the sort all name fields of one form, so a different form invalidates each of them. */
  function resetSelection() {
    setTemplateUniqueId(null)
    setFieldSelection(null)
    setFilterDrafts([])
    setAppliedReport(null)
    setSort(null)
  }

  function handleSort(target: string) {
    setSort(nextReportSort(sort, target))
    setPage(1)
  }

  function handleAddFilter() {
    nextFilterId.current += 1

    setFilterDrafts([
      ...filterDrafts,
      {
        id: `filter-${nextFilterId.current}`,
        target: systemFieldTarget(REPORT_SYSTEM_FIELD.invoiceNo),
        operator: REPORT_FILTER_OPERATOR.contains,
        value: "",
      },
    ])
  }

  function handleChangeFilter(changed: ReportFilterDraft) {
    setFilterDrafts(filterDrafts.map((draft) => (draft.id === changed.id ? changed : draft)))
  }

  function handleRemoveFilter(draftId: string) {
    setFilterDrafts(filterDrafts.filter((draft) => draft.id !== draftId))
  }

  function handleToggleField(fieldUniqueId: string) {
    if (selectedFieldIds.includes(fieldUniqueId)) {
      setFieldSelection(selectedFieldIds.filter((id) => id !== fieldUniqueId))

      // The report can only be ordered by a column it still shows.
      if (sort?.target === fieldUniqueId) {
        setSort(null)
      }

      return
    }

    if (selectedFieldIds.length >= maxColumns) {
      return
    }

    setFieldSelection([...selectedFieldIds, fieldUniqueId])
  }

  function handleTemplateChange(nextTemplateUniqueId: string | null) {
    setTemplateUniqueId(nextTemplateUniqueId)
    setFieldSelection(null)
    setAppliedReport(null)
    setSort(null)
  }

  function handleApply() {
    if (!canApply) {
      return
    }

    setAppliedReport({
      moduleId: moduleId as number,
      entityUniqueId: entityUniqueId as string,
      formUniqueId: formUniqueId as string,
      fieldUniqueIds: selectedFieldIds,
      filters: toReportFilters(filterDrafts),
    })
    setPage(1)
  }

  function handleTemplateSaved(savedTemplateUniqueId: string) {
    setTemplateUniqueId(savedTemplateUniqueId)
    setFieldSelection(null)
  }

  function openTemplateDialog(editing: boolean) {
    setIsEditingTemplate(editing)
    setIsTemplateDialogOpen(true)
  }

  const selectedFields = fields.filter((field) => selectedFieldIds.includes(field.uniqueId))
  const templateColumnHeadings = Object.fromEntries(
    (template?.columns ?? [])
      .filter((column) => column.columnLabel !== null)
      .map((column) => [column.uniqueId, column.columnLabel as string]),
  )
  // The report answers with the fields' own labels; the template is what knows they were renamed.
  const reportColumns = (reportQuery.data?.columns ?? []).map((column) => ({
    ...column,
    columnLabel: templateColumnHeadings[column.uniqueId] ?? null,
  }))
  const reportError = reportQuery.isError ? extractApiError(reportQuery.error) : null
  const columnsError = columnsQuery.isError ? extractApiError(columnsQuery.error) : null

  return (
    <Stack gap={5}>
      <ReportSourcePicker
        modules={modulesQuery.data ?? []}
        entities={entitiesQuery.data ?? []}
        forms={formsQuery.data ?? []}
        templates={templateOptionsQuery.data ?? []}
        moduleId={moduleId}
        entityUniqueId={entityUniqueId}
        formUniqueId={formUniqueId}
        templateUniqueId={templateUniqueId}
        isLoadingModules={modulesQuery.isLoading}
        isLoadingEntities={entitiesQuery.isLoading}
        isLoadingForms={formsQuery.isLoading}
        isLoadingTemplates={templateOptionsQuery.isLoading}
        onModuleChange={handleModuleChange}
        onEntityChange={handleEntityChange}
        onFormChange={handleFormChange}
        onTemplateChange={handleTemplateChange}
      />

      {columnsError ? (
        <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
          <Text fontSize="sm" fontWeight="700" color="red.700">
            {columnsError}
          </Text>
        </Box>
      ) : null}

      {formUniqueId ? (
        <ReportColumnPicker
          fields={fields}
          selectedFieldIds={selectedFieldIds}
          maxColumns={maxColumns}
          isLoading={columnsQuery.isLoading}
          onToggleField={handleToggleField}
          onClearFields={() => setFieldSelection([])}
        />
      ) : null}

      {formUniqueId ? (
        <ReportFilterPanel
          fields={fields}
          drafts={filterDrafts}
          onAddFilter={handleAddFilter}
          onChangeFilter={handleChangeFilter}
          onRemoveFilter={handleRemoveFilter}
        />
      ) : null}

      <Flex direction={{ base: "column", md: "row" }} justify="flex-end" gap={3}>
        {templateUniqueId ? (
          <Button
            variant="outline"
            borderRadius="14px"
            h="44px"
            px={6}
            w={{ base: "full", md: "auto" }}
            cursor={selectedFields.length === 0 ? "not-allowed" : "pointer"}
            disabled={selectedFields.length === 0}
            onClick={() => openTemplateDialog(true)}
          >
            <PencilLine size={16} />
            Edit template
          </Button>
        ) : null}

        <Button
          variant="outline"
          borderRadius="14px"
          h="44px"
          px={6}
          w={{ base: "full", md: "auto" }}
          cursor={canApply ? "pointer" : "not-allowed"}
          disabled={!canApply}
          onClick={() => openTemplateDialog(false)}
        >
          <Save size={16} />
          Save as template
        </Button>

        <Button
          borderRadius="14px"
          h="44px"
          px={6}
          w={{ base: "full", md: "auto" }}
          color="white"
          style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
          cursor={canApply ? "pointer" : "not-allowed"}
          disabled={!canApply || reportQuery.isFetching}
          loading={reportQuery.isFetching}
          loadingText="Running..."
          onClick={handleApply}
        >
          <Play size={16} />
          Apply
        </Button>
      </Flex>

      {reportError ? (
        <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
          <Text fontSize="sm" fontWeight="700" color="red.700">
            {reportError}
          </Text>
        </Box>
      ) : null}

      {appliedReport === null ? null : reportQuery.isLoading && !reportQuery.data ? (
        <ReportResultsTableSkeleton />
      ) : reportQuery.data ? (
        <Box
          borderRadius="20px"
          border="1px solid"
          borderColor="border.subtle"
          bg="card.bg"
          boxShadow="card"
          overflow="hidden"
        >
          <ReportResultsTable
            columns={reportColumns}
            rows={reportQuery.data.rows.items}
            isFetching={reportQuery.isFetching}
            sort={sort}
            onSort={handleSort}
          />

          <TablePagination
            page={reportQuery.data.rows.page}
            pageSize={pageSize}
            totalPages={reportQuery.data.rows.totalPages}
            total={reportQuery.data.rows.total}
            itemLabel="submission"
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize)
              setPage(1)
            }}
          />
        </Box>
      ) : null}

      {isTemplateDialogOpen && moduleId !== null && formUniqueId !== null ? (
        <SaveReportTemplateDialog
          templateUniqueId={isEditingTemplate ? (templateUniqueId ?? undefined) : undefined}
          moduleId={moduleId}
          formUniqueId={formUniqueId}
          fields={selectedFields}
          initialName={isEditingTemplate ? (template?.name ?? "") : ""}
          initialFieldIds={selectedFieldIds}
          initialColumnHeadings={templateColumnHeadings}
          maxColumns={maxColumns}
          onSaved={handleTemplateSaved}
          onClose={() => setIsTemplateDialogOpen(false)}
        />
      ) : null}
    </Stack>
  )
}
