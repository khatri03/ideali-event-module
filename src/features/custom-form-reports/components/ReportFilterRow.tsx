import { Grid, IconButton, Input, NativeSelect, Text } from "@chakra-ui/react"
import { Trash2 } from "lucide-react"
import { REPORT_FILTER_OPERATOR, type ReportField, type ReportFilterOperator } from "@/api/customFormReports"
import { REPORT_FILTER_OPERATOR_OPTIONS } from "../constants"
import { isBlankFilter, isValuelessOperator, type ReportFilterDraft } from "../schemas/customFormReport.schemas"
import { ReportTargetOptions } from "./ReportTargetOptions"

interface ReportFilterRowProps {
  draft: ReportFilterDraft
  position: number
  fields: ReportField[]
  entityLabel: string
  error: string | null
  onChange: (draft: ReportFilterDraft) => void
  onRemove: () => void
}

export function ReportFilterRow({
  draft,
  position,
  fields,
  entityLabel,
  error,
  onChange,
  onRemove,
}: ReportFilterRowProps) {
  const takesValue = !isValuelessOperator(draft.operator)
  const valuePlaceholder =
    draft.operator === REPORT_FILTER_OPERATOR.isAnyOf ? "Separate values with commas" : "Enter a value"

  return (
    <Grid
      templateColumns={{ base: "1fr", md: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) auto" }}
      gap={3}
      alignItems="start"
    >
      <NativeSelect.Root size="sm">
        <NativeSelect.Field
          aria-label={`Filter ${position} field`}
          value={draft.target}
          minH="11"
          px={3}
          borderRadius="12px"
          cursor="pointer"
          onChange={(event) => onChange({ ...draft, target: event.currentTarget.value })}
        >
          <option value="">Select a field</option>

          <ReportTargetOptions fields={fields} entityLabel={entityLabel} />
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>

      <NativeSelect.Root size="sm">
        <NativeSelect.Field
          aria-label={`Filter ${position} condition`}
          value={String(draft.operator)}
          minH="11"
          px={3}
          borderRadius="12px"
          cursor="pointer"
          onChange={(event) =>
            onChange({ ...draft, operator: Number(event.currentTarget.value) as ReportFilterOperator })
          }
        >
          {REPORT_FILTER_OPERATOR_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>

      <Input
        aria-label={`Filter ${position} value`}
        size="sm"
        minH="11"
        px={3}
        borderRadius="12px"
        placeholder={takesValue ? valuePlaceholder : "Not needed for this condition"}
        value={takesValue ? draft.value : ""}
        disabled={!takesValue}
        cursor={takesValue ? "text" : "not-allowed"}
        onChange={(event) => onChange({ ...draft, value: event.currentTarget.value })}
      />

      <IconButton
        aria-label={`Remove filter ${position}`}
        variant="ghost"
        size="sm"
        minW="11"
        minH="11"
        color="red.500"
        cursor="pointer"
        onClick={onRemove}
      >
        <Trash2 size={16} />
      </IconButton>

      {error ? (
        <Text gridColumn={{ base: "auto", md: "1 / -1" }} fontSize="sm" fontWeight="600" color="red.600">
          {error}
        </Text>
      ) : isBlankFilter(draft) ? (
        <Text gridColumn={{ base: "auto", md: "1 / -1" }} fontSize="sm" color="text.secondary">
          This filter is skipped until you enter a value.
        </Text>
      ) : null}
    </Grid>
  )
}
