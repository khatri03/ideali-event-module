import { Box, Button, Flex, Heading, Input, Stack, Text } from "@chakra-ui/react"
import { Search } from "lucide-react"
import { ErrorState, TablePagination } from "@/components/common"
import { useConfirmationRequest } from "@/hooks/useConfirmationRequest"
import type { AttendeeTicketResend } from "@/features/events/hooks/useResendAttendeeTicket"
import { ATTENDEE_SCOPES, type AttendeeRoster, type AttendeeScope } from "@/features/events/schemas/eventCheckIn.schemas"
import { AttendeeRosterTable } from "./AttendeeRosterTable"
import { AttendeeRosterTableSkeleton } from "./AttendeeRosterTable.skeleton"
import { CheckInConfirmDialog } from "./CheckInConfirmDialog"

interface AttendeeRosterPanelProps {
  roster: AttendeeRoster | undefined
  isLoading: boolean
  isError: boolean
  search: string
  scope: AttendeeScope
  page: number
  pageSize: number
  busyTicketCode: string | null
  sendingTicketUniqueId: string | null
  onSearchChange: (search: string) => void
  onScopeChange: (scope: AttendeeScope) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onCheckIn: (ticketCode: string) => void
  onUndo: (ticketCode: string) => void
  onSendTicket: (ticket: AttendeeTicketResend) => void
}

const SCOPE_LABELS: Record<AttendeeScope, string> = {
  All: "Everyone",
  Expected: "Still expected",
  Arrived: "Arrived",
}

type RosterConfirmation =
  | { kind: "manualCheckIn"; ticketCode: string }
  | { kind: "undoCheckIn"; ticketCode: string }
  | { kind: "sendTicket"; ticketCode: string; ticket: AttendeeTicketResend }

export function AttendeeRosterPanel({
  roster,
  isLoading,
  isError,
  search,
  scope,
  page,
  pageSize,
  busyTicketCode,
  sendingTicketUniqueId,
  onSearchChange,
  onScopeChange,
  onPageChange,
  onPageSizeChange,
  onCheckIn,
  onUndo,
  onSendTicket,
}: AttendeeRosterPanelProps) {
  const attendees = roster?.attendees.pageData ?? []
  const total = roster?.attendees.totalRecordsCount ?? 0
  const confirmation = useConfirmationRequest<RosterConfirmation>()

  function requestSend(ticket: AttendeeTicketResend) {
    const attendee = attendees.find((row) => row.ticketUniqueId === ticket.ticketUniqueId)
    if (!attendee) {
      return
    }

    confirmation.open({ kind: "sendTicket", ticketCode: attendee.ticketCode, ticket })
  }

  function runConfirmedAction(request: RosterConfirmation) {
    if (request.kind === "sendTicket") {
      onSendTicket(request.ticket)
    } else if (request.kind === "undoCheckIn") {
      onUndo(request.ticketCode)
    } else {
      onCheckIn(request.ticketCode)
    }
  }

  return (
    <Box
      border="1px solid"
      borderColor="border.subtle"
      borderRadius="20px"
      bg="card.bg"
      boxShadow="card"
      p={{ base: 4, md: 6 }}
    >
      <Stack gap={5}>
        <Flex direction={{ base: "column", sm: "row" }} align={{ sm: "baseline" }} justify="space-between" gap={2}>
          <Heading fontSize={{ base: "lg", md: "xl" }} fontWeight="800" letterSpacing="-0.02em" color="text.primary">
            Attendees
          </Heading>
          <Text fontSize={{ base: "xs", md: "sm" }} color="text.secondary">
            {total === 1 ? "1 ticket" : `${total} tickets`}
          </Text>
        </Flex>

        <Flex position="relative" align="center" w="full">
          <Box position="absolute" left={4} color="text.secondary" pointerEvents="none" display="flex">
            <Search size={16} />
          </Box>
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by invoice number, name, email or ticket code"
            aria-label="Search attendees"
            minH="11"
            borderRadius="14px"
            pl={10}
            pr={4}
          />
        </Flex>

        <Stack direction="row" gap={2} overflowX="auto" pb={1}>
          {ATTENDEE_SCOPES.map((option) => (
            <Button
              key={option}
              size="sm"
              minH="11"
              px={5}
              borderRadius="999px"
              fontWeight="700"
              flexShrink={0}
              cursor="pointer"
              variant={scope === option ? "solid" : "outline"}
              color={scope === option ? "white" : undefined}
              bg={scope === option ? "brand.gradient" : undefined}
              onClick={() => onScopeChange(option)}
            >
              {SCOPE_LABELS[option]}
            </Button>
          ))}
        </Stack>

        {isError ? (
          <ErrorState
            title="Attendee list unavailable"
            message="The list could not be loaded. Scanning still works - a ticket is checked by its code, not by this list."
          />
        ) : null}
        {!isError && isLoading ? <AttendeeRosterTableSkeleton /> : null}

        {!isError && !isLoading ? (
          <AttendeeRosterTable
            attendees={attendees}
            busyTicketCode={busyTicketCode}
            sendingTicketUniqueId={sendingTicketUniqueId}
            onCheckIn={(ticketCode) => confirmation.open({ kind: "manualCheckIn", ticketCode })}
            onUndo={(ticketCode) => confirmation.open({ kind: "undoCheckIn", ticketCode })}
            onSendTicket={requestSend}
          />
        ) : null}

        {total > pageSize ? (
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalPages={Math.ceil(total / pageSize)}
            total={total}
            itemLabel="attendee"
            size="sm"
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        ) : null}

        {confirmation.request !== null ? (
          <CheckInConfirmDialog
            kind={confirmation.request.kind}
            ticketCode={confirmation.request.ticketCode}
            isOpen={confirmation.isOpen}
            onConfirm={() => confirmation.confirm(runConfirmedAction)}
            onCancel={confirmation.close}
          />
        ) : null}
      </Stack>
    </Box>
  )
}
