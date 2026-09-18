import { Badge, Box, Table, Text } from "@chakra-ui/react"
import { useEventStatuses } from "../../hooks/useEventReports"
import { ReportEmpty, ReportError, ReportPanelShell, ReportSkeleton } from "../ReportStates"

interface StatusesPanelProps {
  eventUniqueId: string
}

function statusPalette(status: string): string {
  const normalized = status.toLowerCase()
  if (normalized === "booked") return "green"
  if (normalized === "free") return "gray"
  if (normalized === "held") return "orange"
  return "purple"
}

export function StatusesPanel({ eventUniqueId }: StatusesPanelProps) {
  const query = useEventStatuses(eventUniqueId, true)

  if (query.isError) {
    return (
      <ReportPanelShell>
        <ReportError error={query.error} />
      </ReportPanelShell>
    )
  }

  if (query.isLoading || !query.data) {
    return (
      <ReportPanelShell>
        <ReportSkeleton />
      </ReportPanelShell>
    )
  }

  if (query.data.length === 0) {
    return (
      <ReportEmpty
        title="No objects to list"
        description="This event has no seats or areas drawn against it yet."
      />
    )
  }

  return (
    <ReportPanelShell>
      <Box overflowX="auto" borderRadius="14px" border="1px solid" borderColor="border.subtle">
        <Table.Root variant="line" size="sm" minW={{ base: "640px", md: "auto" }}>
          <Table.Header>
            <Table.Row bg="app.bg">
              <Table.ColumnHeader px={4} py={3}>Object</Table.ColumnHeader>
              <Table.ColumnHeader px={4} py={3}>Status</Table.ColumnHeader>
              <Table.ColumnHeader px={4} py={3}>Category</Table.ColumnHeader>
              <Table.ColumnHeader px={4} py={3}>Type</Table.ColumnHeader>
              <Table.ColumnHeader px={4} py={3}>Section</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {query.data.map((row, index) => (
              <Table.Row key={`${row.label}-${index}`}>
                <Table.Cell px={4} py={3}>
                  <Text fontSize="sm" fontWeight="700" color="text.primary">
                    {row.label || "—"}
                  </Text>
                </Table.Cell>
                <Table.Cell px={4} py={3}>
                  <Badge variant="subtle" colorPalette={statusPalette(row.status)} borderRadius="999px" px={3} py={1}>
                    {row.status || "Unknown"}
                  </Badge>
                </Table.Cell>
                <Table.Cell px={4} py={3}>
                  <Text fontSize="sm" color="text.secondary">
                    {row.categoryLabel || "—"}
                  </Text>
                </Table.Cell>
                <Table.Cell px={4} py={3}>
                  <Text fontSize="sm" color="text.secondary">
                    {row.objectType || "—"}
                  </Text>
                </Table.Cell>
                <Table.Cell px={4} py={3}>
                  <Text fontSize="sm" color="text.secondary">
                    {row.section || "—"}
                  </Text>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </ReportPanelShell>
  )
}
