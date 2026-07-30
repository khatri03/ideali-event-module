import { Badge, Box, Button, Flex, HStack, Portal, Separator, Stack, Text, chakra } from "@chakra-ui/react"
import { ChevronDown, Trash2, X } from "lucide-react"
import type { EventRegistrationTicket } from "@/api/events"
import type { SelectedTicketSummaryItem } from "@/features/events/components/registration/types"
import { formatAmount, hexToRgba } from "@/features/events/utils/registrationFormat"
import {
  getTicketQuantityAfterDecrement,
  getTicketQuantityOptions,
  getTicketSelectableMax,
} from "@/features/events/utils/ticketSelection"

interface SessionGroup {
  sessionId: string
  sessionName: string
  items: SelectedTicketSummaryItem[]
  total: number
}

interface CartSummaryPanelProps {
  isOpen: boolean
  onToggle: () => void
  sessionGroups: SessionGroup[]
  selectedTicketCount: number
  total: number
  currencyCode: string | null
  formAccent: string
  onChangeQuantity: (ticket: EventRegistrationTicket, quantity: number) => void
  onRequestRemoveTicket: (ticket: EventRegistrationTicket, ticketName: string) => void
  onRequestRemoveSession: (items: SelectedTicketSummaryItem[], sessionName: string) => void
}

function SummaryQuantityControl({
  item,
  onChangeQuantity,
}: {
  item: SelectedTicketSummaryItem
  onChangeQuantity: (ticket: EventRegistrationTicket, quantity: number) => void
}) {
  const quantityOptions = getTicketQuantityOptions(item.ticket, item.quantity)
  const selectableMax = getTicketSelectableMax(item.ticket)
  const canIncrease = selectableMax === null || item.quantity < selectableMax

  return (
    <HStack
      gap={2}
      align="center"
      justify="space-between"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="16px"
      bg="gray.50"
      px={2}
      py={1.5}
    >
      <Text fontSize="xs" color="gray.500" fontWeight="600" flexShrink={0}>
        Qty
      </Text>
      <HStack
        gap={1}
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="full"
        bg="white"
        px={1}
        py={0.5}
        w="132px"
        minW="132px"
        flexShrink={0}
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
          borderColor="gray.300"
          bg="white"
          cursor={item.quantity <= 0 ? "not-allowed" : "pointer"}
          onClick={() => onChangeQuantity(item.ticket, getTicketQuantityAfterDecrement(item.ticket, item.quantity))}
          disabled={item.quantity <= 0}
          aria-label={`Decrease ${item.ticketName}`}
          title={`Decrease ${item.ticketName}`}
        >
          <Text as="span" fontSize="md" fontWeight="800" lineHeight="1" color="gray.700">
            -
          </Text>
        </Button>

        <Box flex="1" minW="0" position="relative">
          <chakra.select
            value={String(item.quantity)}
            onChange={(event) => onChangeQuantity(item.ticket, Number(event.target.value))}
            aria-label={`Quantity for ${item.ticketName}`}
            w="full"
            h="28px"
            pl={2}
            pr={6}
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
            <ChevronDown size={14} strokeWidth={2.25} />
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
          onClick={() => onChangeQuantity(item.ticket, item.quantity + 1)}
          disabled={!canIncrease}
          aria-label={`Increase ${item.ticketName}`}
          title={`Increase ${item.ticketName}`}
        >
          <Text as="span" fontSize="md" fontWeight="800" lineHeight="1">
            +
          </Text>
        </Button>
      </HStack>
    </HStack>
  )
}

/**
 * Docked cart summary. Totals shown here are the server-priced cart values passed in by the wizard.
 */
export function CartSummaryPanel({
  isOpen,
  onToggle,
  sessionGroups,
  selectedTicketCount,
  total,
  currencyCode,
  formAccent,
  onChangeQuantity,
  onRequestRemoveTicket,
  onRequestRemoveSession,
}: CartSummaryPanelProps) {
  return (
    <Portal>
      <Box
        position="fixed"
        left={{ base: 0, md: "auto" }}
        right={{ base: 0, md: 2.5 }}
        bottom={{ base: 0, md: 2.5 }}
        zIndex={999}
        pointerEvents="none"
      >
        <Box
          pointerEvents="auto"
          w={{ base: "full", md: "380px" }}
          maxH={{ base: "min(72dvh, 560px)", md: "calc(100dvh - 1.5rem)" }}
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius={{ base: "24px 24px 0 0", md: "26px" }}
          bg="white"
          boxShadow="0 28px 80px rgba(15, 23, 42, 0.22)"
          overflow="hidden"
          display="flex"
          flexDirection="column"
        >
          <Box
            px={4}
            py={3.5}
            borderBottomWidth={isOpen ? "1px" : "0"}
            borderBottomColor={hexToRgba(formAccent, 0.32)}
            bg={formAccent}
            color="white"
            cursor="pointer"
            onClick={onToggle}
            transition="border-color 0.22s ease"
          >
            <Flex align="center" justify="space-between" gap={3}>
              <Stack gap={0} minW={0}>
                <Text fontSize="sm" fontWeight="800" lineHeight="1.2">
                  Summary
                </Text>
                {isOpen && selectedTicketCount > 0 ? (
                  <Text fontSize="xs" color="whiteAlpha.900" lineHeight="1.3">
                    {selectedTicketCount} selected
                  </Text>
                ) : null}
              </Stack>
              <HStack gap={2.5} flexShrink={0}>
                <Text fontSize="sm" fontWeight="800" lineHeight="1.1" color="white">
                  {formatAmount(total, currencyCode)}
                </Text>
                <Box
                  color="whiteAlpha.900"
                  transform={isOpen ? "rotate(0deg)" : "rotate(-90deg)"}
                  transition="transform 220ms ease"
                  flexShrink={0}
                >
                  <ChevronDown size={18} />
                </Box>
              </HStack>
            </Flex>
          </Box>

          <Box
            flex="1"
            minH={0}
            maxH={isOpen ? { base: "min(72dvh, 560px)", md: "min(74dvh, 620px)" } : "0px"}
            opacity={isOpen ? 1 : 0}
            transform={isOpen ? "translateY(0)" : "translateY(10px)"}
            transition="max-height 280ms ease, opacity 220ms ease, transform 220ms ease"
            overflow="hidden"
            display="flex"
            flexDirection="column"
          >
            <Stack gap={3} px={4} py={4} flex="1" minH={0} overflow="hidden">
              <Box borderWidth="1px" borderColor="orange.200" bg="orange.50" borderRadius="16px" px={3.5} py={3}>
                <Text fontSize="sm" color="orange.900" lineHeight="1.6" fontWeight="800">
                  Prices exclusive of tax and other charges.
                </Text>
              </Box>

              <Box flex="1" minH={0} overflowY="auto" pr={1}>
                {sessionGroups.length > 0 ? (
                  <Stack gap={3.5}>
                    {sessionGroups.map((sessionGroup) => (
                      <Box
                        key={sessionGroup.sessionId}
                        borderWidth="1px"
                        borderColor="gray.200"
                        borderRadius="20px"
                        bg="white"
                        overflow="hidden"
                        boxShadow="0 12px 28px rgba(15, 23, 42, 0.05)"
                      >
                        <Box px={4} py={3.5} bg="gray.50" borderBottomWidth="1px" borderBottomColor="gray.200">
                          <Flex align="start" justify="space-between" gap={3}>
                            <Stack gap={1} minW={0}>
                              <Text
                                fontSize="sm"
                                fontWeight="800"
                                color="gray.900"
                                lineHeight="1.4"
                                whiteSpace="normal"
                                wordBreak="break-word"
                                minW={0}
                              >
                                {sessionGroup.sessionName}
                              </Text>
                              <Text fontSize="xs" color="gray.500" lineHeight="1.4">
                                {sessionGroup.items.length}{" "}
                                {sessionGroup.items.length === 1 ? "ticket type selected" : "ticket types selected"}
                              </Text>
                            </Stack>

                            <HStack gap={2.5} flexShrink={0}>
                              <Badge
                                colorPalette="gray"
                                variant="subtle"
                                borderRadius="full"
                                px={3}
                                py={1.5}
                                fontSize="sm"
                                fontWeight="800"
                                color="gray.800"
                                bg="white"
                                borderWidth="1px"
                                borderColor="gray.200"
                              >
                                {formatAmount(sessionGroup.total, currencyCode)}
                              </Badge>
                              <Button
                                minW="0"
                                h="20px"
                                p="0"
                                variant="ghost"
                                color="red.500"
                                cursor="pointer"
                                _hover={{ bg: "transparent", color: "red.600" }}
                                _active={{ bg: "transparent", color: "red.700" }}
                                aria-label={`Remove ${sessionGroup.sessionName}`}
                                title={`Remove ${sessionGroup.sessionName}`}
                                onClick={() => onRequestRemoveSession(sessionGroup.items, sessionGroup.sessionName)}
                              >
                                <X size={13} strokeWidth={2.3} />
                              </Button>
                            </HStack>
                          </Flex>
                        </Box>

                        <Stack gap={0} px={4} py={2.5}>
                          {sessionGroup.items.map((item, itemIndex) => (
                            <Box
                              key={item.ticketId}
                              py={3}
                              borderBottomWidth={itemIndex < sessionGroup.items.length - 1 ? "1px" : "0"}
                              borderBottomColor="gray.100"
                            >
                              <Stack gap={2.5}>
                                <Flex justify="space-between" align="start" gap={3}>
                                  <Stack gap={1} minW={0}>
                                    <Text
                                      fontSize="sm"
                                      fontWeight="800"
                                      color="gray.900"
                                      lineHeight="1.4"
                                      whiteSpace="normal"
                                      wordBreak="break-word"
                                      minW={0}
                                    >
                                      {item.ticketName}
                                    </Text>
                                    <HStack gap={2} wrap="wrap" minW={0} align="center">
                                      <Text fontSize="xs" color="gray.500">
                                        {formatAmount(item.unitPrice, currencyCode)}
                                      </Text>
                                      <Text fontSize="xs" color="gray.300">
                                        |
                                      </Text>
                                      <Text fontSize="xs" fontWeight="700" color="gray.700">
                                        {formatAmount(item.lineTotal, currencyCode)}
                                      </Text>
                                    </HStack>
                                  </Stack>

                                  <Button
                                    minW="0"
                                    h="16px"
                                    p="0"
                                    variant="ghost"
                                    color="red.500"
                                    cursor="pointer"
                                    _hover={{ bg: "transparent", color: "red.600" }}
                                    _active={{ bg: "transparent", color: "red.700" }}
                                    aria-label={`Remove ${item.ticketName}`}
                                    title={`Remove ${item.ticketName}`}
                                    onClick={() => onRequestRemoveTicket(item.ticket, item.ticketName)}
                                  >
                                    <Trash2 size={12} strokeWidth={2.2} />
                                  </Button>
                                </Flex>

                                <SummaryQuantityControl item={item} onChangeQuantity={onChangeQuantity} />
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Box borderWidth="1px" borderColor="gray.200" borderRadius="14px" bg="gray.50" px={3.5} py={3}>
                    <Text fontSize="sm" fontWeight="600" color="gray.700">
                      No tickets selected yet.
                    </Text>
                    <Text mt={1} fontSize="xs" color="gray.500" lineHeight="1.55">
                      Pick tickets in Sessions and the summary updates instantly.
                    </Text>
                  </Box>
                )}
              </Box>

              <Separator borderColor="gray.200" />

              <Flex justify="space-between" align="center" gap={3}>
                <Text fontSize="sm" color="gray.600">
                  Total
                </Text>
                <Text fontSize="lg" fontWeight="800" color="gray.900">
                  {formatAmount(total, currencyCode)}
                </Text>
              </Flex>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Portal>
  )
}
