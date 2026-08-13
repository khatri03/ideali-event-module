import { reportRecordDetails } from "../constants"
import { systemFieldTarget } from "../schemas/customFormReport.schemas"
import type { ReportField } from "@/api/customFormReports"

interface ReportTargetOptionsProps {
  fields: ReportField[]
  entityLabel: string
}

/** The columns a report can be pointed at, grouped the same way wherever one is chosen. */
export function ReportTargetOptions({ fields, entityLabel }: ReportTargetOptionsProps) {
  return (
    <>
      <optgroup label="Record details">
        {reportRecordDetails(entityLabel).map((detail) => (
          <option key={detail.systemField} value={systemFieldTarget(detail.systemField)}>
            {detail.label}
          </option>
        ))}
      </optgroup>

      {fields.length > 0 ? (
        <optgroup label="Form fields">
          {fields.map((field) => (
            <option key={field.uniqueId} value={field.uniqueId}>
              {field.columnLabel ?? field.label}
            </option>
          ))}
        </optgroup>
      ) : null}
    </>
  )
}
