import { Box, Heading, Stack, Text } from "@chakra-ui/react"
import { useSearchParams } from "react-router-dom"
import { Receipt } from "lucide-react"
import { EventInvoiceManager } from "../components/EventInvoiceManager"

export function EventInvoicesPage() {
  const [searchParams] = useSearchParams()
  const eventUniqueId = searchParams.get("eventUniqueId")?.trim() ?? ""

  return (
    <Stack gap={6}>
      <Box border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 6 }}>
        <Stack direction={{ base: "column", md: "row" }} align={{ base: "flex-start", md: "center" }} gap={4}>
          <Box
            w="64px"
            h="64px"
            borderRadius="18px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="brand.gradient"
            flexShrink={0}
          >
            <Receipt size={28} color="white" />
          </Box>

          <Box flex={1}>
            <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="text.primary">
              Event Invoices
            </Heading>
            <Text mt={2} fontSize={{ base: "sm", md: "md" }} color="text.secondary" maxW="3xl">
              Browse every registration invoice across your events - filter by event, session, status or payment
              method, then open one to see its line items, attendees, issued tickets and payment history.
            </Text>
          </Box>
        </Stack>
      </Box>

      {/* Keyed so arriving from a different event card starts a clean filter state, not a merged one. */}
      <EventInvoiceManager key={eventUniqueId} initialEventUniqueId={eventUniqueId} />
    </Stack>
  )
}
