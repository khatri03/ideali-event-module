import { Box, Text } from "@chakra-ui/react"
import { ReportResultsCards } from "./ReportResultsCards"
import { ReportResultsTable } from "./ReportResultsTable"
import type { ReportSort } from "../schemas/customFormReport.schemas"
import type { ReportField, ReportRow } from "@/api/customFormReports"

interface ReportResultsProps {
  columns: ReportField[]
  rows: ReportRow[]
  entityLabel: string
  isFetching: boolean
  sort: ReportSort | null
  onSort: (target: string) => void
}

/** The same rows in whichever shape the viewport can carry: a table on a desktop, one card at a time below it. */
export function ReportResults({ columns, rows, entityLabel, isFetching, sort, onSort }: ReportResultsProps) {
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
    <Box opacity={isFetching ? 0.6 : 1} aria-busy={isFetching}>
      <Box display={{ base: "none", md: "block" }}>
        <ReportResultsTable
          columns={columns}
          rows={rows}
          entityLabel={entityLabel}
          sort={sort}
          onSort={onSort}
        />
      </Box>

      <Box display={{ base: "block", md: "none" }}>
        <ReportResultsCards
          columns={columns}
          rows={rows}
          entityLabel={entityLabel}
          sort={sort}
          onSort={onSort}
        />
      </Box>
    </Box>
  )
}
