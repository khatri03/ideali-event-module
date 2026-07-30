import type { LucideIcon } from "lucide-react"
import { Box, Flex, Text } from "@chakra-ui/react"

interface TicketFactRowProps {
  icon: LucideIcon
  label: string
  value: string
  helperText?: string | null
}

/** One labelled fact on the ticket stub. Read-only by design - this ends up printed. */
export function TicketFactRow({ icon: Icon, label, value, helperText }: TicketFactRowProps) {
  return (
    <Flex gap={3} align="flex-start">
      <Box color="gray.500" mt="2px" flexShrink={0}>
        <Icon size={16} aria-hidden />
      </Box>
      <Box minW={0}>
        <Text fontSize="2xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
          {label}
        </Text>
        <Text fontSize={{ base: "sm", md: "md" }} fontWeight="700" color="gray.900" wordBreak="break-word">
          {value}
        </Text>
        {helperText ? (
          <Text fontSize="xs" color="gray.600" wordBreak="break-word">
            {helperText}
          </Text>
        ) : null}
      </Box>
    </Flex>
  )
}
