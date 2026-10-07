import { useEffect, useState } from "react"
import { Box, Field, Flex, Input } from "@chakra-ui/react"
import { Search } from "lucide-react"
import { useDebounce } from "@/hooks/useDebounce"

const SEARCH_DEBOUNCE_MS = 400

interface CustomInvoiceSearchFieldProps {
  value: string
  onChange: (term: string) => void
}

/** Writes the term after typing pauses, so each keystroke does not add a history entry and a request. */
export function CustomInvoiceSearchField({ value, onChange }: CustomInvoiceSearchFieldProps) {
  const [input, setInput] = useState(value)
  const [syncedValue, setSyncedValue] = useState(value)
  // Back, forward and Clear change the URL under the field; the box follows instead of re-applying a stale term.
  if (value !== syncedValue) {
    setSyncedValue(value)
    setInput(value)
  }
  const debouncedInput = useDebounce(input, SEARCH_DEBOUNCE_MS)

  useEffect(() => {
    // Only a settled value is written: while the debounce still holds an older term it must not overwrite the URL.
    if (debouncedInput === input && debouncedInput !== value) onChange(debouncedInput)
  }, [debouncedInput, input, value, onChange])

  return (
    <Field.Root minW={0}>
      <Field.Label fontSize="sm" fontWeight="700" color="text.primary">
        Search
      </Field.Label>
      <Flex position="relative" align="center" w="full">
        <Box position="absolute" left={4} color="text.secondary" pointerEvents="none" display="flex">
          <Search size={16} />
        </Box>
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Invoice no, buyer, email or company"
          minH="11"
          borderRadius="14px"
          pl={10}
          pr={4}
        />
      </Flex>
    </Field.Root>
  )
}
