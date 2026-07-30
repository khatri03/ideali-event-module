import type { ReactNode } from "react"
import { Badge, Box, Button, Flex, HStack, Heading, Link, Separator, Stack } from "@chakra-ui/react"
import { ChevronRight } from "lucide-react"

interface SessionTitleCardProps {
  title: string
  description?: string | null
  ticketCount: number
  isExpanded: boolean
  onToggle: () => void
  onOpenDescription: () => void
  children?: ReactNode
}

export function SessionTitleCard({
  title,
  description,
  ticketCount,
  isExpanded,
  onToggle,
  onOpenDescription,
  children,
}: SessionTitleCardProps) {
  return (
    <Box
      borderWidth="1px"
      borderColor={isExpanded ? "gray.300" : "gray.200"}
      borderRadius="24px"
      bg="white"
      p={{ base: 5, md: 6 }}
      boxShadow="0 16px 40px rgba(15, 23, 42, 0.06)"
    >
      <Stack gap={4}>
        <Flex align="center" justify="space-between" gap={4}>
          {description ? (
            <Link
              as="button"
              type="button"
              onClick={onOpenDescription}
              fontSize={{ base: "md", md: "lg" }}
              fontWeight="700"
              color="gray.900"
              letterSpacing="-0.02em"
              textAlign="left"
              textDecoration="underline"
              textUnderlineOffset="4px"
              title="View description"
              cursor="pointer"
              _hover={{ color: "gray.700" }}
            >
              {title}
            </Link>
          ) : (
            <Heading fontSize={{ base: "md", md: "lg" }} color="gray.900" letterSpacing="-0.02em">
              {title}
            </Heading>
          )}

          <HStack gap={3}>
            <Badge colorPalette="gray" variant="subtle" borderRadius="full" px={3} py={1}>
              {ticketCount} {ticketCount === 1 ? "ticket" : "tickets"}
            </Badge>
            <Button
              onClick={onToggle}
              aria-label={isExpanded ? `Collapse ${title}` : `Expand ${title}`}
              aria-expanded={isExpanded}
              minW="0"
              w="32px"
              h="32px"
              p="0"
              borderRadius="full"
              borderWidth="1px"
              cursor="pointer"
              borderColor={isExpanded ? "gray.400" : "gray.300"}
              bg={isExpanded ? "gray.200" : "gray.100"}
              color="gray.800"
              _hover={{ bg: "gray.200", borderColor: "gray.500" }}
              _active={{ bg: "gray.300", borderColor: "gray.600" }}
            >
              <Box
                display="inline-flex"
                transform={isExpanded ? "rotate(90deg)" : "rotate(0deg)"}
                transition="transform 0.2s ease"
              >
                <ChevronRight size={14} />
              </Box>
            </Button>
          </HStack>
        </Flex>
        <Separator borderColor="gray.200" />
        {isExpanded ? children : null}
      </Stack>
    </Box>
  )
}
