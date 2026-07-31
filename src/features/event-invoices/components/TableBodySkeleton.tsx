import { Skeleton, Table } from "@chakra-ui/react"

interface TableBodySkeletonProps {
  columns: number
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
