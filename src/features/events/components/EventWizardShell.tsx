import { Box, Flex, Text } from "@chakra-ui/react"
import type { ReactNode } from "react"

interface EventWizardShellProps {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}

export function EventWizardShell({ eyebrow, title, description, children }: EventWizardShellProps) {
  return (
    <Box
      bg="card.bg"
      borderRadius={{ base: 0, md: "24px" }}
      boxShadow="card"
      border="1px solid"
      borderColor="border.subtle"
      overflow="hidden"
    >
      <Box px={{ base: 5, md: 8 }} pt={{ base: 5, md: 7 }} pb={5} borderBottom="1px solid" borderColor="border.subtle">
        <Text fontSize="xs" fontWeight="800" color="text.secondary" textTransform="uppercase" letterSpacing="0.12em">
          {eyebrow}
        </Text>
        <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" color="text.primary" mt={2}>
          {title}
        </Text>
        <Text fontSize={{ base: "sm", md: "md" }} color="text.secondary" mt={1.5}>
          {description}
        </Text>
      </Box>

      <Flex direction="column" gap={6} px={{ base: 5, md: 8 }} py={{ base: 5, md: 6 }}>
        {children}
      </Flex>
    </Box>
  )
}
