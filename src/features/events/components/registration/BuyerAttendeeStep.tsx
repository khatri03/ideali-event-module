import { Badge, Box, Flex, HStack, Stack, Switch, Text } from "@chakra-ui/react"
import { Users } from "lucide-react"
import { AttendeeTicketCard } from "@/features/events/components/registration/AttendeeTicketCard"
import { ContactDetailsFields } from "@/features/events/components/registration/ContactDetailsFields"
import { SupportCard } from "@/features/events/components/registration/SupportCard"
import type {
  AttendeeSessionGroup,
  AttendeeSlotState,
  BuyerAttendeeInfoState,
} from "@/features/events/components/registration/types"

interface BuyerAttendeeStepProps {
  buyerInfo: BuyerAttendeeInfoState
  onChangeBuyerField: (field: keyof BuyerAttendeeInfoState, value: string) => void
  attendeeSessionGroups: AttendeeSessionGroup[]
  attendeeInfoBySlot: Record<string, AttendeeSlotState>
  ticketSameAsBuyerById: Record<string, boolean>
  isSessionSameAsBuyer: (sessionId: string) => boolean
  onToggleSessionSameAsBuyer: (sessionId: string, checked: boolean) => void
  onToggleTicketSameAsBuyer: (sessionId: string, ticketId: string, checked: boolean) => void
  onChangeAttendeeField: (slotKey: string, field: keyof BuyerAttendeeInfoState, value: string) => void
  requiresAttendeeInfo: boolean
  requiresQuestions: boolean
  validationMessage: string | null
}

export function BuyerAttendeeStep({
  buyerInfo,
  onChangeBuyerField,
  attendeeSessionGroups,
  attendeeInfoBySlot,
  ticketSameAsBuyerById,
  isSessionSameAsBuyer,
  onToggleSessionSameAsBuyer,
  onToggleTicketSameAsBuyer,
  onChangeAttendeeField,
  requiresAttendeeInfo,
  requiresQuestions,
  validationMessage,
}: BuyerAttendeeStepProps) {
  return (
    <Stack gap={5}>
      {validationMessage ? (
        <Box borderWidth="1px" borderColor="red.200" bg="red.50" borderRadius="18px" p={4}>
          <Text fontSize="sm" color="red.700" fontWeight="600">
            {validationMessage}
          </Text>
        </Box>
      ) : null}

      <SupportCard
        title="Your Information"
        subtitle="Enter the buyer contact details for order confirmation and follow-up."
        icon={<Users size={18} />}
        bg="gray.100"
        hasDivider
      >
        <Stack gap={4}>
          <Text fontSize="sm" color="gray.600" lineHeight="1.6">
            The buyer is the person placing the order and receiving the purchase confirmation.
          </Text>
          <ContactDetailsFields values={buyerInfo} onChange={onChangeBuyerField} />
        </Stack>
      </SupportCard>

      <SupportCard
        title="Session Attendees"
        subtitle="Each session is grouped once. Session toggles cover every attendee in the session, while ticket toggles only affect that ticket."
        icon={<Users size={18} />}
      >
        {attendeeSessionGroups.length === 0 ? (
          <Box borderWidth="1px" borderColor="gray.200" borderRadius="18px" bg="gray.50" p={4}>
            <Text fontSize="sm" color="gray.600" lineHeight="1.7">
              No attendee details are required for the tickets you have selected yet.
            </Text>
          </Box>
        ) : (
          <Stack gap={4}>
            <Box borderWidth="1px" borderColor="blue.200" borderRadius="18px" bg="blue.50" p={4}>
              <Flex justify="space-between" gap={4} align="start" flexWrap="wrap">
                <Stack gap={1} minW={0}>
                  <Text fontSize="sm" fontWeight="800" color="gray.900">
                    Attendee details by session
                  </Text>
                  <Text fontSize="sm" color="gray.600" lineHeight="1.6">
                    Turn on Same As Buyer at the session level to copy buyer data for every attendee in that session.
                    Use ticket-level toggles when only one ticket should follow the buyer.
                  </Text>
                </Stack>
                <HStack gap={2} flexWrap="wrap" justify="flex-end">
                  {requiresAttendeeInfo ? (
                    <Badge colorPalette="blue" variant="subtle" borderRadius="full" px={3} py={1}>
                      Attendee info required
                    </Badge>
                  ) : null}
                  {requiresQuestions ? (
                    <Badge colorPalette="orange" variant="subtle" borderRadius="full" px={3} py={1}>
                      Questions required
                    </Badge>
                  ) : null}
                </HStack>
              </Flex>
            </Box>

            <Stack gap={4}>
              {attendeeSessionGroups.map((sessionGroup) => {
                const sessionSameAsBuyer = isSessionSameAsBuyer(sessionGroup.sessionId)

                return (
                  <Box
                    key={sessionGroup.key}
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="20px"
                    bg="white"
                    p={4}
                    boxShadow="0 10px 24px rgba(15, 23, 42, 0.04)"
                  >
                    <Stack gap={4}>
                      <Flex
                        justify="space-between"
                        gap={4}
                        align={{ base: "start", md: "center" }}
                        direction={{ base: "column", md: "row" }}
                      >
                        <Stack gap={1} minW={0}>
                          <Text fontSize="sm" fontWeight="800" color="gray.900" lineHeight="1.4">
                            {sessionGroup.sessionName}
                          </Text>
                          <Text fontSize="sm" color="gray.600" lineHeight="1.4">
                            {sessionGroup.attendeeCount}{" "}
                            {sessionGroup.attendeeCount === 1 ? "attendee" : "attendees"} selected in this session.
                          </Text>
                        </Stack>

                        <HStack
                          gap={3}
                          align="center"
                          cursor="help"
                          title="Copy the buyer contact details into every attendee for this session."
                        >
                          <Text fontSize="sm" fontWeight="700" color="gray.700">
                            Same As Buyer
                          </Text>
                          <Switch.Root
                            checked={sessionSameAsBuyer}
                            onCheckedChange={(details) =>
                              onToggleSessionSameAsBuyer(sessionGroup.sessionId, details.checked === true)
                            }
                            colorPalette="brand"
                          >
                            <Switch.HiddenInput />
                            <Switch.Control cursor="pointer" />
                          </Switch.Root>
                        </HStack>
                      </Flex>

                      <Stack gap={4}>
                        {sessionGroup.tickets.map((ticketGroup) => (
                          <AttendeeTicketCard
                            key={ticketGroup.key}
                            group={ticketGroup}
                            buyerInfo={buyerInfo}
                            attendeeInfoBySlot={attendeeInfoBySlot}
                            sessionSameAsBuyer={sessionSameAsBuyer}
                            ticketSameAsBuyer={Boolean(ticketSameAsBuyerById[ticketGroup.ticketId])}
                            onToggleSameAsBuyer={onToggleTicketSameAsBuyer}
                            onChangeField={onChangeAttendeeField}
                          />
                        ))}
                      </Stack>
                    </Stack>
                  </Box>
                )
              })}
            </Stack>
          </Stack>
        )}
      </SupportCard>
    </Stack>
  )
}
