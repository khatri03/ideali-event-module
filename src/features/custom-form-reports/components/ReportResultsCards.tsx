import { Box, Flex, IconButton, NativeSelect, Stack, Text } from "@chakra-ui/react"
import { ArrowDown, ArrowUp } from "lucide-react"
import { EMPTY_VALUE } from "@/utils/format"
import { reportRecordDetails } from "../constants"
import { type ReportSort } from "../schemas/customFormReport.schemas"
import { ReportTargetOptions } from "./ReportTargetOptions"
import { REPORT_SYSTEM_FIELD, type ReportField, type ReportRow, type ReportSystemField } from "@/api/customFormReports"

interface ReportResultsCardsProps {
  columns: ReportField[]
  rows: ReportRow[]
  entityLabel: string
  sort: ReportSort | null
  onSort: (target: string) => void
}

/** The two details that head a card, so they are not repeated in the list underneath it. */
const HEADLINE_DETAILS: readonly ReportSystemField[] = [
  REPORT_SYSTEM_FIELD.invoiceNo,
  REPORT_SYSTEM_FIELD.contactName,
]

interface CardEntry {
  key: string
  label: string
  value: string
}

function entriesOf(row: ReportRow, columns: ReportField[], entityLabel: string): CardEntry[] {
  const supportingDetails = reportRecordDetails(entityLabel).filter(
    (detail) => !HEADLINE_DETAILS.includes(detail.systemField),
  )

  return [
    ...supportingDetails.map((detail) => ({
      key: String(detail.systemField),
      label: detail.label,
      value: detail.read(row),
    })),
    ...columns.map((column) => ({
      key: column.uniqueId,
      label: column.columnLabel ?? column.label,
      value: row.answers[column.uniqueId] ?? "",
    })),
  ]
}

/**
 * A report can carry fifteen columns, which on a phone is a table nobody can read across. The same rows are
 * laid out one card at a time instead, and because the column headings carried the sort, the sort moves to a
 * control of its own rather than disappearing at this width.
 */
export function ReportResultsCards({ columns, rows, entityLabel, sort, onSort }: ReportResultsCardsProps) {
  const isDescending = sort?.descending ?? false

  return (
    <Stack gap={3} px={4} pb={4}>
      <Flex gap={2} align="center">
        <NativeSelect.Root size="sm" flex="1">
          <NativeSelect.Field
            aria-label="Sort submissions by"
            value={sort?.target ?? ""}
            minH="11"
            cursor="pointer"
            onChange={(event) => onSort(event.currentTarget.value)}
          >
            <option value="">Newest first</option>

            <ReportTargetOptions fields={columns} entityLabel={entityLabel} />
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>

        {sort ? (
          <IconButton
            aria-label={isDescending ? "Return to newest first" : "Reverse the order"}
            variant="outline"
            size="sm"
            minW="11"
            minH="11"
            borderRadius="12px"
            cursor="pointer"
            onClick={() => onSort(sort.target)}
          >
            {isDescending ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
          </IconButton>
        ) : null}
      </Flex>

      <Stack gap={3} role="list" aria-label="Submissions">
        {rows.map((row, rowIndex) => (
          <Box
            key={`${row.invoiceNo}-${rowIndex}`}
            role="listitem"
            border="1px solid"
            borderColor="border.subtle"
            borderRadius="16px"
            p={4}
          >
            <Text fontSize="sm" fontWeight="800" color="text.primary">
              {row.contactName || EMPTY_VALUE}
            </Text>
            <Text fontSize="xs" fontWeight="700" color="text.secondary">
              {row.invoiceNo || EMPTY_VALUE}
            </Text>

            <Stack mt={3} gap={2}>
              {entriesOf(row, columns, entityLabel).map((entry) => (
                <Flex key={entry.key} justify="space-between" align="baseline" gap={4}>
                  <Text fontSize="xs" fontWeight="700" color="text.secondary" flexShrink={0}>
                    {entry.label}
                  </Text>
                  <Text fontSize="sm" color="text.primary" textAlign="right" wordBreak="break-word">
                    {entry.value.trim() || EMPTY_VALUE}
                  </Text>
                </Flex>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Stack>
  )
}
