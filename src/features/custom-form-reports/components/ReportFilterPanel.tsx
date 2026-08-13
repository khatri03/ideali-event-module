import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react"
import { Plus } from "lucide-react"
import type { ReportField } from "@/api/customFormReports"
import { MAX_REPORT_FILTERS } from "../constants"
import { filterDraftError, type ReportFilterDraft } from "../schemas/customFormReport.schemas"
import { ReportFilterRow } from "./ReportFilterRow"

interface ReportFilterPanelProps {
  fields: ReportField[]
  entityLabel: string
  drafts: ReportFilterDraft[]
  onAddFilter: () => void
  onChangeFilter: (draft: ReportFilterDraft) => void
  onRemoveFilter: (draftId: string) => void
}

export function ReportFilterPanel({
  fields,
  entityLabel,
  drafts,
  onAddFilter,
  onChangeFilter,
  onRemoveFilter,
}: ReportFilterPanelProps) {
  const hasReachedLimit = drafts.length >= MAX_REPORT_FILTERS

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
            Filters
          </Text>
          <Text fontSize="sm" color="text.secondary">
            Filter on the record details or on any answer. A submission is listed only when it matches every
            filter.
          </Text>
        </Box>

        <Box>
          <Button
            variant="outline"
            size="sm"
            borderRadius="12px"
            minH="11"
            px={4}
            w={{ base: "full", md: "auto" }}
            cursor={hasReachedLimit ? "not-allowed" : "pointer"}
            disabled={hasReachedLimit}
            onClick={onAddFilter}
          >
            <Plus size={16} />
            Add filter
          </Button>
          <Text mt={1} fontSize="sm" color="text.secondary" fontWeight="600" textAlign={{ base: "left", md: "right" }}>
            {drafts.length} of {MAX_REPORT_FILTERS} filters added
          </Text>
        </Box>
      </Flex>

      {drafts.length === 0 ? (
        <Text fontSize="sm" color="text.secondary">
          No filters applied. The report lists every submission of the selected form.
        </Text>
      ) : (
        <Stack gap={3}>
          {drafts.map((draft, index) => (
            <ReportFilterRow
              key={draft.id}
              draft={draft}
              position={index + 1}
              fields={fields}
              entityLabel={entityLabel}
              error={filterDraftError(draft)}
              onChange={onChangeFilter}
              onRemove={() => onRemoveFilter(draft.id)}
            />
          ))}
        </Stack>
      )}

      {hasReachedLimit ? (
        <Text mt={4} fontSize="sm" color="orange.600" fontWeight="600">
          Filter limit reached. Remove a filter before adding another.
        </Text>
      ) : null}
    </Box>
  )
}
