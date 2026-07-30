import { Badge, Box, Button, CloseButton, Flex, HStack, Input, SimpleGrid, Stack, Text, Tooltip } from "@chakra-ui/react"
import { AlertCircle } from "lucide-react"
import type { EventRegistrationSession, EventRegistrationTicket } from "@/api/events"
import { SessionTitleCard, SessionsTabSkeleton } from "@/features/events/components/registration/SessionTitleCard"
import { TicketCard } from "@/features/events/components/registration/TicketCard"
import { getTicketQuantityAfterDecrement } from "@/features/events/utils/ticketSelection"

interface SessionsStepProps {
  sessions: EventRegistrationSession[]
  isLoading: boolean
  selectedTicketQuantities: Record<string, number>
  selectedTicketCount: number
  expandedSessionIds: string[]
  ticketSearchBySession: Record<string, string>
  currencyCode: string | null
  areAllExpanded: boolean
  onToggleSession: (sessionUniqueId: string) => void
  onExpandAll: () => void
  onCollapseAll: () => void
  onSearchChange: (sessionUniqueId: string, value: string) => void
  onOpenDescription: (title: string, description: string) => void
  onChangeQuantity: (ticket: EventRegistrationTicket, quantity: number) => void
  onRequestRemoveAll: () => void
}

function TicketSearchField({
  value,
  onChange,
  isStretched,
}: {
  value: string
  onChange: (value: string) => void
  isStretched: boolean
}) {
  return (
    <Box
      position="relative"
      w="full"
      maxW={{ base: "full", md: "280px" }}
      justifySelf={isStretched ? { base: "stretch", md: "end" } : undefined}
      ml={isStretched ? undefined : { md: "auto" }}
    >
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search tickets"
        aria-label="Search tickets"
        h="44px"
        px={4}
        pe={value ? 11 : 4}
        borderRadius="full"
        borderColor="gray.300"
        bg="white"
        fontSize="sm"
        _focusVisible={{ borderColor: "gray.500", boxShadow: "0 0 0 1px var(--chakra-colors-gray-500)" }}
      />
      {value ? (
        <CloseButton
          aria-label="Clear ticket search"
          size="sm"
          position="absolute"
          top="50%"
          right="10px"
          transform="translateY(-50%)"
          borderRadius="full"
          color="gray.500"
          bg="gray.100"
          cursor="pointer"
          _hover={{ bg: "gray.200", color: "gray.700" }}
          onClick={() => onChange("")}
        />
      ) : null}
    </Box>
  )
}

function matchesSearch(ticket: EventRegistrationTicket, search: string) {
  const needle = search.trim().toLowerCase()
  if (!needle) return true

  return ticket.name.toLowerCase().includes(needle) || (ticket.description?.toLowerCase().includes(needle) ?? false)
}

export function SessionsStep({
  sessions,
  isLoading,
  selectedTicketQuantities,
  selectedTicketCount,
  expandedSessionIds,
  ticketSearchBySession,
  currencyCode,
  areAllExpanded,
  onToggleSession,
  onExpandAll,
  onCollapseAll,
  onSearchChange,
  onOpenDescription,
  onChangeQuantity,
  onRequestRemoveAll,
}: SessionsStepProps) {
  if (isLoading) {
    return <SessionsTabSkeleton />
  }

  if (sessions.length === 0) {
    return null
  }

  return (
    <>
      <Flex align={{ base: "stretch", md: "center" }} justify="space-between" gap={3} direction={{ base: "column", md: "row" }}>
        <Box minH="11" display="flex" alignItems="center">
          {selectedTicketCount > 0 ? (
            <Button
              variant="ghost"
              color="red.600"
              fontSize="sm"
              fontWeight="700"
              minH="11"
              px={0}
              cursor="pointer"
              _hover={{ bg: "transparent", color: "red.700", textDecoration: "underline" }}
              _active={{ bg: "transparent", color: "red.800" }}
              onClick={onRequestRemoveAll}
            >
              Remove all
            </Button>
          ) : null}
        </Box>

        <Box display="flex" justifyContent={{ base: "flex-start", md: "flex-end" }}>
          <Button
            h="38px"
            minH="11"
            px={4}
            borderRadius="full"
            borderWidth="1px"
            borderColor="gray.900"
            bg="gray.900"
            color="white"
            fontSize="sm"
            fontWeight="700"
            cursor="pointer"
            boxShadow="0 10px 24px rgba(15, 23, 42, 0.18)"
            _hover={{ bg: "gray.800", borderColor: "gray.800" }}
            _active={{ bg: "gray.700", borderColor: "gray.700" }}
            transition="all 0.2s ease"
            minW="140px"
            onClick={areAllExpanded ? onCollapseAll : onExpandAll}
          >
            {areAllExpanded ? "Collapse All" : "Expand All"}
          </Button>
        </Box>
      </Flex>

      {sessions.map((session) => {
        const searchValue = ticketSearchBySession[session.uniqueId] ?? ""
        const filteredTickets = session.ticketTypes.filter((ticket) => matchesSearch(ticket, searchValue))

        return (
          <SessionTitleCard
            key={session.uniqueId}
            title={session.name}
            description={session.description}
            ticketCount={session.ticketTypes.length}
            isExpanded={expandedSessionIds.includes(session.uniqueId)}
            onToggle={() => onToggleSession(session.uniqueId)}
            onOpenDescription={() => onOpenDescription(session.name, session.description ?? "")}
          >
            {session.ticketTypes.length === 0 ? (
              <Box borderWidth="1px" borderColor="gray.200" borderRadius="18px" bg="gray.50" p={4}>
                <Text fontSize="sm" color="gray.600">
                  No tickets are currently mapped to this session.
                </Text>
              </Box>
            ) : (
              <Stack gap={4}>
                {session.requiresAttendeeInfo ? (
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} alignItems="center">
                    <HStack gap={2} minW={0} align="center">
                      <Tooltip.Root openDelay={250} closeDelay={100}>
                        <Tooltip.Trigger asChild>
                          <Badge
                            colorPalette="blue"
                            variant="subtle"
                            borderRadius="full"
                            px={3}
                            py={1}
                            fontSize="xs"
                            fontWeight="800"
                            letterSpacing="0.08em"
                            textTransform="uppercase"
                            cursor="help"
                          >
                            <HStack gap={1.5}>
                              <AlertCircle size={14} />
                              <Text as="span">Requires Attendee Info</Text>
                            </HStack>
                          </Badge>
                        </Tooltip.Trigger>
                        <Tooltip.Positioner>
                          <Tooltip.Content>Buying this session would require attendee info.</Tooltip.Content>
                        </Tooltip.Positioner>
                      </Tooltip.Root>
                    </HStack>
                    <TicketSearchField
                      value={searchValue}
                      onChange={(value) => onSearchChange(session.uniqueId, value)}
                      isStretched
                    />
                  </SimpleGrid>
                ) : (
                  <TicketSearchField
                    value={searchValue}
                    onChange={(value) => onSearchChange(session.uniqueId, value)}
                    isStretched={false}
                  />
                )}

                {filteredTickets.length > 0 ? (
                  <SimpleGrid columns={{ base: 1, xl: 3 }} gap={4}>
                    {filteredTickets.map((ticket) => {
                      const quantity = selectedTicketQuantities[ticket.uniqueId] ?? 0

                      return (
                        <TicketCard
                          key={ticket.uniqueId}
                          ticket={ticket}
                          quantity={quantity}
                          currencyCode={currencyCode}
                          onDecrease={() => onChangeQuantity(ticket, getTicketQuantityAfterDecrement(ticket, quantity))}
                          onIncrease={() => onChangeQuantity(ticket, quantity + 1)}
                          onSelectQuantity={(value) => onChangeQuantity(ticket, value)}
                        />
                      )
                    })}
                  </SimpleGrid>
                ) : (
                  <Box borderWidth="1px" borderColor="gray.200" borderRadius="18px" bg="gray.50" p={4}>
                    <Text fontSize="sm" color="gray.600">
                      No tickets matched your search for this session.
                    </Text>
                  </Box>
                )}
              </Stack>
            )}
          </SessionTitleCard>
        )
      })}
    </>
  )
}
