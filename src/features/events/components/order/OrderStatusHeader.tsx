import type { ReactNode } from "react"
import { Box, Flex, Heading, Stack, Text } from "@chakra-ui/react"

export type OrderStatusTone = "success" | "pending" | "danger"

const TONE_STYLES: Record<OrderStatusTone, { border: string; bg: string; iconBg: string; iconColor: string; title: string }> = {
  success: { border: "green.200", bg: "green.50", iconBg: "green.100", iconColor: "green.700", title: "green.800" },
  pending: { border: "blue.200", bg: "blue.50", iconBg: "blue.100", iconColor: "blue.700", title: "blue.800" },
  danger: { border: "red.200", bg: "red.50", iconBg: "red.100", iconColor: "red.700", title: "red.800" },
}

interface OrderStatusHeaderProps {
  tone: OrderStatusTone
  icon: ReactNode
  title: string
  description: string
  children?: ReactNode
}

export function OrderStatusHeader({ tone, icon, title, description, children }: OrderStatusHeaderProps) {
  const styles = TONE_STYLES[tone]

  return (
    <Box
      borderWidth="1px"
      borderColor={styles.border}
      borderRadius="24px"
      bg={styles.bg}
      p={{ base: 5, md: 6 }}
      role="status"
    >
      <Flex gap={4} align="start" direction={{ base: "column", sm: "row" }}>
        <Flex
          w="12"
          h="12"
          flexShrink={0}
          borderRadius="16px"
          align="center"
          justify="center"
          bg={styles.iconBg}
          color={styles.iconColor}
        >
          {icon}
        </Flex>
        <Stack gap={2} flex="1" minW="0">
          <Heading fontSize={{ base: "lg", md: "2xl" }} color={styles.title} letterSpacing="-0.02em">
            {title}
          </Heading>
          <Text fontSize={{ base: "sm", md: "md" }} color="gray.700" lineHeight="1.6">
            {description}
          </Text>
          {children}
        </Stack>
      </Flex>
    </Box>
  )
}
