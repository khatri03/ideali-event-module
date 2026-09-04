import { Button, Tooltip } from "@chakra-ui/react"
import { LayoutGrid } from "lucide-react"

interface SeatsIoCategoryCapacityButtonProps {
  /** Whether the count is being read, so the button says so and cannot be pressed twice. */
  isBusy: boolean
  /** Why the count cannot be pulled right now, or null when it can. */
  disabledReason: string | null
  /** Asks for the selected category's seat count. */
  onPull: () => void
}

const READY_HINT = "Counts the seats drawn against this category on the published layout"

/**
 * Fills the ticket total from the seating layout instead of leaving the organizer to count seats in the designer.
 *
 * The button is never rendered dead: when the count cannot be pulled it stays hoverable and carries the reason,
 * because Chakra's `disabled` suppresses pointer events and would take the explanation with it.
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
          variant="outline"
          size="sm"
          borderRadius="12px"
          minH="11"
          px={3}
          gap={2}
          fontSize="xs"
          fontWeight="700"
          colorPalette="brand"
          aria-disabled={isBlocked}
          opacity={isBlocked ? 0.55 : 1}
          cursor={isBlocked ? "not-allowed" : "pointer"}
          onClick={() => {
            if (isBlocked) {
              return
            }

            onPull()
          }}
        >
          <LayoutGrid size={14} aria-hidden />
          {isBusy ? "Counting..." : "Use layout count"}
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content>{disabledReason ?? READY_HINT}</Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  )
}
