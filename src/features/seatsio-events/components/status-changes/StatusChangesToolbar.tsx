import { Input, InputGroup, NativeSelect, Stack, Text } from "@chakra-ui/react"
import { Search } from "lucide-react"

interface StatusChangesToolbarProps {
  search: string
  isExactMatch: boolean
  onSearchChange: (search: string) => void
  onExactMatchChange: (isExactMatch: boolean) => void
}

const MATCH_OPTIONS = [
  { value: "contains", label: "Label contains" },
  { value: "exact", label: "Exact match" },
] as const

export function StatusChangesToolbar({
  search,
  isExactMatch,
  onSearchChange,
  onExactMatchChange,
}: StatusChangesToolbarProps) {
  return (
    <Stack gap={2} mb={4}>
      <Stack direction={{ base: "column", sm: "row" }} gap={2}>
        <InputGroup
          startElement={<Search size={16} color="#718096" />}
          startElementProps={{ ps: 3.5 }}
          flex="1"
          maxW={{ base: "full", md: "360px" }}
        >
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by object label"
            aria-label="Search by object label"
            maxLength={100}
            h="44px"
            pl="2.5rem"
            borderRadius="14px"
          />
        </InputGroup>
        <NativeSelect.Root size="sm" w={{ base: "full", sm: "180px" }}>
          <NativeSelect.Field
            aria-label="How the label search matches"
            value={isExactMatch ? "exact" : "contains"}
            minH="11"
            px={3}
            borderRadius="12px"
            cursor="pointer"
            onChange={(event) => onExactMatchChange(event.currentTarget.value === "exact")}
          >
            {MATCH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Stack>
      {isExactMatch && search.trim() && (
        <Text fontSize="xs" color="text.secondary">
          Showing the full history of “{search.trim()}”, newest first. Sorting is off for an exact match.
        </Text>
      )}
    </Stack>
  )
}
