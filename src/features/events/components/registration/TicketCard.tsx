import { useMemo } from "react"
import { Box, Button, Flex, HStack, Stack, Text, chakra } from "@chakra-ui/react"
import { ChevronDown } from "lucide-react"
import type { EventRegistrationTicket } from "@/api/events"
import { formatAmount } from "@/features/events/utils/registrationFormat"
import {
  getTicketDisplayPrice,
  getTicketQuantityOptions,
  getTicketSavings,
  getTicketSelectableMax,
} from "@/features/events/utils/ticketSelection"

interface TicketCardProps {
  ticket: EventRegistrationTicket
  quantity: number
  onDecrease: () => void
  onIncrease: () => void
  onSelectQuantity: (quantity: number) => void
  currencyCode?: string | null
}

export function TicketCard({
  ticket,
  quantity,
  onDecrease,
  onIncrease,
  onSelectQuantity,
  currencyCode,
}: TicketCardProps) {
  const displayPrice = getTicketDisplayPrice(ticket)
  const savings = getTicketSavings(ticket)
  const selectableMax = getTicketSelectableMax(ticket)
  const quantityOptions = useMemo(() => getTicketQuantityOptions(ticket, quantity), [ticket, quantity])
  const canDecrease = quantity > 0
  const canIncrease = selectableMax === null || quantity < selectableMax

  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="20px" bg="white" p={{ base: 4, md: 4.5 }}>
      <Stack gap={3}>
        <Stack gap={1.5}>
          <Flex justify="space-between" align="start" gap={4}>
            <Text fontSize={{ base: "sm", md: "md" }} fontWeight="700" color="gray.900" lineHeight="1.4" flex="1">
              {ticket.name}
            </Text>
            <HStack gap={3} flexWrap="wrap" align="baseline" justify="flex-end">
              {savings ? (
                <Text fontSize="sm" color="red.500" textDecoration="line-through">
                  {formatAmount(savings.fullPrice, currencyCode)}
                </Text>
              ) : null}
              <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="800" color={savings ? "green.600" : "gray.900"}>
                {formatAmount(displayPrice ?? 0, currencyCode)}
              </Text>
            </HStack>
          </Flex>
          {ticket.description ? (
            <Text fontSize="sm" color="gray.600" lineHeight="1.5" lineClamp={1}>
              {ticket.description}
            </Text>
          ) : null}
        </Stack>

        <Flex direction="column" gap={2} w="full">
          <Flex
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="full"
            bg="gray.50"
            px={2}
            py={1}
            align="center"
            justify="space-between"
            gap={2}
            w="full"
          >
            <Button
              minW="0"
              w="32px"
              h="32px"
              p="0"
              borderRadius="full"
              borderWidth="1px"
              borderColor="gray.300"
              bg="white"
              onClick={onDecrease}
              disabled={!canDecrease}
              cursor={canDecrease ? "pointer" : "not-allowed"}
              aria-label={`Remove one ${ticket.name}`}
            >
              <Text as="span" fontSize="lg" fontWeight="800" lineHeight="1" color="gray.700">
                -
              </Text>
            </Button>

            <Box flex="1" minW="84px" position="relative">
              <chakra.select
                value={String(quantity)}
                onChange={(event) => onSelectQuantity(Number(event.target.value))}
                aria-label={`Quantity for ${ticket.name}`}
                w="full"
                h="40px"
                pl={4}
                pr={9}
                border="none"
                outline="none"
                bg="transparent"
                color="gray.900"
                fontSize="sm"
                fontWeight="800"
                textAlign="center"
                textAlignLast="center"
                appearance="none"
                cursor="pointer"
                _focusVisible={{ outline: "none" }}
              >
                {quantityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </chakra.select>
              <Flex position="absolute" insetY="0" right={3} align="center" pointerEvents="none" color="gray.500">
                <ChevronDown size={14} strokeWidth={2.25} />
              </Flex>
            </Box>

            <Button
              minW="0"
              w="32px"
              h="32px"
              p="0"
              borderRadius="full"
              borderWidth="1px"
              borderColor="gray.300"
              bg="white"
              onClick={onIncrease}
              disabled={!canIncrease}
              cursor={canIncrease ? "pointer" : "not-allowed"}
              aria-label={`Add one ${ticket.name}`}
            >
              <Text as="span" fontSize="lg" fontWeight="800" lineHeight="1" color="gray.700">
                +
              </Text>
            </Button>
          </Flex>

          {ticket.minPurchase > 1 ? (
            <Text fontSize="xs" color="gray.500" textAlign="center">
              Minimum purchase:{" "}
              <Text as="span" fontWeight="700" color="gray.700">
                {ticket.minPurchase}
              </Text>
            </Text>
          ) : null}
        </Flex>

      </Stack>
    </Box>
  )
}
