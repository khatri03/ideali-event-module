import type { ReactNode } from "react"
import { Box, Heading, Stack, Text } from "@chakra-ui/react"

interface ReportPageHeaderProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function ReportPageHeader({ icon, title, description, action }: ReportPageHeaderProps) {
  return (
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
          {icon}
        </Box>

        <Box flex={1}>
          <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="gray.900">
            {title}
          </Heading>
          <Text mt={2} fontSize={{ base: "sm", md: "md" }} color="gray.600" maxW="3xl">
            {description}
          </Text>
        </Box>

        {action ? <Box w={{ base: "full", md: "auto" }}>{action}</Box> : null}
      </Stack>
    </Box>
  )
}
