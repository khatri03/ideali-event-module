import type { RefObject } from "react"
import { Badge, Box, Button, HStack, Separator, SimpleGrid, Skeleton, SkeletonText, Stack, Text } from "@chakra-ui/react"
import { ChevronDown } from "lucide-react"
import type { EventRegistrationTicket } from "@/api/events"
import type { EventCartPaymentBreakdown, EventPaymentIntentResult } from "@/features/events/schemas/eventCart.schemas"
import type { SelectedTicketSummaryItem } from "@/features/events/components/registration/types"
import { AnimatedPaymentMethodBody } from "@/features/events/components/registration/AnimatedPaymentMethodBody"
import { PaymentBreakdownTable } from "@/features/events/components/registration/PaymentBreakdownTable"
import { StripeCardFields } from "@/features/events/components/registration/StripeCardFields"
import { formatAmount, hexToRgba } from "@/features/events/utils/registrationFormat"
import { isCardPaymentMethod } from "@/features/events/utils/ticketSelection"

interface SessionGroup {
  sessionId: string
  sessionName: string
  items: SelectedTicketSummaryItem[]
  total: number
}

interface PaymentStepProps {
  breakdowns: EventCartPaymentBreakdown[]
  selectedBreakdown: EventCartPaymentBreakdown | null
  expandedPaymentMethod: string | null
  onSelectMethod: (paymentMethod: string) => void
  onToggleExpanded: (paymentMethod: string) => void
  sessionGroups: SessionGroup[]
  subtotal: number
  ticketSubtotal: number
  currencyCode: string | null
  formAccent: string
  isLoading: boolean
  hasVisiblePaymentMethods: boolean
  paymentIntent: EventPaymentIntentResult | null
  isConfirming: boolean
  onPaid: () => void
  validationMessage: string | null
  methodValidationRef: RefObject<HTMLDivElement | null>
  cardValidationRef: RefObject<HTMLDivElement | null>
  onChangeQuantity: (ticket: EventRegistrationTicket, quantity: number) => void
  onRequestRemove: (ticket: EventRegistrationTicket, ticketName: string) => void
}

function PaymentMethodRow({
  breakdown,
  isSelected,
  isExpanded,
  formAccent,
  currencyCode,
  paymentIntent,
  isConfirming,
  onPaid,
  onSelect,
  cardValidationRef,
}: {
  breakdown: EventCartPaymentBreakdown
  isSelected: boolean
  isExpanded: boolean
  formAccent: string
  currencyCode: string | null
  paymentIntent: EventPaymentIntentResult | null
  isConfirming: boolean
  onPaid: () => void
  onSelect: () => void
  cardValidationRef: RefObject<HTMLDivElement | null>
}) {
  const showCardEntry = isSelected && isCardPaymentMethod(breakdown.paymentMethod)

  return (
    <Box
      borderWidth="1px"
      borderColor={isSelected ? formAccent : "gray.200"}
      borderRadius="18px"
      bg={isSelected ? hexToRgba(formAccent, 0.08) : "white"}
      boxShadow={isSelected ? `0 0 0 1px ${formAccent}` : "0 10px 24px rgba(15, 23, 42, 0.04)"}
      overflow="hidden"
    >
      <Button
        onClick={onSelect}
        variant="ghost"
        w="full"
        h="auto"
        px={4}
        py={4}
        minH="11"
        cursor="pointer"
        justifyContent="space-between"
        alignItems="center"
        textAlign="left"
        borderRadius={0}
        _hover={{ bg: isSelected ? hexToRgba(formAccent, 0.12) : "gray.50" }}
        _active={{ bg: isSelected ? hexToRgba(formAccent, 0.16) : "gray.100" }}
      >
        <HStack gap={3} minW={0} flex="1" justify="space-between" align="center">
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

          <HStack gap={2} flexShrink={0}>
            <Text fontSize={{ base: "md", md: "lg" }} fontWeight="800" color="gray.900">
              {formatAmount(breakdown.grandTotal, currencyCode)}
            </Text>
            <Box
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
              w="28px"
              h="28px"
              borderRadius="full"
              borderWidth="1px"
              borderColor={isExpanded ? formAccent : "gray.300"}
              bg={isExpanded ? hexToRgba(formAccent, 0.12) : "gray.50"}
              color="gray.700"
              flexShrink={0}
            >
              <Box transform={isExpanded ? "rotate(180deg)" : "rotate(0deg)"} transition="transform 0.2s ease">
                <ChevronDown size={14} />
              </Box>
            </Box>
          </HStack>
        </HStack>
      </Button>

      <Separator borderColor="gray.200" />

      <AnimatedPaymentMethodBody isOpen={isExpanded}>
        <Stack gap={4} px={4} py={4} ref={cardValidationRef}>
          {showCardEntry && paymentIntent ? (
            <StripeCardFields
              intent={paymentIntent}
              accentColor={formAccent}
              isConfirming={isConfirming}
              onPaid={onPaid}
            />
          ) : (
            <Box borderWidth="1px" borderColor="gray.200" borderRadius="18px" bg="gray.50" p={4}>
              <Text fontSize="sm" color="gray.600">
                {showCardEntry
                  ? "Review your purchase to continue to card entry."
                  : "You will be prompted to complete this payment after reviewing your purchase."}
              </Text>
            </Box>
          )}
        </Stack>
      </AnimatedPaymentMethodBody>
    </Box>
  )
}

export function PaymentStep({
  breakdowns,
  selectedBreakdown,
  expandedPaymentMethod,
  onSelectMethod,
  onToggleExpanded,
  sessionGroups,
  subtotal,
  ticketSubtotal,
  currencyCode,
  formAccent,
  isLoading,
  hasVisiblePaymentMethods,
  paymentIntent,
  isConfirming,
  onPaid,
  validationMessage,
  methodValidationRef,
  cardValidationRef,
  onChangeQuantity,
  onRequestRemove,
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

      {isLoading && breakdowns.length === 0 ? (
        <Stack gap={4}>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
            {[0, 1].map((index) => (
              <Skeleton key={index} h="92px" borderRadius="18px" />
            ))}
          </SimpleGrid>
          <Box borderWidth="1px" borderColor="gray.200" borderRadius="18px" bg="gray.50" p={4}>
            <SkeletonText noOfLines={4} gap="4" />
          </Box>
        </Stack>
      ) : breakdowns.length > 0 ? (
        <>
          <Stack gap={2} ref={methodValidationRef}>
            <Text fontSize="sm" fontWeight="700" color="gray.700">
              Select payment method
            </Text>
          </Stack>

          <Stack gap={3}>
            {breakdowns.map((breakdown) => (
              <PaymentMethodRow
                key={breakdown.paymentMethod}
                breakdown={breakdown}
                isSelected={selectedBreakdown?.paymentMethod === breakdown.paymentMethod}
                isExpanded={expandedPaymentMethod === breakdown.paymentMethod}
                formAccent={formAccent}
                currencyCode={currencyCode}
                paymentIntent={paymentIntent}
                isConfirming={isConfirming}
                onPaid={onPaid}
                cardValidationRef={cardValidationRef}
                onSelect={() => {
                  onSelectMethod(breakdown.paymentMethod)
                  onToggleExpanded(breakdown.paymentMethod)
                }}
              />
            ))}
          </Stack>

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
              subtotal={subtotal}
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
