import { Stack, Text } from "@chakra-ui/react"

export function EventDiscountCouponStepPage() {
  return (
    <Stack h="full" gap={4}>
      <Stack flex="1" gap={4}>
        <Text fontSize="sm" fontWeight="700" color="text.primary">
          Discount Coupon
        </Text>
        <Text fontSize="sm" color="text.secondary">
          Set up promotional codes and discount rules for this event when the data model is ready.
        </Text>
      </Stack>
    </Stack>
  )
}
