import { Box, Button, Flex, Spinner, Text } from "@chakra-ui/react"

interface OrderProcessingActionsProps {
  /** True once the page has given up watching, which turns the live check into an explicit one. */
  hasPollWindowElapsed: boolean
  isRechecking: boolean
  onRecheck: () => void
}

/**
 * The alternative to a spinner that never stops. While the page is still watching it says so; once
 * it stops it tells the buyer exactly how they will hear, and leaves them a way to ask again.
 */
export function OrderProcessingActions({ hasPollWindowElapsed, isRechecking, onRecheck }: OrderProcessingActionsProps) {
  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="20px" bg="white" px={{ base: 4, md: 5 }} py={4}>
      <Flex
        gap={3}
        align={{ base: "stretch", md: "center" }}
        justify="space-between"
        direction={{ base: "column", md: "row" }}
      >
        <Flex gap={3} align="center" minW="0">
          {!hasPollWindowElapsed ? <Spinner size="sm" color="blue.500" borderWidth="2px" /> : null}
          <Text fontSize="sm" color="gray.700" lineHeight="1.6">
            {hasPollWindowElapsed
              ? "You can close this page. We will email you as soon as the payment clears, and this link keeps working."
              : "Checking with your bank for an update..."}
          </Text>
        </Flex>

        <Button
          variant="outline"
          borderColor="gray.300"
          fontWeight="700"
          minH="11"
          w={{ base: "full", md: "auto" }}
          cursor={isRechecking ? "not-allowed" : "pointer"}
          disabled={isRechecking}
          loading={isRechecking}
          loadingText="Checking..."
          onClick={onRecheck}
        >
          Check again
        </Button>
      </Flex>
    </Box>
  )
}
