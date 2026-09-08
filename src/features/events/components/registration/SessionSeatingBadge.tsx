import { Circle, Tooltip } from "@chakra-ui/react"
import { Armchair } from "lucide-react"

/**
 * Marks a session whose tickets are bought by choosing a seat on a plan.
 *
 * The two kinds of session look alike while collapsed and behave differently once opened: one takes a quantity, the
 * other takes a seat and holds it. The mark is a seat rather than a worded badge so a long list stays scannable,
 * and it carries its own label and tooltip so what it means is never left to the picture alone.
 */
export function SessionSeatingBadge() {
  return (
    <Tooltip.Root openDelay={200} closeDelay={100}>
      <Tooltip.Trigger asChild>
        <Circle
          size="32px"
          bg="brand.100"
          color="brand.600"
          borderWidth="1px"
          borderColor="brand.400"
          cursor="help"
          tabIndex={0}
          role="img"
          aria-label="Seat selection"
          _focusVisible={{ outline: "2px solid", outlineColor: "brand.500", outlineOffset: "2px" }}
        >
          <Armchair size={16} aria-hidden />
        </Circle>
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content>Seats for this session are picked from a seating plan.</Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  )
}
