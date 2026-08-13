import { Box, Table, Text } from "@chakra-ui/react"
import { REPORT_RECORD_DETAILS, REPORT_TABLE_MAX_HEIGHT } from "../constants"
import { systemFieldTarget, type ReportSort } from "../schemas/customFormReport.schemas"
import { SortableColumnHeader } from "./SortableColumnHeader"
import type { ReportField, ReportRow } from "@/api/customFormReports"

interface ReportResultsTableProps {
  columns: ReportField[]
  rows: ReportRow[]
  isFetching: boolean
  sort: ReportSort | null
  onSort: (target: string) => void
}

export function ReportResultsTable({ columns, rows, isFetching, sort, onSort }: ReportResultsTableProps) {
  if (rows.length === 0) {
    return (
      <Box p={{ base: 6, md: 10 }} textAlign="center">
        <Text fontSize="sm" fontWeight="700" color="text.primary">
          No submissions match this report.
        </Text>
        <Text mt={1} fontSize="sm" color="text.secondary">
          Change the entity, the form or the selected columns and apply again.
        </Text>
      </Box>
    )
  }

  function directionOf(target: string) {
    if (sort === null || sort.target !== target) {
      return "none" as const
    }

    return sort.descending ? ("descending" as const) : ("ascending" as const)
  }

  return (
    <Box overflowX="auto" maxH={REPORT_TABLE_MAX_HEIGHT} opacity={isFetching ? 0.6 : 1}>
      <Table.Root variant="line" size="sm" whiteSpace="nowrap">
        <Table.Header>
          <Table.Row bg="app.bg">
            {REPORT_RECORD_DETAILS.map((detail) => (
              <SortableColumnHeader
                key={detail.systemField}
                label={detail.label}
                direction={directionOf(systemFieldTarget(detail.systemField))}
                onSort={() => onSort(systemFieldTarget(detail.systemField))}
              />
            ))}
            {columns.map((column) => (
              <SortableColumnHeader
                key={column.uniqueId}
                label={column.columnLabel ?? column.label}
                direction={directionOf(column.uniqueId)}
                onSort={() => onSort(column.uniqueId)}
              />
            ))}
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {rows.map((row, rowIndex) => (
            <Table.Row key={`${row.invoiceNo}-${rowIndex}`}>
              {REPORT_RECORD_DETAILS.map((detail) => (
                <Table.Cell key={detail.systemField} px={4} py={3} fontSize="sm">
                  {detail.read(row) || "—"}
                </Table.Cell>
              ))}
              {columns.map((column) => (
                <Table.Cell key={column.uniqueId} px={4} py={3} fontSize="sm">
                  {row.answers[column.uniqueId] || "—"}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}
