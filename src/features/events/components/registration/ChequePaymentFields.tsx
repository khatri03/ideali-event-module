import { Box, Input, Stack, Text } from "@chakra-ui/react"

interface ChequePaymentFieldsProps {
  chequeReferenceNo: string
  onChequeReferenceNoChange: (value: string) => void
}

/**
 * Shown in place of the card fields when the organizer records a cheque. Nothing is charged here: the
 * one call this feeds issues the tickets straight away and leaves the invoice owing, which is why the
 * panel says so rather than reading like a payment form.
 *
 * The reference is optional server-side, so it is not marked required — but it is the only trace of
 * which cheque paid this order, and reconciling later without it means matching on amount and date.
 */
export function ChequePaymentFields({ chequeReferenceNo, onChequeReferenceNoChange }: ChequePaymentFieldsProps) {
  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="18px" bg="white" overflow="hidden">
      <Box px={4} py={3} bg="gray.50" borderBottomWidth="1px" borderBottomColor="gray.200">
        <Text fontSize="sm" fontWeight="700" color="gray.700">
          Cheque details
        </Text>
      </Box>

      <Stack gap={4} p={{ base: 3, md: 4 }}>
        <Box>
          <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="600" color="gray.700" mb={2}>
            Cheque reference number
          </Text>
          <Input
            value={chequeReferenceNo}
            onChange={(event) => onChequeReferenceNoChange(event.currentTarget.value)}
            placeholder="Enter the number printed on the cheque"
            borderColor="gray.200"
            borderRadius="14px"
            h="12"
            px={4}
            fontSize={{ base: "sm", md: "md" }}
          />
        </Box>

        <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">
          Recording a cheque issues the tickets immediately. The order stays marked as owing until the
          cheque clears and the payment is settled.
        </Text>
      </Stack>
    </Box>
  )
}
