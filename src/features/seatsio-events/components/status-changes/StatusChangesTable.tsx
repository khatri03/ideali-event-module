import { Badge, Box, Button, Table, Text } from "@chakra-ui/react"
import { SortableColumnHeader } from "@/components/common"
import type { SeatsIoEventStatusChange, StatusChangeSort } from "@/api/seatsio"
import {
  formatStatusChangeTime,
  sortDirectionFor,
  statusChangePalette,
  type StatusChangeSortColumn,
} from "../../utils/statusChangeDisplay"

interface StatusChangesTableProps {
  changes: SeatsIoEventStatusChange[]
  sort: StatusChangeSort
  canSort: boolean
  onSort: (column: StatusChangeSortColumn) => void
  onObjectSelect: (objectLabel: string) => void
}

function PlainHeader({ label, isNumeric = false }: { label: string; isNumeric?: boolean }) {
  return (
    <Table.ColumnHeader px={4} py={3} textAlign={isNumeric ? "end" : undefined}>
      {label}
    </Table.ColumnHeader>
  )
}

function MutedCell({ value, isMono = false }: { value: string; isMono?: boolean }) {
  return (
    <Table.Cell px={4} py={3}>
      <Text fontSize="sm" color="text.secondary" fontFamily={isMono ? "mono" : undefined} wordBreak="break-all">
        {value || "—"}
      </Text>
    </Table.Cell>
  )
}

function StatusChangeRow({
  change,
  onObjectSelect,
}: {
  change: SeatsIoEventStatusChange
  onObjectSelect: (objectLabel: string) => void
}) {
  return (
    <Table.Row>
      <Table.Cell px={4} py={3}>
        <Text fontSize="sm" color="text.primary" whiteSpace="nowrap" fontVariantNumeric="tabular-nums">
          {formatStatusChangeTime(change.dateUtc)}
        </Text>
      </Table.Cell>
      <Table.Cell px={2} py={1}>
        {change.objectLabel ? (
          <Button
            variant="plain"
            size="sm"
            minH="11"
            px={2}
            fontWeight="700"
            color="brand.500"
            cursor="pointer"
            _hover={{ textDecoration: "underline" }}
            onClick={() => onObjectSelect(change.objectLabel)}
            aria-label={`Show the history of ${change.objectLabel}`}
          >
            {change.objectLabel}
          </Button>
        ) : (
          <Text px={2} fontSize="sm" color="text.secondary">—</Text>
        )}
      </Table.Cell>
      <Table.Cell px={4} py={3}>
        <Badge
          variant="subtle"
          colorPalette={statusChangePalette(change.status)}
          borderRadius="999px"
          px={3}
          py={1}
          fontFamily="mono"
          textTransform="none"
        >
          {change.status || "—"}
        </Badge>
      </Table.Cell>
      <Table.Cell px={4} py={3} textAlign="end">
        <Text fontSize="sm" color="text.primary" fontVariantNumeric="tabular-nums">
          {change.quantity}
        </Text>
      </Table.Cell>
      <MutedCell value={change.holdToken} isMono />
      <MutedCell value={change.orderId} />
      <MutedCell value={change.origin} />
    </Table.Row>
  )
}

export function StatusChangesTable({ changes, sort, canSort, onSort, onObjectSelect }: StatusChangesTableProps) {
  return (
    <Box overflowX="auto" borderRadius="14px" border="1px solid" borderColor="border.subtle">
      <Table.Root variant="line" size="sm" minW={{ base: "960px", xl: "auto" }}>
        <Table.Header>
          <Table.Row bg="app.bg">
            <SortableColumnHeader
              label="Date"
              direction={sortDirectionFor(sort, "date")}
              isDisabled={!canSort}
              onSort={() => onSort("date")}
            />
            <SortableColumnHeader
              label="Object"
              direction={sortDirectionFor(sort, "objectLabel")}
              isDisabled={!canSort}
              onSort={() => onSort("objectLabel")}
            />
            <SortableColumnHeader
              label="Status"
              direction={sortDirectionFor(sort, "status")}
              isDisabled={!canSort}
              onSort={() => onSort("status")}
            />
            <PlainHeader label="Qty" isNumeric />
            <PlainHeader label="Hold token" />
            <PlainHeader label="Order" />
            <PlainHeader label="Origin" />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {changes.map((change, index) => (
            <StatusChangeRow
              key={`${change.dateUtc ?? ""}-${change.objectLabel}-${index}`}
              change={change}
              onObjectSelect={onObjectSelect}
            />
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}
