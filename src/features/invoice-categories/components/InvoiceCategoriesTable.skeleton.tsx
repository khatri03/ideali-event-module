import { Skeleton, Table } from "@chakra-ui/react"

interface InvoiceCategoriesTableSkeletonProps {
  columns: number
  rows?: number
}

export function InvoiceCategoriesTableSkeleton({
  columns,
  rows = 3,
}: InvoiceCategoriesTableSkeletonProps) {
  return (
    <Table.Body>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <Table.Row key={rowIndex} data-testid="category-skeleton-row">
          {Array.from({ length: columns }, (_, columnIndex) => (
            <Table.Cell key={columnIndex} px={4} py={3}>
              <Skeleton height="16px" borderRadius="6px" />
            </Table.Cell>
          ))}
        </Table.Row>
      ))}
    </Table.Body>
  )
}
