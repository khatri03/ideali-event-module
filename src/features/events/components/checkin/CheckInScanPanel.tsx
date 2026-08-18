import { useEffect, useState } from "react"
import { Box, Heading, Stack, Text } from "@chakra-ui/react"
import { WifiOff } from "lucide-react"
import type { CheckInAttempt } from "@/api/eventCheckIn"
import { useConfirmationRequest } from "@/hooks/useConfirmationRequest"
import { CheckInConfirmDialog } from "./CheckInConfirmDialog"
import { CheckInOutcomeCard } from "./CheckInOutcomeCard"
import { ManualTicketCodeEntry } from "./ManualTicketCodeEntry"
import { TicketScanner } from "./TicketScanner"

/**
 * How long the scanner holds after each outcome before reading the next ticket on its own. The toast
 * is what reports the outcome, so the hold exists only to stop the guest behind being scanned over the
 * answer - a refusal holds longest, because it is the one the operator has to act on in person.
 */
const HOLD_MS: Record<CheckInAttempt["outcome"], number> = {
  Success: 1500,
  ManualOverride: 1500,
  AlreadyCheckedIn: 2500,
  Invalid: 3000,
}

interface CheckInScanPanelProps {
  attempt: CheckInAttempt | null
  isOnline: boolean
  isAdmitting: boolean
  isReversing: boolean
  onScan: (ticketCode: string) => void
  onUndo: (ticketCode: string) => void
}

export function CheckInScanPanel({
  attempt,
  isOnline,
  isAdmitting,
  isReversing,
  onScan,
  onUndo,
}: CheckInScanPanelProps) {
  const isBlocked = !isOnline
  const [releasedAttempt, setReleasedAttempt] = useState<CheckInAttempt | null>(null)
  const reversal = useConfirmationRequest<string>()
  const isHoldingOutcome = attempt !== null && releasedAttempt !== attempt

  useEffect(() => {
    if (attempt === null) {
      return
    }

    const timer = window.setTimeout(() => setReleasedAttempt(attempt), HOLD_MS[attempt.outcome])

    return () => window.clearTimeout(timer)
  }, [attempt])

  return (
    <Box
      border="1px solid"
      borderColor="border.subtle"
      borderRadius="20px"
      bg="card.bg"
      boxShadow="card"
      p={{ base: 4, md: 6 }}
    >
      <Stack gap={5}>
        <Box>
          <Heading fontSize={{ base: "lg", md: "xl" }} fontWeight="800" letterSpacing="-0.02em" color="text.primary">
            Scan a ticket
          </Heading>
          <Text mt={1} fontSize={{ base: "xs", md: "sm" }} color="text.secondary">
            Hold the QR code inside the frame, or type the code printed beneath it.
          </Text>
        </Box>

        {!isOnline ? (
          <PausedNotice
            icon={<WifiOff size={20} aria-hidden="true" />}
            title="No connection"
            detail="Check-in is paused until the network returns. Nothing scanned now would be recorded."
          />
        ) : null}

        <TicketScanner
          isPaused={isBlocked || isAdmitting || isReversing || isHoldingOutcome}
          onScan={onScan}
        />

        {attempt ? (
          <CheckInOutcomeCard attempt={attempt} isReversing={isReversing} onUndo={reversal.open} />
        ) : null}

        <ManualTicketCodeEntry isSubmitting={isAdmitting} isDisabled={isBlocked} onSubmit={onScan} />

        {reversal.request !== null ? (
          <CheckInConfirmDialog
            kind="undoCheckIn"
            ticketCode={reversal.request}
            isOpen={reversal.isOpen}
            onConfirm={() => reversal.confirm(onUndo)}
            onCancel={reversal.close}
          />
        ) : null}
      </Stack>
    </Box>
  )
}

interface PausedNoticeProps {
  icon: React.ReactNode
  title: string
  detail: string
}

function PausedNotice({ icon, title, detail }: PausedNoticeProps) {
  return (
    <Stack
      direction="row"
      align="flex-start"
      gap={3}
      borderWidth="1px"
      borderColor="status.error"
      borderRadius="16px"
      bg="status.error.bg"
      color="status.error.fg"
      px={{ base: 4, md: 5 }}
      py={4}
      role="alert"
    >
      <Box flexShrink={0} mt="2px">
        {icon}
      </Box>
      <Box minW={0}>
        <Text fontSize="sm" fontWeight="700">
          {title}
        </Text>
        <Text mt={1} fontSize="xs" lineHeight="1.5">
          {detail}
        </Text>
      </Box>
    </Stack>
  )
}
