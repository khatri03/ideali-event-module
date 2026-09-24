import { Badge, Box, Skeleton, Table, Text } from "@chakra-ui/react"
import type { EventInvoiceCategoryListItem } from "@/api/eventInvoiceCategories"
import { EMPTY_VALUE } from "@/utils/format"
import { formatDate } from "../constants"

interface EventInvoiceCategoriesTableProps {
  categories: EventInvoiceCategoryListItem[]
  isFetching: boolean
}

const COLUMN_COUNT = 4

function ColumnHeader({ label, align = "start" }: { label: string; align?: "start" | "center" | "end" }) {
  return (
    <Table.ColumnHeader px={4} py={3} textAlign={align}>
      <Text fontSize="xs" fontWeight="700" color="text.secondary" textTransform="uppercase" letterSpacing="0.06em">
        {label}
      </Text>
    </Table.ColumnHeader>
  )
}

function SkeletonRows() {
  return (
    <Table.Body>
      {Array.from({ length: 3 }, (_, rowIndex) => (
        <Table.Row key={rowIndex} data-testid="category-skeleton-row">
          {Array.from({ length: COLUMN_COUNT }, (_, columnIndex) => (
            <Table.Cell key={columnIndex} px={4} py={3}>
              <Skeleton height="16px" borderRadius="6px" />
            </Table.Cell>
          ))}
        </Table.Row>
      ))}
    </Table.Body>
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

export function EventInvoiceCategoriesTable({ categories, isFetching }: EventInvoiceCategoriesTableProps) {
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
            <ColumnHeader label="Name" />
            <ColumnHeader label="Status" align="center" />
            <ColumnHeader label="Display order" align="end" />
            <ColumnHeader label="Created" align="center" />
          </Table.Row>
        </Table.Header>

        {isFetching ? (
          <SkeletonRows />
        ) : categories.length === 0 ? (
          <EmptyRow />
        ) : (
          <Table.Body>
            {categories.map((category) => (
              <Table.Row key={category.uniqueId} _hover={{ bg: "app.bg" }} transition="background 0.15s">
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
