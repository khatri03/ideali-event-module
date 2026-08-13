import { Box, Table } from "@chakra-ui/react"
import { EMPTY_VALUE } from "@/utils/format"
import {
  REPORT_CELL_MAX_WIDTH,
  REPORT_CELL_PADDING_X,
  REPORT_TABLE_MAX_HEIGHT,
  reportRecordDetails,
} from "../constants"
import { systemFieldTarget, type ReportSort } from "../schemas/customFormReport.schemas"
import { SortableColumnHeader } from "./SortableColumnHeader"
import type { ReportField, ReportRow } from "@/api/customFormReports"

interface ReportResultsTableProps {
  columns: ReportField[]
  rows: ReportRow[]
  entityLabel: string
  sort: ReportSort | null
  onSort: (target: string) => void
}

/**
 * A long answer is cut to the column's width and carried in full by the cell's title, so one paragraph
 * cannot stretch the table past everything beside it while still being readable in place.
 */
function ReportCell({ value }: { value: string }) {
  const text = value.trim()

  return (
    <Table.Cell
      px={REPORT_CELL_PADDING_X}
      py={3}
      fontSize="sm"
      maxW={REPORT_CELL_MAX_WIDTH}
      overflow="hidden"
      textOverflow="ellipsis"
      title={text.length > 0 ? text : undefined}
    >
      {text.length > 0 ? text : EMPTY_VALUE}
    </Table.Cell>
  )
}

export function ReportResultsTable({ columns, rows, entityLabel, sort, onSort }: ReportResultsTableProps) {
  const recordDetails = reportRecordDetails(entityLabel)

  function directionOf(target: string) {
    if (sort === null || sort.target !== target) {
      return "none" as const
    }

    return sort.descending ? ("descending" as const) : ("ascending" as const)
  }

  return (
    <Box overflowX="auto" maxH={REPORT_TABLE_MAX_HEIGHT}>
      <Table.Root variant="line" size="sm" whiteSpace="nowrap">
        <Table.Header>
          <Table.Row>
            {recordDetails.map((detail) => (
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
              {recordDetails.map((detail) => (
                <ReportCell key={detail.systemField} value={detail.read(row)} />
              ))}
              {columns.map((column) => (
                <ReportCell key={column.uniqueId} value={row.answers[column.uniqueId] ?? ""} />
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}
