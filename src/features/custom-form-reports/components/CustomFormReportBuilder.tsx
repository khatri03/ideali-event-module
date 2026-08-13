import { useRef, useState } from "react"
import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react"
import { PencilLine, Play, Save } from "lucide-react"
import { TablePagination } from "@/components/common"
import { extractApiError } from "@/utils/errors"
import { DEFAULT_PAGE_SIZE, entityLabelFor } from "../constants"
import {
  useCustomFormReport,
  useReportColumns,
  useReportEntities,
  useReportForms,
  useReportModules,
  useReportTemplate,
  useReportTemplateOptions,
} from "../hooks/useCustomFormReports"
import { useExportCustomFormReport } from "../hooks/useExportCustomFormReport"
import {
  REPORT_FILTER_OPERATOR,
  REPORT_SYSTEM_FIELD,
  type ReportExportFormat,
  type ReportExportScope,
} from "@/api/customFormReports"
import {
  filterDraftError,
  isSameReport,
  nextReportSort,
  systemFieldTarget,
  toReportFilters,
  toReportSortRequest,
  type AppliedReport,
  type ReportFilterDraft,
  type ReportSort,
} from "../schemas/customFormReport.schemas"
import { ReportColumnPicker } from "./ReportColumnPicker"
import { ReportExportMenu } from "./ReportExportMenu"
import { ReportFilterPanel } from "./ReportFilterPanel"
import { ReportResults } from "./ReportResults"
import { ReportResultsTableSkeleton } from "./ReportResultsTable.skeleton"
import { ReportSourcePicker } from "./ReportSourcePicker"
import { SaveReportTemplateDialog } from "./SaveReportTemplateDialog"

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
  const [templateDialogSession, setTemplateDialogSession] = useState(0)
  const nextFilterId = useRef(0)
  // Tracks the last template auto-run so picking the same template twice does not re-run it on every render.
  const [autoAppliedTemplateId, setAutoAppliedTemplateId] = useState<string | null>(null)

  const modulesQuery = useReportModules()
  const entitiesQuery = useReportEntities(moduleId)
  const formsQuery = useReportForms(moduleId, entityUniqueId)
  const columnsQuery = useReportColumns(formUniqueId)
  const templateOptionsQuery = useReportTemplateOptions(moduleId, formUniqueId)
  const templateQuery = useReportTemplate(templateUniqueId)
  const reportQuery = useCustomFormReport(
    appliedReport ? { ...appliedReport, ...toReportSortRequest(sort), pageNo: page, pageSize } : null,
  )
  const exportMutation = useExportCustomFormReport()

  const fields = columnsQuery.data?.fields ?? []
  const maxColumns = columnsQuery.data?.maxColumns ?? 0
  const selectedModule = (modulesQuery.data ?? []).find((module) => module.id === moduleId)
  const entityLabel = entityLabelFor(selectedModule?.name ?? null)
  const template = templateQuery.data
  const templateFieldIds = template?.columns.map((column) => column.uniqueId) ?? []
  const selectedFieldIds = fieldSelection ?? templateFieldIds
  const hasIncompleteFilter = filterDrafts.some((draft) => filterDraftError(draft) !== null)
  const draftReport: AppliedReport | null =
    moduleId !== null && entityUniqueId !== null && formUniqueId !== null && selectedFieldIds.length > 0
      ? {
          moduleId,
          entityUniqueId,
          formUniqueId,
          fieldUniqueIds: selectedFieldIds,
          filters: toReportFilters(filterDrafts),
        }
      : null
  const canApply = draftReport !== null && !hasIncompleteFilter
  /**
   * The table keeps the last run until another one is asked for, so an edit made since then would otherwise
   * read as though it were already reflected in what is on screen.
   */
  const isShowingEarlierRun =
    appliedReport !== null && (draftReport === null || !isSameReport(appliedReport, draftReport))

  /**
   * A selected template's columns show as checked in the picker as soon as it loads, so the table below has to
   * catch up on its own — otherwise it keeps showing whatever ran before, or nothing, until Apply is clicked.
   * Adjusted during render, guarded by autoAppliedTemplateId, rather than in an effect that would fire a render late.
   */
  if (
    templateUniqueId !== null &&
    fieldSelection === null &&
    draftReport !== null &&
    autoAppliedTemplateId !== templateUniqueId
  ) {
    setAutoAppliedTemplateId(templateUniqueId)
    setAppliedReport(draftReport)
    setPage(1)
  }

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

  /** The download repeats the report already on screen, so it is built from what was applied, not the draft. */
  async function handleExport(format: ReportExportFormat, scope: ReportExportScope) {
    if (appliedReport === null) {
      return
    }

    await exportMutation.mutateAsync({
      ...appliedReport,
      ...toReportSortRequest(sort),
      pageNo: page,
      pageSize,
      format,
      scope,
      templateUniqueId,
    })
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
    if (draftReport === null || hasIncompleteFilter) {
      return
    }

    setAppliedReport(draftReport)
    setPage(1)
  }

  function handleTemplateSaved(savedTemplateUniqueId: string) {
    setTemplateUniqueId(savedTemplateUniqueId)
    setFieldSelection(null)
  }

  /** The dialog outlives one open, so its form is remounted rather than left holding the last one's values. */
  function openTemplateDialog(editing: boolean) {
    setIsEditingTemplate(editing)
    setTemplateDialogSession(templateDialogSession + 1)
    setIsTemplateDialogOpen(true)
  }

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
        entityLabel={entityLabel}
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
          entityLabel={entityLabel}
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
          entityLabel={entityLabel}
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
            cursor="pointer"
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
          {isShowingEarlierRun ? "Apply changes" : "Apply"}
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
          {isShowingEarlierRun ? (
            <Box mx={{ base: 4, md: 5 }} mt={4} p={3} borderRadius="14px" bg="orange.50" border="1px solid" borderColor="orange.200">
              <Text fontSize="sm" fontWeight="700" color="orange.700">
                These results are from an earlier run. Apply to see the report you have set up now.
              </Text>
            </Box>
          ) : null}

          {/* Nothing on screen means nothing to take away, so the download is not offered on an empty report. */}
          {reportQuery.data.rows.items.length > 0 ? (
            <Flex px={{ base: 4, md: 5 }} py={4} justify="flex-end">
              <ReportExportMenu
                pageRowCount={reportQuery.data.rows.items.length}
                totalRowCount={reportQuery.data.rows.total}
                isExporting={exportMutation.isPending}
                isDisabled={isShowingEarlierRun}
                onExport={handleExport}
              />
            </Flex>
          ) : null}

          <ReportResults
            columns={reportColumns}
            rows={reportQuery.data.rows.items}
            entityLabel={entityLabel}
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

      {moduleId !== null && formUniqueId !== null ? (
        <SaveReportTemplateDialog
          open={isTemplateDialogOpen}
          editSessionKey={templateDialogSession}
          templateUniqueId={isEditingTemplate ? (templateUniqueId ?? undefined) : undefined}
          moduleId={moduleId}
          formUniqueId={formUniqueId}
          fields={fields}
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
