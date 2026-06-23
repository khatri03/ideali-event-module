import { Badge, Box, Heading, Text, Stack } from "@chakra-ui/react"
import { Settings as SettingsIcon } from "lucide-react"
import { PaymentProcessorFeesManager } from "../components/PaymentProcessorFeesManager"

export function SettingsPage() {
  return (
    <Stack gap={6}>
      <Box
        border="1px solid"
        borderColor="border.subtle"
        borderRadius="20px"
        bg="card.bg"
        boxShadow="card"
        p={{ base: 4, md: 6 }}
      >
        <Stack direction={{ base: "column", md: "row" }} align={{ base: "flex-start", md: "center" }} gap={4}>
          <Box
            w="64px"
            h="64px"
            borderRadius="18px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
            flexShrink={0}
          >
            <SettingsIcon size={28} color="white" />
          </Box>

          <Box flex={1}>
            <Badge variant="subtle" colorPalette="purple" borderRadius="999px" px={3} py={1} mb={2}>
              Organizer billing
            </Badge>
            <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="gray.900">
              Payment Processor Fees
            </Heading>
            <Text mt={2} fontSize={{ base: "sm", md: "md" }} color="gray.600" maxW="3xl">
              Keep the platform charge separate from payment processor cut offsets. This area is where organizers define fee recovery by merchant and payment method.
            </Text>
          </Box>
        </Stack>
      </Box>

      <PaymentProcessorFeesManager />
    </Stack>
  )
}
