import { Box, Button, SimpleGrid, Stack, Text } from "@chakra-ui/react"
import { TicketPlus, X } from "lucide-react"

interface OrderCompletionActionsProps {
  /** True once the browser has refused to close the window, which only manual action can resolve. */
  hasCloseFailed: boolean
  onCloseWindow: () => void
  onNewRegistration: () => void
}

/**
 * The two ways out of a settled order, kept on the page rather than behind a prompt so the buyer can
 * read their receipt first and still find them afterwards. Neither is destructive, so they carry equal
 * visual weight - registering again is offered, not pushed.
 */
export function OrderCompletionActions({
  hasCloseFailed,
  onCloseWindow,
  onNewRegistration,
}: OrderCompletionActionsProps) {
  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="24px"
      bg="white"
      p={{ base: 5, md: 6 }}
      boxShadow="0 16px 40px rgba(15, 23, 42, 0.06)"
    >
      <Stack gap={5}>
        <Stack gap={1} textAlign="center">
          <Text fontSize={{ base: "sm", md: "md" }} fontWeight="800" color="gray.900">
            What would you like to do next?
          </Text>
          <Text fontSize="xs" color="gray.500" lineHeight="1.6">
            Your tickets are already on their way by email, so you can safely leave this page.
          </Text>
        </Stack>

        {hasCloseFailed ? (
          <Box borderWidth="1px" borderColor="orange.200" bg="orange.50" borderRadius="16px" px={4} py={3} role="alert">
            <Text fontSize="sm" color="orange.800" lineHeight="1.6">
              Your browser would not close this window. Close it yourself when you are ready - your tickets are
              already emailed to you and this page keeps working.
            </Text>
          </Box>
        ) : null}

        <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
          <Button
            variant="outline"
            size="lg"
            minH="12"
            w="full"
            borderColor="gray.300"
            color="gray.700"
            fontWeight="700"
            borderRadius="14px"
            cursor="pointer"
            _hover={{ bg: "gray.50", borderColor: "gray.400" }}
            onClick={onCloseWindow}
          >
            <X size={18} aria-hidden="true" />
            Close This Window
          </Button>
          <Button
            size="lg"
            minH="12"
            w="full"
            bg="brand.500"
            color="white"
            fontWeight="700"
            borderRadius="14px"
            cursor="pointer"
            boxShadow="0 10px 24px rgba(66, 42, 251, 0.24)"
            _hover={{ bg: "brand.600" }}
            _active={{ bg: "brand.600" }}
            onClick={onNewRegistration}
          >
            <TicketPlus size={18} aria-hidden="true" />
            New Registration
          </Button>
        </SimpleGrid>
      </Stack>
    </Box>
  )
}
