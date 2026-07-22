import { useMemo } from "react"
import { Box, Button, Field, Flex, Input } from "@chakra-ui/react"
import ReactSelect from "react-select"
import { Filter, RotateCcw, Search } from "lucide-react"
import { useMembershipTypeOptions } from "../hooks/useCustomLists"

interface MembershipTypeSelectOption {
  value: string
  label: string
}

interface CustomListMemberFilterBarProps {
  draftSearchTerm: string
  draftMembershipTypeIds: string[]
  hasAppliedFilter: boolean
  isSorted: boolean
  isApplying: boolean
  onSearchTermChange: (value: string) => void
  onMembershipTypeIdsChange: (values: string[]) => void
  onApply: () => void
  onClear: () => void
  onClearSort: () => void
}

export function CustomListMemberFilterBar({
  draftSearchTerm,
  draftMembershipTypeIds,
  hasAppliedFilter,
  isSorted,
  isApplying,
  onSearchTermChange,
  onMembershipTypeIdsChange,
  onApply,
  onClear,
  onClearSort,
}: CustomListMemberFilterBarProps) {
  const optionsQuery = useMembershipTypeOptions()

  const membershipTypeOptions = useMemo<MembershipTypeSelectOption[]>(
    () =>
      (optionsQuery.data ?? []).map((option) => ({
        value: option.uniqueId,
        label: `${option.name} (${option.activeMemberCount})`,
      })),
    [optionsQuery.data],
  )
  const selectedMembershipTypeOptions = useMemo(
    () => membershipTypeOptions.filter((option) => draftMembershipTypeIds.includes(option.value)),
    [membershipTypeOptions, draftMembershipTypeIds],
  )

  const canClear = hasAppliedFilter || draftMembershipTypeIds.length > 0 || draftSearchTerm.trim().length > 0

  return (
    <Box
      borderRadius="20px"
      border="1px solid"
      borderColor="border.subtle"
      bg="card.bg"
      boxShadow="card"
      p={{ base: 4, md: 5 }}
      mb={5}
    >
      <Flex direction={{ base: "column", lg: "row" }} gap={4} align={{ base: "stretch", lg: "flex-end" }}>
        <Field.Root flex={1} minW={0}>
          <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
            Membership types
          </Field.Label>
          <Box w="full">
            <ReactSelect
              isMulti
              options={membershipTypeOptions}
              value={selectedMembershipTypeOptions}
              onChange={(values) => onMembershipTypeIdsChange(values.map((option) => option.value))}
              placeholder={optionsQuery.isLoading ? "Loading types..." : "All membership types"}
              isLoading={optionsQuery.isLoading}
              closeMenuOnSelect={false}
              isClearable
            />
          </Box>
        </Field.Root>

        <Field.Root flex={1} minW={0}>
          <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
            Member
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
              placeholder="Search name, email or phone"
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
            title="Clear the membership type filter and member search"
            onClick={onClear}
          >
            Clear
          </Button>

          {isSorted ? (
            <Button
              variant="outline"
              minH="11"
              px={5}
              borderRadius="14px"
              color="gray.600"
              cursor="pointer"
              title="Reset sorting to the default order"
              onClick={onClearSort}
            >
              <RotateCcw size={15} />
              Clear Sort
            </Button>
          ) : null}
        </Flex>
      </Flex>
    </Box>
  )
}
