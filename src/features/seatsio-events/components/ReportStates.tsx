import type { ReactNode } from "react"
import { Box, Skeleton, SkeletonText, Stack, Text } from "@chakra-ui/react"
import { Inbox } from "lucide-react"
import { extractApiError } from "@/utils/errors"

export function ReportSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Stack gap={3} py={2}>
      <Skeleton height="20px" width="200px" borderRadius="8px" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} height="44px" borderRadius="12px" />
      ))}
      <SkeletonText noOfLines={1} width="140px" />
    </Stack>
  )
}

export function ReportError({ error }: { error: unknown }) {
  return (
    <Box
      role="alert"
      borderRadius="14px"
      border="1px solid"
      borderColor="red.200"
      bg="red.50"
      px={4}
      py={4}
      _dark={{ bg: "whiteAlpha.100", borderColor: "red.400" }}
    >
      <Text fontSize="sm" fontWeight="700" color="red.600">
        We couldn't load this report.
      </Text>
      <Text mt={1} fontSize="sm" color="red.500">
        {extractApiError(error)}
      </Text>
    </Box>
  )
}

export function ReportEmpty({ title, description }: { title: string; description: string }) {
  return (
    <Stack align="center" gap={2} py={12} textAlign="center">
      <Box color="gray.400">
        <Inbox size={32} />
      </Box>
      <Text fontSize="md" fontWeight="700" color="gray.800" _dark={{ color: "gray.100" }}>
        {title}
      </Text>
      <Text fontSize="sm" color="gray.600" maxW="sm">
        {description}
      </Text>
    </Stack>
  )
}

export function ReportPanelShell({ children }: { children: ReactNode }) {
  return <Box px={{ base: 1, md: 2 }} py={2}>{children}</Box>
}
