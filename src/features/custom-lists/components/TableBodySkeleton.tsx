import { Skeleton, Table } from "@chakra-ui/react"

interface TableBodySkeletonProps {
  /** Number of columns in the table, so the skeleton lines up with the real header. */
  columns: number
  /** Number of placeholder rows — pass the current page size to keep the table height stable. */
  rows: number
}

export function TableBodySkeleton({ columns, rows }: TableBodySkeletonProps) {
  return (
    <Table.Body>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <Table.Row key={rowIndex}>
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
