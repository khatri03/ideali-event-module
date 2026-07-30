import { Box, Image, Text } from "@chakra-ui/react"

interface TicketQrPanelProps {
  qrCodeBase64: string | null
  ticketCode: string
}

/**
 * The scannable half of the ticket. The image is a data URI so it is painted with the rest of the
 * page - a second network request could still be in flight when the PDF renderer captures.
 *
 * The code is printed underneath on purpose: a smudged or unreadable QR should not stop someone
 * getting in, since the door endpoint looks the ticket up by that same code.
 */
export function TicketQrPanel({ qrCodeBase64, ticketCode }: TicketQrPanelProps) {
  return (
    <Box textAlign="center">
      {qrCodeBase64 ? (
        <Image
          src={`data:image/png;base64,${qrCodeBase64}`}
          alt={`QR code for ticket ${ticketCode}`}
          w={{ base: "160px", md: "180px" }}
          h={{ base: "160px", md: "180px" }}
          mx="auto"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="12px"
          bg="white"
          p={2}
        />
      ) : (
        <Box
          w={{ base: "160px", md: "180px" }}
          h={{ base: "160px", md: "180px" }}
          mx="auto"
          display="grid"
          placeItems="center"
          borderWidth="1px"
          borderStyle="dashed"
          borderColor="gray.300"
          borderRadius="12px"
          bg="gray.50"
        >
          <Text fontSize="xs" fontWeight="600" color="gray.500" px={3}>
            No scannable code
          </Text>
        </Box>
      )}

      <Text mt={3} fontSize="2xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
        Ticket code
      </Text>
      {/* The global body rule sets letter-spacing to -0.5px, which runs monospace characters
          together. This code gets read aloud and typed in at a door, so give it room. */}
      <Text
        fontFamily="mono"
        fontSize={{ base: "xs", md: "sm" }}
        fontWeight="700"
        color="gray.900"
        letterSpacing="0.04em"
        wordBreak="break-all"
      >
        {ticketCode}
      </Text>
    </Box>
  )
}
