import { useMemo, useState } from "react"
import { Box, Button, Grid, Input, Stack, Text } from "@chakra-ui/react"
import { CardCvcElement, CardExpiryElement, CardNumberElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import type { EventPaymentIntentResult } from "@/features/events/schemas/eventCart.schemas"
import { CONTROL_BUTTON_PRIMARY } from "@/components/common/controlStyles"

const ELEMENT_OPTIONS = {
  disableLink: true,
  style: {
    base: {
      color: "#0f172a",
      fontSize: "16px",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      fontSmoothing: "antialiased",
      "::placeholder": { color: "#94a3b8" },
    },
    invalid: { color: "#dc2626" },
  },
} as const

interface StripeCardFieldsProps {
  intent: EventPaymentIntentResult
  accentColor: string
  isConfirming: boolean
  onPaid: () => void
}

function CardPaymentForm({ intent, accentColor, isConfirming, onPaid }: StripeCardFieldsProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [cardHolderName, setCardHolderName] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handlePay() {
    if (!stripe || !elements) return

    const cardNumberElement = elements.getElement(CardNumberElement)
    if (!cardNumberElement) return

    if (!cardHolderName.trim()) {
      setErrorMessage("Enter the cardholder name.")
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    // The webhook is authoritative for settlement and ticket issuance; a successful confirm here
    // only lets the UI move on without waiting for it.
    const result = await stripe.confirmCardPayment(intent.clientSecret, {
      payment_method: {
        card: cardNumberElement,
        billing_details: { name: cardHolderName.trim() },
      },
    })

    setIsSubmitting(false)

    if (result.error) {
      setErrorMessage(result.error.message ?? "The payment could not be completed.")
      return
    }

    onPaid()
  }

  const isBusy = isSubmitting || isConfirming

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
            onChange={(event) => setCardHolderName(event.currentTarget.value)}
            autoComplete="cc-name"
            placeholder="Enter cardholder name"
            borderColor="gray.200"
            borderRadius="14px"
            h="12"
            px={4}
          />
        </Box>

        <Grid templateColumns={{ base: "1fr", md: "3fr 1fr 1fr" }} gap={3}>
          <Box>
            <Text fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
              Card number{" "}
              <Text as="span" color="red.500">
                *
              </Text>
            </Text>
            <Box borderWidth="1px" borderColor="gray.200" borderRadius="14px" px={3} py={3} bg="white">
              <CardNumberElement options={ELEMENT_OPTIONS} />
            </Box>
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
              Expiry{" "}
              <Text as="span" color="red.500">
                *
              </Text>
            </Text>
            <Box borderWidth="1px" borderColor="gray.200" borderRadius="14px" px={3} py={3} bg="white">
              <CardExpiryElement options={ELEMENT_OPTIONS} />
            </Box>
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
              CVV{" "}
              <Text as="span" color="red.500">
                *
              </Text>
            </Text>
            <Box borderWidth="1px" borderColor="gray.200" borderRadius="14px" px={3} py={3} bg="white">
              <CardCvcElement options={ELEMENT_OPTIONS} />
            </Box>
          </Box>
        </Grid>

        {errorMessage ? (
          <Text fontSize="xs" color="red.600">
            {errorMessage}
          </Text>
        ) : null}

        <Button
          {...CONTROL_BUTTON_PRIMARY}
          bg={accentColor}
          w={{ base: "full", md: "auto" }}
          alignSelf={{ base: "stretch", md: "flex-end" }}
          minH="11"
          cursor={isBusy ? "not-allowed" : "pointer"}
          disabled={isBusy || !stripe}
          loading={isBusy}
          loadingText="Processing..."
          onClick={handlePay}
        >
          Pay now
        </Button>
      </Stack>
    </Box>
  )
}

/**
 * Card and wallet intents are direct charges on the organizer's connected account, so Stripe.js is
 * initialized with that account. ACH/PAD are destination charges on the platform, which the server
 * signals by returning a null `stripeAccount`.
 */
export function StripeCardFields(props: StripeCardFieldsProps) {
  const { intent } = props

  const stripePromise = useMemo(() => {
    const stripeAccount = intent.stripeAccount?.trim()
    return loadStripe(intent.publishableKey, stripeAccount ? { stripeAccount } : undefined)
  }, [intent.publishableKey, intent.stripeAccount])

  return (
    <Elements stripe={stripePromise} options={{ clientSecret: intent.clientSecret }}>
      <CardPaymentForm {...props} />
    </Elements>
  )
}
