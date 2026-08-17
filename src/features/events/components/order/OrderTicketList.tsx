import { Box, Flex, Heading, Stack, Text, Link as ChakraLink } from "@chakra-ui/react"
import { Link as RouterLink } from "react-router-dom"
import { formatRegistrationDateTime } from "@/features/events/utils/registrationFormat"
import type { EventOrderTicket } from "@/features/events/schemas/eventOrder.schemas"
import { groupInOrder } from "@/utils/collections"
import { APP_ROUTES } from "@/utils/routes"

interface OrderTicketListProps {
  tickets: EventOrderTicket[]
  /**
   * Whether the order has settled. The ticket view refuses an unsettled order anyway - this only keeps
   * a buyer whose bank transfer is still clearing from being offered a pass that will not open.
   */
  canViewTickets: boolean
}

export function OrderTicketList({ tickets, canViewTickets }: OrderTicketListProps) {
  if (tickets.length === 0) return null

  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="24px"
      bg="white"
      p={{ base: 5, md: 6 }}
      boxShadow="0 16px 40px rgba(15, 23, 42, 0.06)"
    >
      <Heading fontSize={{ base: "sm", md: "md" }} color="gray.900" mb={4}>
        {tickets.length === 1 ? "Your ticket" : `Your ${tickets.length} tickets`}
      </Heading>
      <Stack gap={5}>
        {groupTicketsBySession(tickets).map((group) => (
          <Stack key={group.key} gap={3}>
            <SessionHeading ticket={group.items[0]} />

            {group.items.map((ticket) => (
              <TicketRow key={ticket.ticketUniqueId} ticket={ticket} canViewTicket={canViewTickets} />
            ))}
          </Stack>
        ))}
      </Stack>
    </Box>
  )
}

/** Tickets carry no session id, so the name and its start stand in for one. */
function groupTicketsBySession(tickets: EventOrderTicket[]) {
  return groupInOrder(tickets, (ticket) => `${ticket.sessionName}|${ticket.sessionStartDateUtc ?? ""}`)
}

function SessionHeading({ ticket }: { ticket: EventOrderTicket }) {
  if (!ticket.sessionName) return null

  return (
    <Stack gap={0.5}>
      <Text fontSize="sm" fontWeight="800" color="gray.900" wordBreak="break-word">
        {ticket.sessionName}
      </Text>
      {ticket.sessionStartDateUtc ? (
        <Text fontSize="xs" color="gray.500">
          {formatRegistrationDateTime(ticket.sessionStartDateUtc)}
        </Text>
      ) : null}
    </Stack>
  )
}

function TicketRow({ ticket, canViewTicket }: { ticket: EventOrderTicket; canViewTicket: boolean }) {
  const isVoid = ticket.ticketStatus === "Cancelled" || ticket.ticketStatus === "Refunded"

  return (
    <Flex
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="16px"
      bg="gray.50"
      px={4}
      py={3}
      gap={3}
      align={{ base: "stretch", md: "center" }}
      justify="space-between"
      direction={{ base: "column", md: "row" }}
    >
      <Stack gap={1} minW="0" flex="1">
        <Text fontSize="sm" fontWeight="700" color="gray.900" wordBreak="break-word">
          {ticket.ticketTypeName}
          {ticket.attendeeName ? ` · ${ticket.attendeeName}` : ""}
        </Text>
        <Text fontSize="xs" fontWeight="700" color="gray.500" letterSpacing="0.06em">
          {ticket.ticketCode}
        </Text>
      </Stack>

      {isVoid ? (
        <Text fontSize="xs" fontWeight="700" color="red.600" textTransform="uppercase" letterSpacing="0.06em">
          {ticket.ticketStatus}
        </Text>
      ) : !canViewTicket ? (
        <Text fontSize="xs" color="gray.500" whiteSpace={{ md: "nowrap" }}>
          Available once payment clears
        </Text>
      ) : (
        <ChakraLink
          asChild
          fontSize="sm"
          fontWeight="700"
          color="blue.600"
          minH="11"
          display="inline-flex"
          alignItems="center"
          cursor="pointer"
        >
          <RouterLink to={APP_ROUTES.eventTicketView(ticket.ticketUniqueId)}>View ticket</RouterLink>
        </ChakraLink>
      )}
    </Flex>
  )
}
