import { Badge, Box, Flex, HStack, Separator, SimpleGrid, Stack, Switch, Text } from "@chakra-ui/react"
import { ContactDetailsFields } from "@/features/events/components/registration/ContactDetailsFields"
import {
  EMPTY_BUYER_INFO,
  type AttendeeSlotState,
  type AttendeeTicketGroup,
  type BuyerAttendeeInfoState,
} from "@/features/events/components/registration/types"

interface AttendeeSlotCardProps {
  slot: {
    key: string
    sessionName: string
    attendeeLabel: string
  }
  values: BuyerAttendeeInfoState
  disabled: boolean
  onChangeField: (slotKey: string, field: keyof BuyerAttendeeInfoState, value: string) => void
}

export function AttendeeSlotCard({ slot, values, disabled, onChangeField }: AttendeeSlotCardProps) {
  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="20px"
      bg="white"
      p={4}
      boxShadow="0 10px 24px rgba(15, 23, 42, 0.04)"
    >
      <Stack gap={4}>
        <Box bg="gray.100" px={4} py={3}>
          <Text fontSize="sm" fontWeight="800" color="gray.900" lineHeight="1.4">
            {slot.attendeeLabel}
          </Text>
        </Box>

        <Separator borderColor="gray.200" />

        <ContactDetailsFields
          values={values}
          onChange={(field, value) => onChangeField(slot.key, field, value)}
          disabled={disabled}
        />
      </Stack>
    </Box>
  )
}

interface AttendeeTicketCardProps {
  group: AttendeeTicketGroup
  buyerInfo: BuyerAttendeeInfoState
  attendeeInfoBySlot: Record<string, AttendeeSlotState>
  sessionSameAsBuyer: boolean
  ticketSameAsBuyer: boolean
  onToggleSameAsBuyer: (sessionId: string, ticketId: string, checked: boolean) => void
  onChangeField: (slotKey: string, field: keyof BuyerAttendeeInfoState, value: string) => void
}

export function AttendeeTicketCard({
  group,
  buyerInfo,
  attendeeInfoBySlot,
  sessionSameAsBuyer,
  ticketSameAsBuyer,
  onToggleSameAsBuyer,
  onChangeField,
}: AttendeeTicketCardProps) {
  const isSameAsBuyer = sessionSameAsBuyer || ticketSameAsBuyer

  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="20px"
      bg="white"
      p={4}
      boxShadow="0 10px 24px rgba(15, 23, 42, 0.04)"
    >
      <Stack gap={4}>
        <Box bg="gray.100" borderRadius="16px" px={4} py={3}>
          <Flex
            justify="space-between"
            gap={4}
            align={{ base: "start", md: "center" }}
            direction={{ base: "column", md: "row" }}
          >
            <Stack gap={1} minW={0}>
              <HStack gap={2} align="baseline" flexWrap="wrap" minW={0}>
                <Text fontSize="sm" fontWeight="800" color="gray.900" lineHeight="1.4" lineClamp={1}>
                  {group.ticketName}
                </Text>
                <Text fontSize="sm" color="gray.600" lineHeight="1.4" whiteSpace="nowrap">
                  | {group.attendeeCount} {group.attendeeCount === 1 ? "attendee" : "attendees"}
                </Text>
              </HStack>
              {group.hasQuestions ? (
                <HStack gap={2} flexWrap="wrap">
                  <Badge colorPalette="orange" variant="subtle" borderRadius="full" px={3} py={1}>
                    Questions
                  </Badge>
                </HStack>
              ) : null}
            </Stack>

            <HStack
              gap={3}
              align="center"
              cursor="help"
              title="Copy the buyer contact details into every attendee for this ticket."
            >
              <Text fontSize="sm" fontWeight="700" color="gray.700">
                Same As Buyer
              </Text>
              <Switch.Root
                checked={isSameAsBuyer}
                disabled={sessionSameAsBuyer}
                onCheckedChange={(details) => onToggleSameAsBuyer(group.sessionId, group.ticketId, details.checked === true)}
                colorPalette="brand"
              >
                <Switch.HiddenInput />
                <Switch.Control cursor={sessionSameAsBuyer ? "not-allowed" : "pointer"} />
              </Switch.Root>
            </HStack>
          </Flex>
        </Box>

        <Separator borderColor="gray.200" />

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {group.slots.map((slot) => (
            <AttendeeSlotCard
              key={slot.key}
              slot={{ key: slot.key, sessionName: group.sessionName, attendeeLabel: slot.attendeeLabel }}
              values={isSameAsBuyer ? buyerInfo : (attendeeInfoBySlot[slot.key] ?? EMPTY_BUYER_INFO)}
              disabled={isSameAsBuyer}
              onChangeField={onChangeField}
            />
          ))}
        </SimpleGrid>
      </Stack>
    </Box>
  )
}
