import { Box, Flex, Heading, Stack, Text, Link as ChakraLink } from "@chakra-ui/react"
import { Link as RouterLink } from "react-router-dom"
import { formatRegistrationDateTime } from "@/features/events/utils/registrationFormat"
import type { EventOrderTicket } from "@/features/events/schemas/eventOrder.schemas"
import { APP_ROUTES } from "@/utils/routes"

interface OrderTicketListProps {
  tickets: EventOrderTicket[]
}

export function OrderTicketList({ tickets }: OrderTicketListProps) {
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
      <Stack gap={3}>
        {tickets.map((ticket) => (
          <TicketRow key={ticket.ticketUniqueId} ticket={ticket} />
        ))}
      </Stack>
    </Box>
  )
}

function TicketRow({ ticket }: { ticket: EventOrderTicket }) {
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
        <Text fontSize="xs" color="gray.600" wordBreak="break-word">
          {ticket.sessionName}
          {ticket.sessionStartDateUtc ? ` · ${formatRegistrationDateTime(ticket.sessionStartDateUtc)}` : ""}
        </Text>
        <Text fontSize="xs" fontWeight="700" color="gray.500" letterSpacing="0.06em">
          {ticket.ticketCode}
        </Text>
      </Stack>

      {isVoid ? (
        <Text fontSize="xs" fontWeight="700" color="red.600" textTransform="uppercase" letterSpacing="0.06em">
          {ticket.ticketStatus}
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
