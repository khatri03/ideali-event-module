import { Box, Flex, SimpleGrid, Stack, Text } from "@chakra-ui/react"
import { CalendarDays, MapPin, Ticket, User } from "lucide-react"
import type { EventTicketView } from "@/features/events/schemas/eventTicket.schemas"
import { formatRegistrationDateTime } from "@/features/events/utils/registrationFormat"
import { TicketFactRow } from "./TicketFactRow"
import { TicketQrPanel } from "./TicketQrPanel"
import { TicketVoidBanner } from "./TicketVoidBanner"

interface TicketStubProps {
  ticket: EventTicketView
}

const DEFAULT_ACCENT = "#111827"

function formatSessionWhen(ticket: EventTicketView) {
  if (!ticket.sessionStartDateUtc) {
    return "Date to be announced"
  }

  const start = formatRegistrationDateTime(ticket.sessionStartDateUtc)

  return ticket.sessionEndDateUtc ? `${start} - ${formatRegistrationDateTime(ticket.sessionEndDateUtc)}` : start
}

/**
 * One printed ticket. Kept free of fixed heights and internal scrolling so the PDF renderer, which
 * forces the page to auto height, gets the whole thing on a single A4 sheet.
 */
export function TicketStub({ ticket }: TicketStubProps) {
  const accentColor = ticket.eventThemeColor ?? DEFAULT_ACCENT
  const attendee = ticket.attendeeName ?? ticket.buyerName ?? "Ticket holder"

  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="20px"
      bg="white"
      overflow="hidden"
      css={{ breakInside: "avoid" }}
    >
      <Box bg={accentColor} px={{ base: 5, md: 7 }} py={{ base: 4, md: 5 }}>
        <Text fontSize="2xs" fontWeight="700" color="whiteAlpha.800" textTransform="uppercase" letterSpacing="0.12em">
          {ticket.organizerName}
        </Text>
        <Text fontSize={{ base: "lg", md: "2xl" }} fontWeight="900" color="white" letterSpacing="-0.02em">
          {ticket.eventName}
        </Text>
      </Box>

      <Stack gap={{ base: 5, md: 6 }} px={{ base: 5, md: 7 }} py={{ base: 5, md: 6 }}>
        {ticket.isValid ? null : <TicketVoidBanner ticketStatus={ticket.ticketStatus} />}

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={{ base: 5, md: 8 }} alignItems="start">
          <Stack gap={4}>
            <TicketFactRow icon={Ticket} label="Session" value={ticket.sessionName} helperText={ticket.ticketTypeName} />
            <TicketFactRow icon={CalendarDays} label="When" value={formatSessionWhen(ticket)} />
            {ticket.venueName ? (
              <TicketFactRow icon={MapPin} label="Where" value={ticket.venueName} helperText={ticket.venueAddress} />
            ) : null}
            <TicketFactRow icon={User} label="Attendee" value={attendee} />
          </Stack>

          <TicketQrPanel qrCodeBase64={ticket.qrCodeBase64} ticketCode={ticket.ticketCode} />
        </SimpleGrid>

        <Flex
          gap={{ base: 1, md: 4 }}
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          borderTopWidth="1px"
          borderColor="gray.200"
          pt={4}
        >
          {ticket.invoiceNo ? (
            <Text fontSize="xs" color="gray.600">
              Order {ticket.invoiceNo}
            </Text>
          ) : null}
          {ticket.checkedInAtUtc ? (
            <Text fontSize="xs" fontWeight="700" color="green.700">
              Checked in {formatRegistrationDateTime(ticket.checkedInAtUtc)}
            </Text>
          ) : null}
        </Flex>
      </Stack>
    </Box>
  )
}
