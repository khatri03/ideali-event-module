import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react"
import { CheckCircle2, RotateCcw, ShieldAlert, TriangleAlert } from "lucide-react"
import type { CheckInAttempt } from "@/api/eventCheckIn"
import { CHECK_IN_OUTCOME_PRESENTATION } from "@/features/events/utils/checkInOutcome"
import { OutstandingBalanceNotice } from "./OutstandingBalanceNotice"

interface CheckInOutcomeCardProps {
  attempt: CheckInAttempt
  isReversing: boolean
  onUndo: (ticketCode: string) => void
}

const OUTCOME_ICONS = {
  Success: CheckCircle2,
  AlreadyCheckedIn: TriangleAlert,
  Invalid: ShieldAlert,
  ManualOverride: RotateCcw,
} as const

/**
 * A single strip under the scanner: the toast already announced the outcome, so this only has to stay
 * behind as the record of the last ticket read, close enough to the camera to be checked at a glance.
 */
export function CheckInOutcomeCard({ attempt, isReversing, onUndo }: CheckInOutcomeCardProps) {
  const presentation = CHECK_IN_OUTCOME_PRESENTATION[attempt.outcome]
  const Icon = OUTCOME_ICONS[attempt.outcome]
  const canUndo = attempt.outcome === "Success" || attempt.outcome === "AlreadyCheckedIn"

  return (
    <Stack gap={2}>
      <Flex
        align="center"
        gap={3}
        borderWidth="1px"
        borderColor={presentation.border}
        borderRadius="14px"
        bg={presentation.surface}
        color={presentation.foreground}
        px={4}
        py={3}
        role="status"
        aria-live="polite"
      >
        <Box flexShrink={0} display="flex">
          <Icon size={20} aria-hidden="true" color="currentColor" />
        </Box>

        <Box flex="1" minW={0}>
          <Text fontSize="sm" fontWeight="800" lineHeight="1.3">
            {presentation.heading}
          </Text>
          {/* The operator is looking at a person, not a code, so the name leads and the code backs it up. */}
          {attempt.attendeeName ? (
            <Text fontSize="sm" fontWeight="700" lineHeight="1.3" lineClamp={1}>
              {attempt.attendeeName}
            </Text>
          ) : null}
          <Text fontFamily="mono" fontSize="xs" opacity={0.85} lineClamp={1}>
            {attempt.ticketCode}
          </Text>
        </Box>

        {canUndo ? (
          <Button
            size="xs"
            minH="11"
            px={4}
            borderRadius="12px"
            fontWeight="700"
            variant="outline"
            bg="card.bg"
            flexShrink={0}
            cursor={isReversing ? "not-allowed" : "pointer"}
            disabled={isReversing}
            loading={isReversing}
            loadingText="Reversing..."
            onClick={() => onUndo(attempt.ticketCode)}
          >
            Undo
          </Button>
        ) : null}
      </Flex>

      {attempt.outstandingAmount ? (
        <OutstandingBalanceNotice amount={attempt.outstandingAmount} currency={attempt.outstandingCurrency} />
      ) : null}
    </Stack>
  )
}
