import { Box, Button, Flex, HStack, Text, chakra } from "@chakra-ui/react"
import { ChevronDown, Trash2 } from "lucide-react"
import type { EventRegistrationTicket } from "@/api/events"
import { getTicketQuantityOptions, getTicketSelectableMax } from "@/features/events/utils/ticketSelection"

interface TicketQuantityStepperProps {
  ticket: EventRegistrationTicket
  ticketName: string
  quantity: number
  onChangeQuantity: (quantity: number) => void
  onRequestRemove: () => void
}

/**
 * Compact quantity control used inside the payment breakdown table. At a quantity of one the
 * decrement turns into a remove action, so the buyer is asked before the line disappears.
 */
export function TicketQuantityStepper({
  ticket,
  ticketName,
  quantity,
  onChangeQuantity,
  onRequestRemove,
}: TicketQuantityStepperProps) {
  const quantityOptions = getTicketQuantityOptions(ticket, quantity)
  const selectableMax = getTicketSelectableMax(ticket)
  const isRemoveAction = quantity === 1
  const canIncrease = selectableMax === null || quantity < selectableMax
  const decreaseLabel = isRemoveAction ? `Remove ${ticketName}` : `Decrease ${ticketName}`

  return (
    <Flex justify="center">
      <HStack
        gap={1.5}
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="full"
        bg="gray.50"
        px={1.5}
        py={1}
        w="full"
        maxW="152px"
        justify="space-between"
        align="center"
      >
        <Button
          minW="0"
          w="28px"
          h="28px"
          p="0"
          borderRadius="full"
          borderWidth="1px"
          borderColor={isRemoveAction ? "red.300" : "gray.300"}
          bg={isRemoveAction ? "red.50" : "white"}
          color={isRemoveAction ? "red.500" : "gray.700"}
          cursor={quantity <= 0 ? "not-allowed" : "pointer"}
          _hover={isRemoveAction ? { bg: "red.100", color: "red.600" } : { bg: "gray.50" }}
          _active={isRemoveAction ? { bg: "red.200", color: "red.700" } : { bg: "gray.100" }}
          onClick={() => (isRemoveAction ? onRequestRemove() : onChangeQuantity(quantity - 1))}
          disabled={quantity <= 0}
          aria-label={decreaseLabel}
          title={decreaseLabel}
        >
          {isRemoveAction ? (
            <Trash2 size={13} strokeWidth={2.2} />
          ) : (
            <Text as="span" fontSize="md" fontWeight="800" lineHeight="1">
              -
            </Text>
          )}
        </Button>

        <Box flex="1" minW="68px" maxW="84px" position="relative">
          <chakra.select
            value={String(quantity)}
            onChange={(event) => onChangeQuantity(Number(event.target.value))}
            aria-label={`Quantity for ${ticketName}`}
            w="full"
            h="30px"
            pl={2}
            pr={7}
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
          <Flex position="absolute" insetY="0" right={2} align="center" pointerEvents="none" color="gray.500">
            <ChevronDown size={12} strokeWidth={2.25} />
          </Flex>
        </Box>

        <Button
          minW="0"
          w="28px"
          h="28px"
          p="0"
          borderRadius="full"
          borderWidth="1px"
          borderColor="gray.300"
          bg="white"
          color="gray.700"
          cursor={canIncrease ? "pointer" : "not-allowed"}
          onClick={() => onChangeQuantity(quantity + 1)}
          disabled={!canIncrease}
          aria-label={`Increase ${ticketName}`}
          title={`Increase ${ticketName}`}
        >
          <Text as="span" fontSize="md" fontWeight="800" lineHeight="1">
            +
          </Text>
        </Button>
      </HStack>
    </Flex>
  )
}
