import { REPORT_FILTER_OPERATOR, REPORT_SYSTEM_FIELD, type ReportRow, type ReportSystemField } from "@/api/customFormReports"

export { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/components/common"

/** Caps the results height so a large page scrolls inside the table instead of stretching the page. */
export const REPORT_TABLE_MAX_HEIGHT = { base: "60vh", md: "560px" } as const

/** Sentinel for the "work without a saved template" choice, since a select option cannot hold an empty value. */
export const NO_TEMPLATE_VALUE = "none"

/** Worded for an organiser reading the screen, not for the operator names the API uses. */
export const REPORT_FILTER_OPERATOR_OPTIONS = [
  { value: REPORT_FILTER_OPERATOR.contains, label: "Contains" },
  { value: REPORT_FILTER_OPERATOR.equals, label: "Equals to" },
  { value: REPORT_FILTER_OPERATOR.notEquals, label: "Not equals to" },
  { value: REPORT_FILTER_OPERATOR.isAnyOf, label: "Is one of" },
  { value: REPORT_FILTER_OPERATOR.isEmpty, label: "Has no value" },
  { value: REPORT_FILTER_OPERATOR.isNotEmpty, label: "Has any value" },
] as const

export const MAX_REPORT_FILTERS = 10

interface ReportRecordDetail {
  systemField: ReportSystemField
  label: string
  read: (row: ReportRow) => string
}

/**
 * The details every report carries whatever columns are chosen. One list drives both the leading table
 * columns and the record details offered in the filter builder, so the two can never disagree.
 */
export const REPORT_RECORD_DETAILS: readonly ReportRecordDetail[] = [
  { systemField: REPORT_SYSTEM_FIELD.invoiceNo, label: "Invoice No", read: (row) => row.invoiceNo },
  { systemField: REPORT_SYSTEM_FIELD.contactName, label: "Contact Name", read: (row) => row.contactName },
  { systemField: REPORT_SYSTEM_FIELD.contactNo, label: "Contact No", read: (row) => row.contactNo },
  { systemField: REPORT_SYSTEM_FIELD.contactEmail, label: "Contact Email", read: (row) => row.contactEmail },
  { systemField: REPORT_SYSTEM_FIELD.entityName, label: "Entity", read: (row) => row.entityName },
]
