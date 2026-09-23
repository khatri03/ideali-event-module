import { Box, Button, Table, type TableColumnHeaderProps } from "@chakra-ui/react"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

type SortDirection = "ascending" | "descending" | "none"

interface SortableColumnHeaderProps {
  label: string
  direction: SortDirection
  onSort: () => void
  px?: TableColumnHeaderProps["px"]
  isDisabled?: boolean
}

const SORT_ICON = {
  ascending: ArrowUp,
  descending: ArrowDown,
  none: ArrowUpDown,
} as const

export function SortableColumnHeader({ label, direction, onSort, px = 4, isDisabled = false }: SortableColumnHeaderProps) {
  const SortIcon = SORT_ICON[direction]

  return (
    <Table.ColumnHeader
      px={px}
      py={0}
      fontWeight="800"
      aria-sort={isDisabled ? undefined : direction}
      // The results scroll inside their own box, so the headings stay put rather than leaving with the first rows.
      position="sticky"
      top="0"
      zIndex="docked"
      bg="app.bg"
    >
      <Button
        variant="plain"
        w="full"
        minH="11"
        px={0}
        gap={1.5}
        justifyContent="flex-start"
        fontSize="inherit"
        fontWeight="inherit"
        color="inherit"
        cursor="pointer"
        disabled={isDisabled}
        _disabled={{ cursor: "not-allowed", opacity: 0.6 }}
        onClick={onSort}
      >
        {label}
        {/* The idle arrows are dimmed so a sorted column still reads as the sorted one at a glance. */}
        <Box as="span" opacity={direction === "none" ? 0.4 : 1}>
          <SortIcon size={14} aria-hidden />
        </Box>
      </Button>
    </Table.ColumnHeader>
  )
}
