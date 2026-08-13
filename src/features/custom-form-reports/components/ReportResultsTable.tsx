import { Box, Table, Text } from "@chakra-ui/react"
import { REPORT_TABLE_MAX_HEIGHT } from "../constants"
import type { ReportField, ReportRow } from "@/api/customFormReports"

interface ReportResultsTableProps {
  columns: ReportField[]
  rows: ReportRow[]
  isFetching: boolean
}

const PERMANENT_COLUMN_LABELS = ["Invoice No", "Contact Name", "Contact Email", "Entity"]

function permanentValues(row: ReportRow): string[] {
  return [row.invoiceNo, row.contactName, row.contactEmail, row.entityName]
}

export function ReportResultsTable({ columns, rows, isFetching }: ReportResultsTableProps) {
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

  return (
    <Box overflowX="auto" maxH={REPORT_TABLE_MAX_HEIGHT} opacity={isFetching ? 0.6 : 1}>
      <Table.Root variant="line" size="sm" whiteSpace="nowrap">
        <Table.Header>
          <Table.Row bg="app.bg">
            {PERMANENT_COLUMN_LABELS.map((label) => (
              <Table.ColumnHeader key={label} px={4} py={3} fontWeight="800">
                {label}
              </Table.ColumnHeader>
            ))}
            {columns.map((column) => (
              <Table.ColumnHeader key={column.uniqueId} px={4} py={3} fontWeight="800">
                {column.label}
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {rows.map((row, rowIndex) => (
            <Table.Row key={`${row.invoiceNo}-${rowIndex}`}>
              {permanentValues(row).map((value, valueIndex) => (
                <Table.Cell key={PERMANENT_COLUMN_LABELS[valueIndex]} px={4} py={3} fontSize="sm">
                  {value || "—"}
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
