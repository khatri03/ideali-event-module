import { Box, Input, Stack, Text } from "@chakra-ui/react"
import { PaymentElement } from "@stripe/react-stripe-js"

interface StripePaymentFieldsProps {
  cardHolderName: string
  onCardHolderNameChange: (value: string) => void
}

/**
 * Card entry for the payment step, mounted as soon as the buyer picks the card method. The Payment
 * Element owns every field that touches the card itself, so nothing sensitive is collected by, or
 * passes through, this application.
 *
 * The name is the one exception: `billingDetails.name` is set to "never" so the Element leaves it
 * alone and the value here is handed to Stripe at confirm time instead.
 *
 * Link is turned off. Its inline signup asks the buyer to save their card with Stripe rather than
 * with this event, which is a second, unrelated decision to make mid-checkout.
 */
export function StripePaymentFields({ cardHolderName, onCardHolderNameChange }: StripePaymentFieldsProps) {
  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="18px" bg="white" overflow="hidden">
      <Box px={4} py={3} bg="gray.50" borderBottomWidth="1px" borderBottomColor="gray.200">
        <Text fontSize="sm" fontWeight="700" color="gray.700">
          Card details
        </Text>
      </Box>

      <Stack gap={4} p={4}>
        <Box>
          <Text fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
            Name on card{" "}
            <Text as="span" color="red.500">
              *
            </Text>
          </Text>
          <Input
            value={cardHolderName}
            onChange={(event) => onCardHolderNameChange(event.currentTarget.value)}
            autoComplete="cc-name"
            placeholder="Enter cardholder name"
            borderColor="gray.200"
            borderRadius="14px"
            h="12"
            px={4}
          />
        </Box>

        <PaymentElement
          options={{
            layout: "tabs",
            fields: { billingDetails: { name: "never" } },
            wallets: { link: "never" },
          }}
        />
      </Stack>
    </Box>
  )
}
