import { Box, Flex, Heading, SimpleGrid, Stack, Text, Link as ChakraLink } from "@chakra-ui/react"
import { formatAmount, formatRegistrationDateTime } from "@/features/events/utils/registrationFormat"
import type { EventOrderStatus } from "@/features/events/schemas/eventOrder.schemas"

interface OrderSummaryCardProps {
  order: EventOrderStatus
}

/** The receipt half of the page: what was bought, what it cost, and where the tickets were sent. */
export function OrderSummaryCard({ order }: OrderSummaryCardProps) {
  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="24px"
      bg="white"
      p={{ base: 5, md: 6 }}
      boxShadow="0 16px 40px rgba(15, 23, 42, 0.06)"
    >
      <Stack gap={5}>
        <Flex justify="space-between" align="start" gap={4} direction={{ base: "column", sm: "row" }}>
          <Stack gap={1} minW="0">
            <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.06em">
              Order reference
            </Text>
            <Text fontSize={{ base: "md", md: "lg" }} fontWeight="800" color="gray.900" wordBreak="break-all">
              {order.invoiceNo}
            </Text>
          </Stack>
          <Stack gap={1} align={{ base: "flex-start", sm: "flex-end" }}>
            <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.06em">
              Total paid
            </Text>
            <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" color="gray.900">
              {formatAmount(order.totalAmount, order.currencySymbol)}
            </Text>
          </Stack>
        </Flex>

        <Box borderTopWidth="1px" borderTopColor="gray.200" pt={5}>
          <Heading fontSize={{ base: "sm", md: "md" }} color="gray.900" mb={3}>
            {order.eventName}
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <SummaryRow label="When" value={formatRegistrationDateTime(order.eventStartDateUtc)} />
            <SummaryRow
              label="Where"
              value={order.venueName ?? order.venueAddress ?? "To be announced"}
              hint={order.venueName && order.venueAddress ? order.venueAddress : undefined}
              href={order.venueMapUrl}
            />
            {order.buyerName ? <SummaryRow label="Booked by" value={order.buyerName} /> : null}
            {order.buyerEmailMasked ? (
              <SummaryRow label="Confirmation sent to" value={order.buyerEmailMasked} />
            ) : null}
          </SimpleGrid>
        </Box>
      </Stack>
    </Box>
  )
}

interface SummaryRowProps {
  label: string
  value: string
  hint?: string
  href?: string | null
}

function SummaryRow({ label, value, hint, href }: SummaryRowProps) {
  return (
    <Stack gap={1} minW="0">
      <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.06em">
        {label}
      </Text>
      {href ? (
        <ChakraLink
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          fontSize="sm"
          fontWeight="700"
          color="blue.600"
          cursor="pointer"
          wordBreak="break-word"
        >
          {value}
        </ChakraLink>
      ) : (
        <Text fontSize="sm" fontWeight="600" color="gray.800" wordBreak="break-word">
          {value}
        </Text>
      )}
      {hint ? (
        <Text fontSize="xs" color="gray.500" wordBreak="break-word">
          {hint}
        </Text>
      ) : null}
    </Stack>
  )
}
