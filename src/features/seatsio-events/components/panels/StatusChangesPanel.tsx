import { useState } from "react"
import { Badge, Box, Button, Flex, Table, Text } from "@chakra-ui/react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { format } from "date-fns"
import { useEventStatusChanges } from "../../hooks/useEventReports"
import { ReportEmpty, ReportError, ReportPanelShell, ReportSkeleton } from "../ReportStates"

interface StatusChangesPanelProps {
  eventUniqueId: string
}

function statusPalette(status: string): string {
  const normalized = status.toLowerCase()
  if (normalized === "booked") return "green"
  if (normalized === "free") return "gray"
  if (normalized === "held") return "orange"
  return "purple"
}

function formatWhen(dateUtc: string | null): string {
  if (!dateUtc) {
    return "—"
  }

  const parsed = new Date(dateUtc)
  return Number.isNaN(parsed.getTime()) ? "—" : format(parsed, "d MMM yyyy, HH:mm")
}

export function StatusChangesPanel({ eventUniqueId }: StatusChangesPanelProps) {
  const [cursor, setCursor] = useState<number | null>(null)
  const [history, setHistory] = useState<(number | null)[]>([])
  const query = useEventStatusChanges(eventUniqueId, cursor, true)

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

  if (query.data.items.length === 0 && history.length === 0) {
    return (
      <ReportEmpty
        title="No status changes yet"
        description="When seats are held, booked or released for this event, the history shows up here."
      />
    )
  }

  const nextCursor = query.data.nextPageStartsAfter
  const canGoBack = history.length > 0

  function goNext() {
    if (nextCursor === null) {
      return
    }
    setHistory((previous) => [...previous, cursor])
    setCursor(nextCursor)
  }

  function goBack() {
    setHistory((previous) => {
      const copy = [...previous]
      const last = copy.pop() ?? null
      setCursor(last)
      return copy
    })
  }

  return (
    <ReportPanelShell>
      <Box overflowX="auto" borderRadius="14px" border="1px solid" borderColor="border.subtle">
        <Table.Root variant="line" size="sm" minW={{ base: "860px", lg: "auto" }}>
          <Table.Header>
            <Table.Row bg="app.bg">
              <Table.ColumnHeader px={4} py={3}>Object</Table.ColumnHeader>
              <Table.ColumnHeader px={4} py={3}>Status</Table.ColumnHeader>
              <Table.ColumnHeader px={4} py={3} textAlign="end">Quantity</Table.ColumnHeader>
              <Table.ColumnHeader px={4} py={3}>Hold token</Table.ColumnHeader>
              <Table.ColumnHeader px={4} py={3}>Order</Table.ColumnHeader>
              <Table.ColumnHeader px={4} py={3}>Origin</Table.ColumnHeader>
              <Table.ColumnHeader px={4} py={3}>When</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {query.data.items.map((change, index) => (
              <Table.Row key={`${change.objectLabel}-${index}`}>
                <Table.Cell px={4} py={3}>
                  <Text fontSize="sm" fontWeight="700" color="text.primary">
                    {change.objectLabel || "—"}
                  </Text>
                </Table.Cell>
                <Table.Cell px={4} py={3}>
                  <Badge variant="subtle" colorPalette={statusPalette(change.status)} borderRadius="999px" px={3} py={1}>
                    {change.status || "Unknown"}
                  </Badge>
                </Table.Cell>
                <Table.Cell px={4} py={3} textAlign="end">
                  <Text fontSize="sm" color="text.primary" fontVariantNumeric="tabular-nums">
                    {change.quantity}
                  </Text>
                </Table.Cell>
                <Table.Cell px={4} py={3}>
                  <Text fontSize="sm" color="text.secondary" fontFamily="mono" wordBreak="break-all">
                    {change.holdToken || "—"}
                  </Text>
                </Table.Cell>
                <Table.Cell px={4} py={3}>
                  <Text fontSize="sm" color="text.secondary" wordBreak="break-all">
                    {change.orderId || "—"}
                  </Text>
                </Table.Cell>
                <Table.Cell px={4} py={3}>
                  <Text fontSize="sm" color="text.secondary">
                    {change.origin || "—"}
                  </Text>
                </Table.Cell>
                <Table.Cell px={4} py={3}>
                  <Text fontSize="sm" color="text.secondary" whiteSpace="nowrap">
                    {formatWhen(change.dateUtc)}
                  </Text>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>

      <Flex justify="flex-end" gap={2} mt={4}>
        <Button
          minH="11"
          px={4}
          variant="outline"
          disabled={!canGoBack || query.isFetching}
          onClick={goBack}
        >
          <ArrowLeft size={16} />
          Previous
        </Button>
        <Button
          minH="11"
          px={4}
          variant="outline"
          disabled={nextCursor === null || query.isFetching}
          loading={query.isFetching}
          onClick={goNext}
        >
          Next
          <ArrowRight size={16} />
        </Button>
      </Flex>
    </ReportPanelShell>
  )
}
