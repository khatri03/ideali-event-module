import { Box, Container, Text } from '@chakra-ui/react'
import { useParams, useSearchParams } from 'react-router-dom'
import { TicketStub, TicketStubSkeleton } from '@/features/events/components/ticket'
import { useEventTicketView } from '@/features/events/hooks/useEventTicketView'
import { extractApiError } from '@/utils/errors'

/**
 * Public, unauthenticated view of one issued ticket. It doubles as the source the PDF renderer
 * loads, so it deliberately carries no navigation, no fixed heights and nothing that paints after
 * the network settles.
 */
export function EventTicketViewPage() {
  const { ticketUniqueId } = useParams<{ ticketUniqueId: string }>()
  const [searchParams] = useSearchParams()
  const { data: ticket, isLoading, isError, error } = useEventTicketView(ticketUniqueId)

  // The renderer appends ?pdf=true; the printed sheet carries no supporting copy.
  const isPdfRender = searchParams.get('pdf') === 'true'

  return (
    <Box minH="100%" bg="gray.50" py={{ base: 6, md: 10 }} px={{ base: 4, md: 6 }}>
      <Container maxW="3xl" px={0}>
        {isLoading ? <TicketStubSkeleton /> : null}

        {isError ? (
          <Box borderWidth="1px" borderColor="red.200" borderRadius="16px" bg="red.50" px={5} py={4} role="alert">
            <Text fontSize="sm" fontWeight="700" color="red.700">
              {extractApiError(error)}
            </Text>
          </Box>
        ) : null}

        {ticket ? <TicketStub ticket={ticket} /> : null}

        {ticket && !isPdfRender ? (
          <Text mt={4} fontSize="xs" color="gray.600" textAlign="center">
            Present this ticket at the entrance. Keep the code private until you arrive.
          </Text>
        ) : null}
      </Container>
    </Box>
  )
}
