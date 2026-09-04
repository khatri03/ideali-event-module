import { Button, Portal, Spinner, Tooltip } from "@chakra-ui/react"
import { LayoutGrid } from "lucide-react"

interface SeatsIoCategoryCapacityButtonProps {
  /** Whether the count is being read, so the button says so and cannot be pressed twice. */
  isBusy: boolean
  /** Why the count cannot be pulled right now, or null when it can. */
  disabledReason: string | null
  /** Asks for the selected category's seat count. */
  onPull: () => void
}

const READY_HINT = "Use layout count — counts the seats drawn against this category on the published layout"

/**
 * Fills the ticket total from the seating layout instead of leaving the organizer to count seats in the designer.
 *
 * It sits inside the Total Tickets field rather than beside its label, so the label keeps the height and weight of
 * every other label in the form and the two columns stay on one baseline. The button is never rendered dead: when
 * the count cannot be pulled it stays hoverable and carries the reason, because Chakra's `disabled` suppresses
 * pointer events and would take the explanation with it.
 */
export function SeatsIoCategoryCapacityButton({
  isBusy,
  disabledReason,
  onPull,
}: SeatsIoCategoryCapacityButtonProps) {
  const isBlocked = Boolean(disabledReason) || isBusy

  return (
    <Tooltip.Root openDelay={250} closeDelay={100}>
      <Tooltip.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label={isBusy ? "Counting seats" : "Use layout count"}
          colorPalette="brand"
          color={isBlocked ? "gray.400" : "brand.500"}
          borderRadius="12px"
          h="44px"
          minW="44px"
          px={0}
          aria-disabled={isBlocked}
          cursor={isBlocked ? "not-allowed" : "pointer"}
          _hover={{ bg: isBlocked ? "transparent" : "brand.50" }}
          onClick={() => {
            if (isBlocked) {
              return
            }

            onPull()
          }}
        >
          {isBusy ? <Spinner size="sm" /> : <LayoutGrid size={18} aria-hidden />}
        </Button>
      </Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner>
          <Tooltip.Content maxW="260px">{disabledReason ?? READY_HINT}</Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  )
}
