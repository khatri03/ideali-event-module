import { useState } from "react"
import { Badge, Box, Button, HStack, Input, Stack, Text } from "@chakra-ui/react"
import { X } from "lucide-react"
import { formatAmount } from "@/features/events/utils/registrationFormat"

interface CouponEntryCardProps {
  appliedCouponCode: string | null
  discountAmount: number
  currencyCode: string | null
  isSyncing: boolean
  formAccent: string
  onApply: (code: string) => void
  onRemove: () => void
}

/**
 * A rejected code is not this component's problem to report - it surfaces through the cart's shared
 * error banner, the same path every other cart mutation failure already takes.
 */
export function CouponEntryCard({
  appliedCouponCode,
  discountAmount,
  currencyCode,
  isSyncing,
  formAccent,
  onApply,
  onRemove,
}: CouponEntryCardProps) {
  const [code, setCode] = useState("")
  const canApply = !isSyncing && code.trim().length > 0

  function handleApply() {
    const trimmed = code.trim()
    if (!trimmed) return
    onApply(trimmed)
  }

  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="18px" p={4} bg="white">
      <Stack gap={3}>
        <Text fontSize="sm" fontWeight="700" color="gray.700">
          Have a coupon?
        </Text>

        {appliedCouponCode ? (
          <HStack
            justify="space-between"
            gap={3}
            borderWidth="1px"
            borderColor={formAccent}
            bg="gray.50"
            borderRadius="14px"
            px={4}
            py={3}
            flexWrap="wrap"
          >
            <HStack gap={3} flexWrap="wrap">
              <Badge colorPalette="green" variant="subtle" borderRadius="full" px={3} py={1} fontWeight="800">
                {appliedCouponCode}
              </Badge>
              {discountAmount > 0 ? (
                <Text fontSize="sm" fontWeight="700" color="green.700">
                  -{formatAmount(discountAmount, currencyCode)} applied
                </Text>
              ) : null}
            </HStack>
            <Button
              variant="ghost"
              size="sm"
              color="gray.600"
              cursor={isSyncing ? "not-allowed" : "pointer"}
              disabled={isSyncing}
              onClick={onRemove}
            >
              <HStack gap={1.5}>
                <X size={14} />
                <Text as="span">Remove</Text>
              </HStack>
            </Button>
          </HStack>
        ) : (
          <HStack
            gap={0}
            maxW={{ base: "full", md: "420px" }}
            borderWidth="1px"
            borderColor="gray.300"
            borderRadius="14px"
            bg="white"
            overflow="hidden"
            _focusWithin={{ borderColor: formAccent, boxShadow: `0 0 0 1px ${formAccent}` }}
            transition="border-color 0.15s ease, box-shadow 0.15s ease"
          >
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Enter coupon code"
              flex="1"
              minW="0"
              h="44px"
              px={4}
              border="none"
              borderRadius="0"
              _focus={{ boxShadow: "none" }}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleApply()
              }}
            />
            <Button
              bg={canApply ? formAccent : "gray.100"}
              color={canApply ? "white" : "gray.400"}
              cursor={canApply ? "pointer" : "not-allowed"}
              disabled={!canApply}
              loading={isSyncing}
              loadingText="Applying..."
              h="44px"
              px={5}
              borderRadius="0"
              flexShrink={0}
              onClick={handleApply}
            >
              Apply
            </Button>
          </HStack>
        )}
      </Stack>
    </Box>
  )
}
