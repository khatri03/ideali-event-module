import { Box, Flex, Heading, Stack, Text } from "@chakra-ui/react"
import type { EventInvoicePaySummary } from "@/features/events/schemas/eventInvoicePay.schemas"
import { formatAmount } from "@/features/events/utils/registrationFormat"

type InvoicePaySummaryCardProps = Pick<
  EventInvoicePaySummary,
  "invoiceNo" | "eventName" | "lineItems" | "outstandingAmount" | "currencyCode"
>

const CAPTION_STYLE = {
  fontSize: "xs",
  fontWeight: "700",
  color: "gray.500",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
} as const

/** What the buyer is being asked to pay for, laid out like the order receipt they get after registering. */
export function InvoicePaySummaryCard({
  invoiceNo,
  eventName,
  lineItems,
  outstandingAmount,
  currencyCode,
}: InvoicePaySummaryCardProps) {
  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="24px" bg="white" p={{ base: 5, md: 6 }} boxShadow="0 16px 40px rgba(15, 23, 42, 0.06)">
      <Stack gap={5}>
        <Flex justify="space-between" align="start" gap={4} direction={{ base: "column", sm: "row" }}>
          <Stack gap={1} minW="0">
            <Text {...CAPTION_STYLE}>Invoice</Text>
            <Text fontSize={{ base: "md", md: "lg" }} fontWeight="800" color="gray.900" wordBreak="break-all">
              {invoiceNo}
            </Text>
          </Stack>
          <Stack gap={1} align={{ base: "flex-start", sm: "flex-end" }}>
            <Text {...CAPTION_STYLE}>Amount due</Text>
            <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" color="gray.900">
              {formatAmount(outstandingAmount, currencyCode)}
            </Text>
          </Stack>
        </Flex>

        <Box borderTopWidth="1px" borderTopColor="gray.200" pt={5}>
          <Heading as="h2" fontSize={{ base: "sm", md: "md" }} color="gray.900" mb={3} overflowWrap="anywhere">
            {eventName}
          </Heading>
          <Stack as="ul" gap={3} listStyleType="none" m={0}>
            {lineItems.map((lineItem, index) => (
              <Flex as="li" key={index} justify="space-between" align="start" gap={4}>
                <Text fontSize={{ base: "sm", md: "md" }} color="gray.700" minW="0" overflowWrap="anywhere">
                  {lineItem.description}
                </Text>
                <Text fontSize={{ base: "sm", md: "md" }} fontWeight="700" color="gray.900" flexShrink={0}>
                  {formatAmount(lineItem.amount, currencyCode)}
                </Text>
              </Flex>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Box>
  )
}
