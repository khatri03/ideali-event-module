import { REPORT_FILTER_OPERATOR } from "@/api/customFormReports"

export { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/components/common"

/** Caps the results height so a large page scrolls inside the table instead of stretching the page. */
export const REPORT_TABLE_MAX_HEIGHT = { base: "60vh", md: "560px" } as const

/** Sentinel for the "work without a saved template" choice, since a select option cannot hold an empty value. */
export const NO_TEMPLATE_VALUE = "none"

export const REPORT_FILTER_OPERATOR_OPTIONS = [
  { value: REPORT_FILTER_OPERATOR.contains, label: "Contains" },
  { value: REPORT_FILTER_OPERATOR.equals, label: "Is" },
  { value: REPORT_FILTER_OPERATOR.notEquals, label: "Is not" },
  { value: REPORT_FILTER_OPERATOR.isAnyOf, label: "Is any of" },
  { value: REPORT_FILTER_OPERATOR.isEmpty, label: "Is empty" },
  { value: REPORT_FILTER_OPERATOR.isNotEmpty, label: "Is not empty" },
] as const

export const MAX_REPORT_FILTERS = 10
