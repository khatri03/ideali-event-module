import type { RefObject } from "react"
import { Badge, Box, Button, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react"
import { CheckCircle2, Circle } from "lucide-react"
import type { EventRegistrationTicket } from "@/api/events"
import type { EventCartPaymentBreakdown } from "@/features/events/schemas/eventCart.schemas"
import type { SelectedTicketSummaryItem } from "@/features/events/components/registration/types"
import { PaymentStepSkeleton } from "@/features/events/components/registration/PaymentStep.skeleton"
import { CouponEntryCard } from "@/features/events/components/registration/CouponEntryCard"
import { PaymentBreakdownTable } from "@/features/events/components/registration/PaymentBreakdownTable"
import { ChequePaymentFields } from "@/features/events/components/registration/ChequePaymentFields"
import { StripePaymentFields } from "@/features/events/components/registration/StripePaymentFields"
import { formatAmount, hexToRgba } from "@/features/events/utils/registrationFormat"

interface SessionGroup {
  sessionId: string
  sessionName: string
  items: SelectedTicketSummaryItem[]
  total: number
}

interface PaymentStepProps {
  breakdowns: EventCartPaymentBreakdown[]
  selectedBreakdown: EventCartPaymentBreakdown | null
  onSelectMethod: (paymentMethod: string) => void
  sessionGroups: SessionGroup[]
  grossSubtotal: number
  ticketSubtotal: number
  discountAmount: number
  /**
   * False when the event has no coupon a buyer could redeem. The field is hidden rather than shown
   * and rejected - offering a code that every gate behind it will refuse is not an invitation.
   */
  acceptsDiscountCoupons: boolean
  appliedCouponCode: string | null
  onApplyCoupon: (code: string) => void
  onRemoveCoupon: () => void
  isCouponSyncing: boolean
  currencyCode: string | null
  formAccent: string
  isLoading: boolean
  hasVisiblePaymentMethods: boolean
  validationMessage: string | null
  methodValidationRef: RefObject<HTMLDivElement | null>
  onChangeQuantity: (ticket: EventRegistrationTicket, quantity: number) => void
  onRequestRemove: (ticket: EventRegistrationTicket, ticketName: string) => void
  isCardMethodSelected: boolean
  cardHolderName: string
  onCardHolderNameChange: (value: string) => void
  isChequeMethodSelected: boolean
  chequeReferenceNo: string
  onChequeReferenceNoChange: (value: string) => void
  chequeNotes: string
  onChequeNotesChange: (value: string) => void
}

function PaymentMethodTile({
  breakdown,
  isSelected,
  formAccent,
  currencyCode,
  onSelect,
}: {
  breakdown: EventCartPaymentBreakdown
  isSelected: boolean
  formAccent: string
  currencyCode: string | null
  onSelect: () => void
}) {
  return (
    <Button
      onClick={onSelect}
      variant="ghost"
      w="full"
      h="auto"
      px={4}
      py={4}
      minH="11"
      cursor="pointer"
      justifyContent="flex-start"
      textAlign="left"
      borderWidth="1px"
      borderColor={isSelected ? formAccent : "gray.200"}
      borderRadius="18px"
      bg={isSelected ? hexToRgba(formAccent, 0.08) : "white"}
      boxShadow={isSelected ? `0 0 0 1px ${formAccent}` : "0 10px 24px rgba(15, 23, 42, 0.04)"}
      _hover={{ bg: isSelected ? hexToRgba(formAccent, 0.12) : "gray.50" }}
      _active={{ bg: isSelected ? hexToRgba(formAccent, 0.16) : "gray.100" }}
    >
      <HStack gap={3} w="full" justify="space-between" align="center">
        <HStack gap={3} minW={0}>
          {isSelected ? (
            <CheckCircle2 size={22} color={formAccent} />
          ) : (
            <Circle size={22} color="var(--chakra-colors-gray-300)" />
          )}
          <HStack gap={2} wrap="wrap" minW={0}>
            <Text fontWeight="800" color="gray.900">
              {breakdown.label}
            </Text>
            {breakdown.isOrganizerOnly ? (
              <Badge colorPalette="purple" variant="subtle" borderRadius="full" px={3} py={1}>
                Organizer only
              </Badge>
            ) : null}
          </HStack>
        </HStack>

        <Text fontSize={{ base: "md", md: "lg" }} fontWeight="800" color="gray.900" flexShrink={0}>
          {formatAmount(breakdown.grandTotal, currencyCode)}
        </Text>
      </HStack>
    </Button>
  )
}

export function PaymentStep({
  breakdowns,
  selectedBreakdown,
  onSelectMethod,
  sessionGroups,
  grossSubtotal,
  ticketSubtotal,
  discountAmount,
  acceptsDiscountCoupons,
  appliedCouponCode,
  onApplyCoupon,
  onRemoveCoupon,
  isCouponSyncing,
  currencyCode,
  formAccent,
  isLoading,
  hasVisiblePaymentMethods,
  validationMessage,
  methodValidationRef,
  onChangeQuantity,
  onRequestRemove,
  isCardMethodSelected,
  cardHolderName,
  isChequeMethodSelected,
  chequeReferenceNo,
  onChequeReferenceNoChange,
  chequeNotes,
  onChequeNotesChange,
  onCardHolderNameChange,
}: PaymentStepProps) {
  return (
    <Stack gap={4}>
      <Box borderWidth="1px" borderColor="gray.200" borderRadius="18px" p={4} bg="gray.50">
        <HStack justify="space-between" gap={4} align="start" flexWrap="wrap">
          <Stack gap={1}>
            <Text fontSize="sm" color="gray.600">
              Selected ticket subtotal
            </Text>
            <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" color="gray.900">
              {formatAmount(ticketSubtotal, currencyCode)}
            </Text>
          </Stack>
          <Text fontSize="sm" color="gray.600" textAlign={{ base: "left", md: "right" }} maxW="sm">
            Review the charges for each payment method before choosing how to pay.
          </Text>
        </HStack>
      </Box>

      {/* A coupon already on the cart keeps its card so the buyer can still take it off, even if the
          organizer has since deactivated it - the alternative is a discount they cannot see or remove. */}
      {acceptsDiscountCoupons || appliedCouponCode ? (
        <CouponEntryCard
          appliedCouponCode={appliedCouponCode}
          discountAmount={discountAmount}
          currencyCode={currencyCode}
          isSyncing={isCouponSyncing}
          formAccent={formAccent}
          onApply={onApplyCoupon}
          onRemove={onRemoveCoupon}
        />
      ) : null}

      {isLoading && breakdowns.length === 0 ? (
        <PaymentStepSkeleton />
      ) : breakdowns.length > 0 ? (
        <>
          <Stack gap={2} ref={methodValidationRef}>
            <Text fontSize="sm" fontWeight="700" color="gray.700">
              Select payment method
            </Text>
          </Stack>

          <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
            {breakdowns.map((breakdown) => (
              <PaymentMethodTile
                key={breakdown.paymentMethod}
                breakdown={breakdown}
                isSelected={selectedBreakdown?.paymentMethod === breakdown.paymentMethod}
                formAccent={formAccent}
                currencyCode={currencyCode}
                onSelect={() => onSelectMethod(breakdown.paymentMethod)}
              />
            ))}
          </SimpleGrid>

          {isCardMethodSelected ? (
            <StripePaymentFields
              cardHolderName={cardHolderName}
              onCardHolderNameChange={onCardHolderNameChange}
            />
          ) : null}

          {isChequeMethodSelected ? (
            <ChequePaymentFields
              chequeReferenceNo={chequeReferenceNo}
              onChequeReferenceNoChange={onChequeReferenceNoChange}
              notes={chequeNotes}
              onNotesChange={onChequeNotesChange}
            />
          ) : null}

          {validationMessage ? (
            <Box borderWidth="1px" borderColor="red.200" bg="red.50" borderRadius="18px" p={4}>
              <Text fontSize="sm" color="red.700" fontWeight="600">
                {validationMessage}
              </Text>
            </Box>
          ) : null}

          {selectedBreakdown ? (
            <PaymentBreakdownTable
              breakdown={selectedBreakdown}
              sessionGroups={sessionGroups}
              grossSubtotal={grossSubtotal}
              discountAmount={discountAmount}
              currencyCode={currencyCode}
              onChangeQuantity={onChangeQuantity}
              onRequestRemove={onRequestRemove}
            />
          ) : null}
        </>
      ) : (
        <Box borderWidth="1px" borderColor="gray.200" borderRadius="18px" p={4} bg="gray.50">
          <Text color="gray.600" fontSize="sm">
            {hasVisiblePaymentMethods
              ? "Payment methods are available, but the price breakdown could not be loaded yet."
              : "No public payment methods are currently mapped for this event."}
          </Text>
        </Box>
      )}
    </Stack>
  )
}
