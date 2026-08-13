import { Box, Button, Checkbox, Flex, SimpleGrid, SkeletonText, Text } from "@chakra-ui/react"
import type { ReportField } from "@/api/customFormReports"

interface ReportColumnPickerProps {
  fields: ReportField[]
  selectedFieldIds: string[]
  maxColumns: number
  isLoading: boolean
  onToggleField: (fieldUniqueId: string) => void
  onClearFields: () => void
}

export function ReportColumnPicker({
  fields,
  selectedFieldIds,
  maxColumns,
  isLoading,
  onToggleField,
  onClearFields,
}: ReportColumnPickerProps) {
  const hasReachedLimit = maxColumns > 0 && selectedFieldIds.length >= maxColumns

  return (
    <Box
      border="1px solid"
      borderColor="border.subtle"
      borderRadius="20px"
      bg="card.bg"
      boxShadow="card"
      p={{ base: 4, md: 5 }}
    >
      <Flex
        direction={{ base: "column", md: "row" }}
        align={{ base: "flex-start", md: "center" }}
        justify="space-between"
        gap={2}
        mb={4}
      >
        <Box>
          <Text fontSize={{ base: "sm", md: "md" }} fontWeight="800" color="text.primary">
            Report columns
          </Text>
          <Text fontSize="sm" color="text.secondary">
            Invoice number, contact name, contact email and entity name are always included.
          </Text>
        </Box>

        <Flex align="center" gap={3}>
          <Text fontSize="sm" fontWeight="700" color={hasReachedLimit ? "orange.600" : "text.secondary"}>
            {selectedFieldIds.length} of {maxColumns || "—"} selected
          </Text>
          <Button
            variant="plain"
            size="sm"
            fontWeight="700"
            color="brand.600"
            cursor={selectedFieldIds.length === 0 ? "not-allowed" : "pointer"}
            disabled={selectedFieldIds.length === 0}
            onClick={onClearFields}
          >
            Clear
          </Button>
        </Flex>
      </Flex>

      {isLoading ? (
        <SkeletonText noOfLines={6} />
      ) : fields.length === 0 ? (
        <Text fontSize="sm" color="text.secondary">
          This form has no fields available for reporting.
        </Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={3}>
          {fields.map((field) => {
            const isSelected = selectedFieldIds.includes(field.uniqueId)
            const isDisabled = !isSelected && hasReachedLimit

            return (
              <Checkbox.Root
                key={field.uniqueId}
                checked={isSelected}
                disabled={isDisabled}
                onCheckedChange={() => onToggleField(field.uniqueId)}
                cursor={isDisabled ? "not-allowed" : "pointer"}
                minH="11"
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label fontSize="sm" fontWeight="600" lineClamp={1}>
                  {field.label}
                </Checkbox.Label>
              </Checkbox.Root>
            )
          })}
        </SimpleGrid>
      )}

      {hasReachedLimit ? (
        <Text mt={4} fontSize="sm" color="orange.600" fontWeight="600">
          Column limit reached. Clear a column before adding another.
        </Text>
      ) : null}
    </Box>
  )
}
