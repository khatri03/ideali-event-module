import { Badge, Box, Button, Menu, Portal, Table, Text } from "@chakra-ui/react"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import type { EventInvoiceCategoryListItem } from "@/api/eventInvoiceCategories"
import { EMPTY_VALUE } from "@/utils/format"
import { formatDate } from "../constants"
import { EventInvoiceCategoriesTableSkeleton } from "./EventInvoiceCategoriesTable.skeleton"

interface EventInvoiceCategoriesTableProps {
  categories: EventInvoiceCategoryListItem[]
  isLoading: boolean
  onEdit: (category: EventInvoiceCategoryListItem) => void
  onDelete: (category: EventInvoiceCategoryListItem) => void
}

const COLUMN_COUNT = 5

function ColumnHeader({
  label,
  align = "start",
  width,
}: {
  label: string
  align?: "start" | "center" | "end"
  width?: string
}) {
  return (
    <Table.ColumnHeader px={4} py={3} textAlign={align} w={width}>
      <Text fontSize="xs" fontWeight="700" color="text.secondary" textTransform="uppercase" letterSpacing="0.06em">
        {label}
      </Text>
    </Table.ColumnHeader>
  )
}

function RowActionsMenu({
  category,
  onEdit,
  onDelete,
}: {
  category: EventInvoiceCategoryListItem
  onEdit: (category: EventInvoiceCategoryListItem) => void
  onDelete: (category: EventInvoiceCategoryListItem) => void
}) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          variant="outline"
          borderRadius="full"
          h={{ base: "44px", md: "34px" }}
          w={{ base: "44px", md: "34px" }}
          minW={{ base: "44px", md: "34px" }}
          p={0}
          cursor="pointer"
          aria-label={`Actions for ${category.name}`}
        >
          <MoreHorizontal size={15} />
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content borderRadius="12px" p={1}>
            <Menu.Item value="edit" onClick={() => onEdit(category)} cursor="pointer" px={3} py={2} borderRadius="8px">
              <Pencil size={14} />
              Edit
            </Menu.Item>
            <Menu.Item
              value="delete"
              onClick={() => onDelete(category)}
              color="red.600"
              cursor="pointer"
              px={3}
              py={2}
              borderRadius="8px"
            >
              <Trash2 size={14} />
              Delete
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}

function EmptyRow() {
  return (
    <Table.Body>
      <Table.Row>
        <Table.Cell colSpan={COLUMN_COUNT} py={14}>
          <Box textAlign="center">
            <Text fontSize="lg" fontWeight="700" color="text.primary">
              No invoice categories yet
            </Text>
            <Text mt={2} fontSize="sm" color="text.secondary" maxW="md" mx="auto">
              Create your first category to bill custom invoices under a sponsorship type. Use the "New
              category" button above.
            </Text>
          </Box>
        </Table.Cell>
      </Table.Row>
    </Table.Body>
  )
}

export function EventInvoiceCategoriesTable({
  categories,
  isLoading,
  onEdit,
  onDelete,
}: EventInvoiceCategoriesTableProps) {
  return (
    <Box overflowX="auto">
      <Table.Root
        variant="line"
        size="sm"
        css={{ "& th, & td": { border: "1px solid", borderColor: "border.subtle" } }}
      >
        <Table.Caption srOnly>Your invoice categories</Table.Caption>
        <Table.Header>
          <Table.Row bg="app.bg">
            <ColumnHeader label="Actions" align="center" width="70px" />
            <ColumnHeader label="Name" />
            <ColumnHeader label="Status" align="center" />
            <ColumnHeader label="Display order" align="end" />
            <ColumnHeader label="Created" align="center" />
          </Table.Row>
        </Table.Header>

        {isLoading ? (
          <EventInvoiceCategoriesTableSkeleton columns={COLUMN_COUNT} />
        ) : categories.length === 0 ? (
          <EmptyRow />
        ) : (
          <Table.Body>
            {categories.map((category) => (
              <Table.Row key={category.uniqueId} _hover={{ bg: "app.bg" }} transition="background 0.15s">
                <Table.Cell px={4} py={4} textAlign="center">
                  <RowActionsMenu category={category} onEdit={onEdit} onDelete={onDelete} />
                </Table.Cell>
                <Table.Cell px={4} py={4}>
                  <Text fontSize="sm" fontWeight="700" color="brand.600" lineClamp={1}>
                    {category.name}
                  </Text>
                </Table.Cell>
                <Table.Cell px={4} py={4} textAlign="center">
                  <Badge
                    colorPalette={category.isActive ? "green" : "gray"}
                    variant="subtle"
                    textTransform="uppercase"
                    letterSpacing="0.08em"
                    fontSize="10px"
                    fontWeight="800"
                  >
                    {category.isActive ? "Active" : "Inactive"}
                  </Badge>
                </Table.Cell>
                <Table.Cell px={4} py={4} textAlign="right">
                  <Text fontSize="sm" color="text.secondary">
                    {category.displayOrder || EMPTY_VALUE}
                  </Text>
                </Table.Cell>
                <Table.Cell px={4} py={4} textAlign="center">
                  <Text fontSize="sm" color="text.secondary">
                    {formatDate(category.createdOnUtc)}
                  </Text>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        )}
      </Table.Root>
    </Box>
  )
}
