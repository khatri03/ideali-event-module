import { useRef, useState } from "react"
import { Box, Button, Stack, Text } from "@chakra-ui/react"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CONTROL_BUTTON_PRIMARY } from "@/components/common/controlStyles"
import { StripePaymentFields } from "@/features/events/components/registration/StripePaymentFields"
import { invoicePayFormSchema, type InvoicePayFormValues } from "@/features/events/schemas/eventInvoicePay.schemas"
import { formatAmount } from "@/features/events/utils/registrationFormat"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"

interface InvoicePayFormProps {
  amount: number
  currencyCode: string | null
  invoiceUniqueId: string
  /** Asks the server for the invoice's PaymentIntent; a retry after a decline gets the same one back. */
  onStartPayment: () => Promise<{ clientSecret: string }>
  onPaid: () => void
}

/**
 * The confirm half of Stripe's deferred intent flow for a custom invoice. Must render inside
 * RegistrationStripeProvider. The client secret lives only inside one submit and is handed straight
 * to Stripe.js; settling the invoice is left to the payment webhook.
 */
export function InvoicePayForm({ amount, currencyCode, invoiceUniqueId, onStartPayment, onPaid }: InvoicePayFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const isPayingRef = useRef(false)
  const [isPaying, setIsPaying] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const { control, handleSubmit } = useForm<InvoicePayFormValues>({
    resolver: zodResolver(invoicePayFormSchema),
    defaultValues: { cardHolderName: "" },
  })

  // The ref is checked and raised synchronously, before anything is awaited, so a second click that
  // lands before the re-render cannot start a second payment.
  async function handlePay({ cardHolderName }: InvoicePayFormValues) {
    if (isPayingRef.current) return
    isPayingRef.current = true
    setIsPaying(true)
    setPaymentError(null)

    try {
      const failure = await payAsync(cardHolderName)
      if (failure) setPaymentError(failure)
    } finally {
      isPayingRef.current = false
      setIsPaying(false)
    }
  }

  /** Resolves null once the card is charged, or the plain-language reason it was not. */
  async function payAsync(cardHolderName: string): Promise<string | null> {
    if (!stripe || !elements) {
      return "The payment form is still loading. Try again in a moment."
    }

    try {
      const { error: submitError } = await elements.submit()
      if (submitError) return submitError.message ?? "Check the card details and try again."

      const { clientSecret } = await onStartPayment()
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}${APP_ROUTES.eventInvoicePay(invoiceUniqueId)}`,
          payment_method_data: { billing_details: { name: cardHolderName } },
        },
        redirect: "if_required",
      })
      if (confirmError) return confirmError.message ?? "The payment could not be completed."

      onPaid()
      return null
    } catch (error) {
      return extractApiError(error)
    }
  }

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(handlePay)(event)}>
      <Stack gap={4}>
        <Controller
          control={control}
          name="cardHolderName"
          render={({ field, fieldState }) => (
            <Stack gap={2}>
              <StripePaymentFields cardHolderName={field.value} onCardHolderNameChange={field.onChange} />
              {fieldState.error ? (
                <Text fontSize="sm" color="red.600" fontWeight="600">
                  {fieldState.error.message}
                </Text>
              ) : null}
            </Stack>
          )}
        />

        {paymentError ? (
          <Box borderWidth="1px" borderColor="red.200" bg="red.50" borderRadius="18px" p={4} role="alert">
            <Text fontSize="sm" color="red.700" fontWeight="600">
              {paymentError}
            </Text>
          </Box>
        ) : null}

        <Button
          {...CONTROL_BUTTON_PRIMARY}
          type="submit"
          bg="brand.500"
          minH="11"
          px={6}
          alignSelf={{ base: "stretch", md: "flex-end" }}
          w={{ base: "full", md: "auto" }}
          cursor={isPaying ? "not-allowed" : "pointer"}
          disabled={isPaying}
          loading={isPaying}
          loadingText="Processing payment..."
        >
          Pay {formatAmount(amount, currencyCode)}
        </Button>
      </Stack>
    </form>
  )
}
