import type { ReactNode } from "react"
import { Box, Flex, HStack, Heading, Stack, Text } from "@chakra-ui/react"

interface SupportCardProps {
  title: string
  subtitle?: string
  icon: ReactNode
  children: ReactNode
  bg?: string
  hasDivider?: boolean
}

export function SupportCard({ title, subtitle, icon, children, bg = "white", hasDivider = false }: SupportCardProps) {
  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="24px"
      bg={bg}
      p={{ base: 5, md: 6 }}
      boxShadow="0 16px 40px rgba(15, 23, 42, 0.06)"
    >
      <HStack gap={4} align="start" mb={hasDivider ? 0 : 4}>
        <Flex w="12" h="12" borderRadius="16px" align="center" justify="center" bg="gray.100" color="gray.700">
          {icon}
        </Flex>
        <Stack gap={1} flex="1">
          <Heading fontSize={{ base: "md", md: "lg" }} color="gray.900" letterSpacing="-0.02em">
            {title}
          </Heading>
          {subtitle ? (
            <Text fontSize="sm" color="gray.500" lineHeight="1.6">
              {subtitle}
            </Text>
          ) : null}
        </Stack>
      </HStack>
      {hasDivider ? (
        <Box borderTopWidth="1px" borderTopColor="gray.200" mt={4} pt={4}>
          {children}
        </Box>
      ) : (
        children
      )}
    </Box>
  )
}

export function RichTextBlock({ html }: { html: string }) {
  return <Box color="gray.700" lineHeight="1.75" dangerouslySetInnerHTML={{ __html: html }} />
}
