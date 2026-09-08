import { Badge, HStack, Text, Tooltip } from "@chakra-ui/react"
import { AlertCircle } from "lucide-react"

/**
 * Warns that this session will ask who each ticket is for.
 *
 * A buyer who reaches the attendee step with a dozen tickets in the basket and no names to hand either abandons the
 * registration or invents them, so the demand is stated on the session they are choosing rather than sprung on them
 * two steps later.
 */
export function SessionAttendeeInfoBadge() {
  return (
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
  )
}
