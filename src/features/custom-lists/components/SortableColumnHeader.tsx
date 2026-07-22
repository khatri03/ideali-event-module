import { Box, Button, Flex } from "@chakra-ui/react"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import type { CustomListSortOrder } from "@/api/customLists"

interface SortableColumnHeaderProps<TColumn extends string> {
  label: string
  column: TColumn
  activeSortBy: TColumn
  activeSortOrder: CustomListSortOrder
  onSortChange: (column: TColumn) => void
  justify?: "flex-start" | "center"
}

export function SortableColumnHeader<TColumn extends string>({
  label,
  column,
  activeSortBy,
  activeSortOrder,
  onSortChange,
  justify = "flex-start",
}: SortableColumnHeaderProps<TColumn>) {
  const isActive = activeSortBy === column

  return (
    <Button
      type="button"
      variant="plain"
      h="auto"
      p={0}
      w="full"
      fontSize="inherit"
      fontWeight="inherit"
      color={isActive ? "brand.600" : "inherit"}
      cursor="pointer"
      aria-sort={isActive ? (activeSortOrder === "asc" ? "ascending" : "descending") : "none"}
      title={`Sort by ${label}`}
      onClick={() => onSortChange(column)}
    >
      <Flex align="center" justify={justify} gap={1} w="full">
        {label}
        {isActive ? (
          activeSortOrder === "asc" ? (
            <ArrowUp size={13} />
          ) : (
            <ArrowDown size={13} />
          )
        ) : (
          <Box color="gray.400" display="flex">
            <ChevronsUpDown size={13} />
          </Box>
        )}
      </Flex>
    </Button>
  )
}
