import { Stack, Text } from "@chakra-ui/react"
import { TextPill } from "@/components/common"

interface AdvancedSettingsReviewSummaryProps {
  visibilityLabel: string
  purchaseTimeLimitMinutes: number
  /** True when the payment method fee is added to the buyer's total rather than deducted from the payout. */
  passesPaymentFeesToBuyer: boolean
  /** True when a ticket whose order still owes money is turned away at the door. */
  refusesUnpaidEntry: boolean
}

export function AdvancedSettingsReviewSummary({
  visibilityLabel,
  purchaseTimeLimitMinutes,
  passesPaymentFeesToBuyer,
  refusesUnpaidEntry,
}: AdvancedSettingsReviewSummaryProps) {
  const minutes = `${purchaseTimeLimitMinutes} minute${purchaseTimeLimitMinutes === 1 ? "" : "s"}`

  return (
    <Stack gap={2} align="flex-start">
      <Text fontSize="sm" fontWeight="800" color="gray.900" wordBreak="break-word">
        {visibilityLabel}
      </Text>
      <TextPill>{minutes}</TextPill>
      <TextPill colorPalette={passesPaymentFeesToBuyer ? "purple" : "gray"}>
        {passesPaymentFeesToBuyer ? "Buyer pays the payment method fee" : "Organizer absorbs the payment method fee"}
      </TextPill>
      <TextPill colorPalette={refusesUnpaidEntry ? "orange" : "gray"}>
        {refusesUnpaidEntry ? "Unpaid orders refused at the door" : "Unpaid orders admitted at the door"}
      </TextPill>
    </Stack>
  )
}
