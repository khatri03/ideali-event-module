import { useMemo } from "react"
import { Box, Button, Field, Flex, Input } from "@chakra-ui/react"
import ReactSelect from "react-select"
import { Filter, Search } from "lucide-react"
import { useCustomListOptions } from "../hooks/useCustomLists"

interface CustomListSelectOption {
  value: string
  label: string
}

interface CustomListFilterBarProps {
  draftSearchTerm: string
  draftCustomListIds: string[]
  hasAppliedFilter: boolean
  isApplying: boolean
  onSearchTermChange: (value: string) => void
  onCustomListIdsChange: (values: string[]) => void
  onApply: () => void
  onClear: () => void
}

export function CustomListFilterBar({
  draftSearchTerm,
  draftCustomListIds,
  hasAppliedFilter,
  isApplying,
  onSearchTermChange,
  onCustomListIdsChange,
  onApply,
  onClear,
}: CustomListFilterBarProps) {
  const optionsQuery = useCustomListOptions()

  const listOptions = useMemo<CustomListSelectOption[]>(
    () => (optionsQuery.data ?? []).map((option) => ({ value: option.uniqueId, label: option.name })),
    [optionsQuery.data],
  )
  const selectedListOptions = useMemo(
    () => listOptions.filter((option) => draftCustomListIds.includes(option.value)),
    [listOptions, draftCustomListIds],
  )

  const canClear = hasAppliedFilter || draftCustomListIds.length > 0 || draftSearchTerm.trim().length > 0

  return (
    <Box
      borderRadius="20px"
      border="1px solid"
      borderColor="border.subtle"
      bg="card.bg"
      boxShadow="card"
      p={{ base: 4, md: 5 }}
    >
      <Flex direction={{ base: "column", lg: "row" }} gap={4} align={{ base: "stretch", lg: "flex-end" }}>
        <Field.Root flex={1} minW={0}>
          <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
            Custom lists
          </Field.Label>
          <Box w="full">
            <ReactSelect
              isMulti
              options={listOptions}
              value={selectedListOptions}
              onChange={(values) => onCustomListIdsChange(values.map((option) => option.value))}
              placeholder={optionsQuery.isLoading ? "Loading lists..." : "All custom lists"}
              isLoading={optionsQuery.isLoading}
              closeMenuOnSelect={false}
              isClearable
            />
          </Box>
        </Field.Root>

        <Field.Root flex={1} minW={0}>
          <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
            List name
          </Field.Label>
          <Flex position="relative" align="center" w="full">
            <Box position="absolute" left={4} color="gray.400" pointerEvents="none" display="flex">
              <Search size={16} />
            </Box>
            <Input
              value={draftSearchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  onApply()
                }
              }}
              placeholder="Search by name"
              minH="11"
              borderRadius="14px"
              pl={10}
              pr={4}
            />
          </Flex>
        </Field.Root>

        <Flex gap={2} flexShrink={0} direction={{ base: "column", sm: "row" }}>
          <Button
            minH="11"
            px={6}
            borderRadius="14px"
            fontWeight="700"
            color="white"
            cursor="pointer"
            loading={isApplying}
            loadingText="Applying..."
            onClick={onApply}
            style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
          >
            <Filter size={15} />
            Apply
          </Button>

          <Button
            variant="outline"
            minH="11"
            px={6}
            borderRadius="14px"
            cursor={canClear ? "pointer" : "not-allowed"}
            disabled={!canClear}
            onClick={onClear}
          >
            Clear
          </Button>
        </Flex>
      </Flex>
    </Box>
  )
}
