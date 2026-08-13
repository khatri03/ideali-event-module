import { z } from "zod"
import { REPORT_FILTER_OPERATOR, type ReportFilter, type ReportFilterOperator } from "@/api/customFormReports"

export const reportTemplateFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a template name.")
    .max(100, "Template name must be 100 characters or fewer."),
  fieldUniqueIds: z.array(z.string()).min(1, "Keep at least one column in the template."),
})

export type ReportTemplateFormValues = z.infer<typeof reportTemplateFormSchema>

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

export const reportFilterDraftSchema = z
  .object({
    id: z.string(),
    fieldUniqueId: z.string().min(1, "Select a field to filter on."),
    operator: filterOperatorSchema,
    value: z.string(),
  })
  .superRefine((draft, ctx) => {
    const values = splitFilterValues(draft.operator, draft.value)

    if (isValuelessOperator(draft.operator)) {
      return
    }

    if (values.length === 0) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Enter a value for this filter." })
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

export function filterDraftError(draft: ReportFilterDraft): string | null {
  const result = reportFilterDraftSchema.safeParse(draft)

  return result.success ? null : (result.error.issues[0]?.message ?? "This filter is incomplete.")
}

export function toReportFilters(drafts: ReportFilterDraft[]): ReportFilter[] {
  return drafts.map((draft) => ({
    fieldUniqueId: draft.fieldUniqueId,
    operator: draft.operator,
    values: splitFilterValues(draft.operator, draft.value),
  }))
}
