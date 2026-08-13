import { Box, Checkbox, Input, Stack, Text } from "@chakra-ui/react"
import type { UseFormRegisterReturn } from "react-hook-form"
import type { ReportField } from "@/api/customFormReports"
import { MAX_COLUMN_HEADING_LENGTH } from "../schemas/customFormReport.schemas"

interface ReportTemplateColumnFieldProps {
  field: ReportField
  isSelected: boolean
  isDisabled: boolean
  headingRegistration: UseFormRegisterReturn
  headingError?: string
  onToggle: () => void
}

export function ReportTemplateColumnField({
  field,
  isSelected,
  isDisabled,
  headingRegistration,
  headingError,
  onToggle,
}: ReportTemplateColumnFieldProps) {
  return (
    <Stack gap={2}>
      <Checkbox.Root
        checked={isSelected}
        disabled={isDisabled}
        onCheckedChange={onToggle}
        cursor={isDisabled ? "not-allowed" : "pointer"}
        minH="11"
      >
        <Checkbox.HiddenInput />
        <Checkbox.Control />
        <Checkbox.Label fontSize="sm" fontWeight="600">
          {field.label}
        </Checkbox.Label>
      </Checkbox.Root>

      {isSelected ? (
        <Box pl={{ base: 0, md: 7 }}>
          <Input
            {...headingRegistration}
            aria-label={`Column heading for ${field.label}`}
            placeholder={field.label}
            maxLength={MAX_COLUMN_HEADING_LENGTH}
            h="44px"
            borderRadius="14px"
            fontSize="sm"
          />
          {headingError ? (
            <Text mt={1} fontSize="sm" color="red.600" fontWeight="600">
              {headingError}
            </Text>
          ) : null}
        </Box>
      ) : null}
    </Stack>
  )
}
