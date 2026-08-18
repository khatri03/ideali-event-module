import { Badge, Box, Button, Stack, Table, Text } from "@chakra-ui/react"
import type { AttendeeTicketResend } from "@/features/events/hooks/useResendAttendeeTicket"
import type { Attendee } from "@/features/events/schemas/eventCheckIn.schemas"
import { OutstandingBalanceBadge } from "./OutstandingBalanceBadge"

interface AttendeeRosterTableProps {
  attendees: Attendee[]
  outstandingCurrency: string | null
  busyTicketCode: string | null
  sendingTicketUniqueId: string | null
  onCheckIn: (ticketCode: string) => void
  onUndo: (ticketCode: string) => void
  onSendTicket: (ticket: AttendeeTicketResend) => void
}

const COLUMNS = [
  { label: "Attendee", align: "start" },
  { label: "Ticket", align: "start" },
  { label: "Invoice", align: "start" },
  { label: "Status", align: "start" },
  { label: "Arrived at", align: "start" },
  { label: "Actions", align: "end" },
] as const

function formatArrival(checkedInAtUtc: string | null): string {
  if (!checkedInAtUtc) {
    return "—"
  }

  const parsed = new Date(checkedInAtUtc)
  return Number.isNaN(parsed.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-US", { timeStyle: "short" }).format(parsed)
}

export function AttendeeRosterTable({
  attendees,
  outstandingCurrency,
  busyTicketCode,
  sendingTicketUniqueId,
  onCheckIn,
  onUndo,
  onSendTicket,
}: AttendeeRosterTableProps) {
  if (attendees.length === 0) {
    return (
      <Box borderWidth="1px" borderColor="border.subtle" borderRadius="16px" px={6} py={10} textAlign="center">
        <Text fontSize="md" fontWeight="700" color="text.primary">
          No attendee matches this search
        </Text>
        <Text mt={2} fontSize="sm" color="text.secondary">
          Try the invoice number, or part of the guest's name.
        </Text>
      </Box>
    )
  }

  return (
    <Box overflowX="auto" borderWidth="1px" borderColor="border.subtle" borderRadius="16px">
      <Table.Root size="sm" minW="880px">
        <Table.Caption srOnly>Every ticket issued for this session</Table.Caption>
        <Table.Header>
          <Table.Row bg="app.bg">
            {COLUMNS.map((column) => (
              <Table.ColumnHeader key={column.label} px={4} py={3} textAlign={column.align}>
                <Text
                  fontSize="xs"
                  fontWeight="700"
                  color="text.secondary"
                  textTransform="uppercase"
                  letterSpacing="0.06em"
                >
                  {column.label}
                </Text>
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {attendees.map((attendee) => {
            const hasArrived = attendee.ticketStatus === "CheckedIn"
            const isBusy = busyTicketCode === attendee.ticketCode
            const isSending = sendingTicketUniqueId === attendee.ticketUniqueId
            // Without the order behind it there is nowhere to send the ticket from, so the action is
            // withheld rather than offered and then refused by the server.
            const canSendTicket = attendee.invoiceUniqueId !== ""

            return (
              <Table.Row key={attendee.ticketUniqueId} _hover={{ bg: "app.bg" }} transition="background 0.15s">
                <Table.Cell px={4} py={4}>
                  <Text fontSize="sm" fontWeight="700" color="text.primary">
                    {attendee.attendeeName ?? "Unnamed attendee"}
                  </Text>
                  {attendee.attendeeEmail ? (
                    <Text mt={1} fontSize="xs" color="text.secondary">
                      {attendee.attendeeEmail}
                    </Text>
                  ) : null}
                </Table.Cell>
                <Table.Cell px={4} py={4}>
                  <Text fontFamily="mono" fontSize="xs" color="text.primary">
                    {attendee.ticketCode}
                  </Text>
                  <Text mt={1} fontSize="xs" color="text.secondary">
                    {attendee.ticketTypeName}
                  </Text>
                </Table.Cell>
                <Table.Cell px={4} py={4}>
                  <Text fontFamily="mono" fontSize="xs" color="text.primary">
                    {attendee.invoiceNo || "—"}
                  </Text>
                  {attendee.outstandingAmount ? (
                    <OutstandingBalanceBadge amount={attendee.outstandingAmount} currency={outstandingCurrency} />
                  ) : null}
                </Table.Cell>
                <Table.Cell px={4} py={4}>
                  <Badge
                    px={3}
                    py={1}
                    borderRadius="999px"
                    fontWeight="700"
                    bg={hasArrived ? "status.success.bg" : "status.warning.bg"}
                    color={hasArrived ? "status.success.fg" : "status.warning.fg"}
                  >
                    {hasArrived ? "Arrived" : "Expected"}
                  </Badge>
                </Table.Cell>
                <Table.Cell px={4} py={4}>
                  <Text fontSize="xs" color="text.secondary">
                    {formatArrival(attendee.checkedInAtUtc)}
                  </Text>
                </Table.Cell>
                <Table.Cell px={4} py={4} textAlign="end">
                  <Stack direction="row" gap={2} justify="flex-end">
                    {canSendTicket ? (
                      <Button
                        size="xs"
                        minH="11"
                        px={4}
                        borderRadius="12px"
                        fontWeight="700"
                        variant="ghost"
                        aria-label={`Send ticket ${attendee.ticketCode} again`}
                        cursor={isSending ? "not-allowed" : "pointer"}
                        disabled={isSending}
                        loading={isSending}
                        onClick={() =>
                          onSendTicket({
                            invoiceUniqueId: attendee.invoiceUniqueId,
                            ticketUniqueId: attendee.ticketUniqueId,
                          })
                        }
                      >
                        Send ticket
                      </Button>
                    ) : null}
                    <Button
                      size="xs"
                      minH="11"
                      px={4}
                      borderRadius="12px"
                      fontWeight="700"
                      variant={hasArrived ? "outline" : "solid"}
                      color={hasArrived ? undefined : "white"}
                      bg={hasArrived ? undefined : "brand.gradient"}
                      // A table of identically named buttons tells a screen reader nothing, and the
                      // label has to survive the button going into its loading state.
                      aria-label={
                        hasArrived ? `Undo check-in for ${attendee.ticketCode}` : `Check in ${attendee.ticketCode}`
                      }
                      cursor={isBusy ? "not-allowed" : "pointer"}
                      disabled={isBusy}
                      loading={isBusy}
                      onClick={() => (hasArrived ? onUndo(attendee.ticketCode) : onCheckIn(attendee.ticketCode))}
                    >
                      {hasArrived ? "Undo" : "Check in"}
                    </Button>
                  </Stack>
                </Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}
