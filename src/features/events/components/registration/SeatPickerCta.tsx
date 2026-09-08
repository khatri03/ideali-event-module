import { Button } from "@chakra-ui/react"
import { Armchair } from "lucide-react"
import { CONTROL_BUTTON_PRIMARY } from "@/components/common/controlStyles"
import { hexToRgba } from "@/features/events/utils/registrationFormat"

interface SeatPickerCtaProps {
  /** Seats this cart is already holding on the session, so the button can say what pressing it will change. */
  seatCount: number
  /** The organizer's form colour, so the strongest control on the card belongs to their event rather than ours. */
  accentColor: string
  /** Called when the buyer asks to open the seat map. */
  onOpen: () => void
}

/**
 * Opens the seat map for one session.
 *
 * The chart is the heaviest thing on the registration form and every seated session would otherwise draw its own,
 * so it is fetched and mounted only for the session the buyer actually asks about. The label names the outcome
 * rather than the mechanism: a buyer who already holds seats needs to know this button changes them rather than
 * starting again.
 */
export function SeatPickerCta({ seatCount, accentColor, onOpen }: SeatPickerCtaProps) {
  const hasSeats = seatCount > 0

  return (
    <Button
      {...CONTROL_BUTTON_PRIMARY}
      bg={accentColor}
      minH="11"
      px={5}
      w={{ base: "full", md: "auto" }}
      // Twice the width its label needs, so the way into a seated session reads as the main move on the card
      // rather than one more control the buyer has to hunt for. A phone keeps the full-width button instead.
      minW={{ base: "auto", md: "18rem" }}
      alignSelf={{ base: "stretch", md: "center" }}
      cursor="pointer"
      _hover={{ bg: hexToRgba(accentColor, 0.88) }}
      _active={{ bg: hexToRgba(accentColor, 0.95) }}
      onClick={onOpen}
    >
      <Armchair size={18} aria-hidden />
      {hasSeats ? `Change seats · ${seatCount} picked` : "Pick seats"}
    </Button>
  )
}
