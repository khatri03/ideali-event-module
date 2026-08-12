import type { ReactNode } from "react"
import { Box, Flex, Stack, Text } from "@chakra-ui/react"

interface InvoiceDetailPanelProps {
  title: string
  children: ReactNode
  /** Sits beside the title, for a panel whose contents can be acted on. */
  action?: ReactNode
}

export function InvoiceDetailPanel({ title, children, action }: InvoiceDetailPanelProps) {
  return (
    <Box border="1px solid" borderColor="border.subtle" borderRadius="16px" bg="app.bg" p={{ base: 4, md: 5 }}>
      <Flex align="center" justify="space-between" gap={2} mb={3} minH="6">
        <Text fontSize="xs" fontWeight="800" color="text.secondary" textTransform="uppercase" letterSpacing="0.12em">
          {title}
        </Text>
        {action}
      </Flex>
      <Stack gap={1}>{children}</Stack>
    </Box>
  )
}

export function InvoiceMutedLine({ children }: { children: ReactNode }) {
  return (
    <Text fontSize="sm" color="text.secondary">
      {children}
    </Text>
  )
}
