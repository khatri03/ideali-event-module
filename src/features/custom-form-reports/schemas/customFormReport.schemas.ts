import { z } from "zod"
import {
  REPORT_FILTER_OPERATOR,
  type ReportFilter,
  type ReportFilterOperator,
  type ReportRequest,
  type ReportSystemField,
  type ReportTemplateColumn,
} from "@/api/customFormReports"

export const MAX_COLUMN_HEADING_LENGTH = 60

export const reportTemplateFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a template name.")
    .max(100, "Template name must be 100 characters or fewer."),
  fieldUniqueIds: z.array(z.string()).min(1, "Keep at least one column in the template."),
  columnHeadings: z.record(
    z.string(),
    z
      .string()
      .trim()
      .max(MAX_COLUMN_HEADING_LENGTH, `Column heading must be ${MAX_COLUMN_HEADING_LENGTH} characters or fewer.`),
  ),
})

export type ReportTemplateFormValues = z.infer<typeof reportTemplateFormSchema>

/**
 * A heading the organizer left blank is sent as null, which is what tells the report to keep the
 * field's own control label.
 */
export function toTemplateColumns(
  fieldUniqueIds: string[],
  columnHeadings: Record<string, string>,
): ReportTemplateColumn[] {
  return fieldUniqueIds.map((fieldUniqueId) => {
    const heading = columnHeadings[fieldUniqueId]?.trim() ?? ""

    return { fieldUniqueId, columnLabel: heading.length > 0 ? heading : null }
  })
}

const MAX_FILTER_VALUES = 25
const MAX_FILTER_VALUE_LENGTH = 200

/** Presence conditions read the answer's existence, so they carry no value of their own. */
const VALUELESS_OPERATORS: ReportFilterOperator[] = [
  REPORT_FILTER_OPERATOR.isEmpty,
  REPORT_FILTER_OPERATOR.isNotEmpty,
]

export function isValuelessOperator(operator: ReportFilterOperator) {
  return VALUELESS_OPERATORS.includes(operator)
}

/** Only "is any of" takes a list; every other condition compares against the whole entry. */
export function splitFilterValues(operator: ReportFilterOperator, value: string): string[] {
  if (isValuelessOperator(operator)) {
    return []
  }

  const parts = operator === REPORT_FILTER_OPERATOR.isAnyOf ? value.split(",") : [value]

  return [...new Set(parts.map((part) => part.trim()).filter((part) => part.length > 0))]
}

const filterOperatorSchema = z.union([
  z.literal(REPORT_FILTER_OPERATOR.contains),
  z.literal(REPORT_FILTER_OPERATOR.equals),
  z.literal(REPORT_FILTER_OPERATOR.notEquals),
  z.literal(REPORT_FILTER_OPERATOR.isAnyOf),
  z.literal(REPORT_FILTER_OPERATOR.isEmpty),
  z.literal(REPORT_FILTER_OPERATOR.isNotEmpty),
])

/**
 * A filter targets either a custom form field or a record detail, but a select holds one value, so record
 * details travel through the draft under a prefix and are split back out when the request is built.
 */
const SYSTEM_FIELD_PREFIX = "record-detail:"

export function systemFieldTarget(systemField: ReportSystemField): string {
  return `${SYSTEM_FIELD_PREFIX}${systemField}`
}

export function splitReportTarget(target: string): Pick<ReportFilter, "fieldUniqueId" | "systemField"> {
  if (!target.startsWith(SYSTEM_FIELD_PREFIX)) {
    return { fieldUniqueId: target, systemField: null }
  }

  return {
    fieldUniqueId: null,
    systemField: Number(target.slice(SYSTEM_FIELD_PREFIX.length)) as ReportSystemField,
  }
}

export const reportFilterDraftSchema = z
  .object({
    id: z.string(),
    target: z.string().min(1, "Select a field to filter on."),
    operator: filterOperatorSchema,
    value: z.string(),
  })
  .superRefine((draft, ctx) => {
    const values = splitFilterValues(draft.operator, draft.value)

    if (isValuelessOperator(draft.operator)) {
      return
    }

    if (values.length > MAX_FILTER_VALUES) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: `Enter no more than ${MAX_FILTER_VALUES} values in a single filter.`,
      })
      return
    }

    if (values.some((value) => value.length > MAX_FILTER_VALUE_LENGTH)) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: `Filter values must be ${MAX_FILTER_VALUE_LENGTH} characters or fewer.`,
      })
    }
  })

export type ReportFilterDraft = z.infer<typeof reportFilterDraftSchema>

/**
 * A row the organizer added but has not filled in yet. It is left out of the report rather than treated as a
 * mistake, so adding a filter never blocks running what is already set up.
 */
export function isBlankFilter(draft: ReportFilterDraft): boolean {
  return !isValuelessOperator(draft.operator) && splitFilterValues(draft.operator, draft.value).length === 0
}

export function filterDraftError(draft: ReportFilterDraft): string | null {
  if (isBlankFilter(draft)) {
    return null
  }

  const result = reportFilterDraftSchema.safeParse(draft)

  return result.success ? null : (result.error.issues[0]?.message ?? "This filter is incomplete.")
}

export function toReportFilters(drafts: ReportFilterDraft[]): ReportFilter[] {
  return drafts
    .filter((draft) => !isBlankFilter(draft))
    .map((draft) => ({
      ...splitReportTarget(draft.target),
      operator: draft.operator,
      values: splitFilterValues(draft.operator, draft.value),
    }))
}

/** What a run was asked for, kept apart from the builder's draft so the two can be told apart. */
export interface AppliedReport {
  moduleId: number
  entityUniqueId: string
  formUniqueId: string
  fieldUniqueIds: string[]
  filters: ReportFilter[]
}

function isSameFilter(one: ReportFilter, other: ReportFilter): boolean {
  return (
    one.fieldUniqueId === other.fieldUniqueId &&
    one.systemField === other.systemField &&
    one.operator === other.operator &&
    isSameOrder(one.values, other.values)
  )
}

function isSameOrder(one: readonly string[], other: readonly string[]): boolean {
  return one.length === other.length && one.every((entry, index) => entry === other[index])
}

/**
 * Whether a run still describes what the builder is showing. Column order counts, because it is the order the
 * table and any download are laid out in.
 */
export function isSameReport(one: AppliedReport, other: AppliedReport): boolean {
  return (
    one.moduleId === other.moduleId &&
    one.entityUniqueId === other.entityUniqueId &&
    one.formUniqueId === other.formUniqueId &&
    isSameOrder(one.fieldUniqueIds, other.fieldUniqueIds) &&
    one.filters.length === other.filters.length &&
    one.filters.every((filter, index) => isSameFilter(filter, other.filters[index]))
  )
}

/** The column the report is ordered by, encoded the same way a filter target is. */
export interface ReportSort {
  target: string
  descending: boolean
}

type ReportSortRequest = Pick<ReportRequest, "sortFieldUniqueId" | "sortSystemField" | "sortDescending">

export function toReportSortRequest(sort: ReportSort | null): ReportSortRequest {
  if (sort === null) {
    return { sortFieldUniqueId: null, sortSystemField: null, sortDescending: false }
  }

  const { fieldUniqueId, systemField } = splitReportTarget(sort.target)

  return { sortFieldUniqueId: fieldUniqueId, sortSystemField: systemField, sortDescending: sort.descending }
}

/**
 * Clicking a column sorts it ascending, then descending, then hands the report back to its default
 * newest-first order, so there is always a way back without reloading the page.
 */
export function nextReportSort(current: ReportSort | null, target: string): ReportSort | null {
  if (current === null || current.target !== target) {
    return { target, descending: false }
  }

  return current.descending ? null : { target, descending: true }
}
