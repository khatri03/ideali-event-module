import { Box, Heading, Stack, Text } from "@chakra-ui/react"
import { Receipt } from "lucide-react"
import type { ReactNode } from "react"

interface CustomInvoiceListHeaderProps {
  description: string
  action?: ReactNode
}

export function CustomInvoiceListHeader({ description, action }: CustomInvoiceListHeaderProps) {
  return (
    <Box border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 6 }}>
      <Stack direction={{ base: "column", md: "row" }} align={{ base: "flex-start", md: "center" }} gap={4}>
        <Box
          w="64px"
          h="64px"
          borderRadius="18px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="brand.gradient"
          flexShrink={0}
        >
          <Receipt size={28} color="white" />
        </Box>

        <Box flex={1}>
          <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="text.primary">
            Custom Invoices
          </Heading>
          <Text mt={2} fontSize={{ base: "sm", md: "md" }} color="text.secondary" maxW="3xl">
            {description}
          </Text>
        </Box>

        {action}
      </Stack>
    </Box>
  )
}
