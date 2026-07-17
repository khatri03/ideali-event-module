import { Box, Heading, Stack, Text } from "@chakra-ui/react"
import { Layers3 } from "lucide-react"
import { ChargeRulesManager } from "../components/ChargeRulesManager"

export function ChargeRulesPage() {
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
            <Layers3 size={28} color="white" />
          </Box>

          <Box flex={1}>
            <Text
              as="span"
              display="inline-flex"
              alignItems="center"
              borderRadius="999px"
              px={3}
              py={1}
              mb={2}
              fontSize="xs"
              fontWeight="800"
              textTransform="uppercase"
              letterSpacing="0.08em"
              color="brand.600"
              bg="brand.50"
            >
              Charge rules
            </Text>
            <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="gray.900">
              Charge Rules
            </Heading>
            <Text mt={2} fontSize={{ base: "sm", md: "md" }} color="gray.600" maxW="3xl">
              Create and maintain reusable buyer-facing charge rules without changing the payment processor fee flow.
            </Text>
          </Box>
        </Stack>
      </Box>

      <ChargeRulesManager />
    </Stack>
  )
}
