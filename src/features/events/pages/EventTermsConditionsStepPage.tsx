import { Badge, Box, Flex, SimpleGrid, Stack, Text } from "@chakra-ui/react"

const TERMS_POINTS = [
  "Event details should be accurate and current.",
  "You remain responsible for content, timing, and attendee communication.",
  "Payment, refund, and access policies will be finalized in later steps.",
]

export function EventTermsConditionsStepPage() {
  return (
    <Stack h="full" gap={5}>
      <Box
        border="1px solid"
        borderColor="gray.200"
        borderRadius="20px"
        bg="linear-gradient(135deg, rgba(117,81,255,0.08) 0%, rgba(66,42,251,0.04) 100%)"
        p={{ base: 4, md: 5 }}
      >
        <Flex align="flex-start" justify="space-between" gap={4} wrap="wrap">
          <Box minW={0}>
            <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
              Terms & Conditions
            </Text>
            <Text mt={2} fontSize={{ base: "sm", md: "md" }} fontWeight="700" color="gray.800">
              Add your event terms here. This step is optional for now, so the wizard will let you skip it.
            </Text>
          </Box>

          <Badge variant="subtle" colorPalette="orange" borderRadius="999px" px={3} py={1}>
            Optional
          </Badge>
        </Flex>
      </Box>

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={5}>
        <Stack
          gap={4}
          border="1px solid"
          borderColor="gray.200"
          borderRadius="24px"
          bg="white"
          boxShadow="0 10px 28px rgba(15, 23, 42, 0.05)"
          p={{ base: 4, md: 5 }}
        >
          <Box>
            <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
              What this covers
            </Text>
            <Text mt={2} fontSize="sm" color="gray.600" lineHeight="1.7">
              This step will eventually hold your legal and attendee-facing terms. For now, it is a visual placeholder
              so the wizard flow reflects the final structure.
            </Text>
          </Box>

          <Stack gap={3}>
            {TERMS_POINTS.map((point) => (
              <Flex
                key={point}
                gap={3}
                align="flex-start"
                border="1px solid"
                borderColor="gray.200"
                borderRadius="18px"
                bg="gray.50"
                px={4}
                py={3.5}
              >
                <Box w="10px" h="10px" borderRadius="full" bg="brand.500" mt="6px" flexShrink={0} />
                <Text fontSize="sm" color="gray.700" lineHeight="1.6">
                  {point}
                </Text>
              </Flex>
            ))}
          </Stack>
        </Stack>

        <Stack
          gap={4}
          border="1px solid"
          borderColor="gray.200"
          borderRadius="24px"
          bg="white"
          boxShadow="0 10px 28px rgba(15, 23, 42, 0.05)"
          p={{ base: 4, md: 5 }}
        >
          <Box>
            <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
              Preview area
            </Text>
            <Text mt={2} fontSize="sm" color="gray.600" lineHeight="1.7">
              The final implementation will likely include a rich text editor or document upload. This screen is
              deliberately lightweight for now.
            </Text>
          </Box>

          <Box
            border="1px dashed"
            borderColor="gray.200"
            borderRadius="22px"
            bg="gray.50"
            px={5}
            py={10}
            textAlign="center"
            minH="280px"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Stack gap={2} maxW="320px" align="center">
              <Text fontSize="sm" fontWeight="800" color="gray.800">
                Terms content goes here
              </Text>
              <Text fontSize="sm" color="gray.600" lineHeight="1.7">
                Use this step to communicate participation rules, cancellation policy, and any special conditions that
                matter to attendees.
              </Text>
            </Stack>
          </Box>
        </Stack>
      </SimpleGrid>
    </Stack>
  )
}
