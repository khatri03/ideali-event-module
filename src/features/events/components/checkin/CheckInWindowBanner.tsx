import { Box, Stack, Text, VisuallyHidden } from "@chakra-ui/react"
import { format } from "date-fns"
import { Clock, DoorClosed } from "lucide-react"
import type { CheckInCountdown } from "@/features/events/hooks/useCheckInCountdown"
import { splitDuration, type DurationUnit } from "@/utils/duration"
import { CountdownCards } from "./CountdownCards"

/**
 * How near the closing boundary has to be before the desk is warned about it. Counting down from the
 * moment doors open would leave a timer ticking at staff for hours with nothing to act on.
 */
const CLOSING_SOON_MS = 30 * 60 * 1000

interface CheckInWindowBannerProps {
  countdown: CheckInCountdown
}

export function CheckInWindowBanner({ countdown }: CheckInWindowBannerProps) {
  if (countdown.phase === "closed") {
    return (
      <ClosedDoorNotice
        title="Check-in has closed"
        detail={countdown.closesAt ? `Closed at ${formatDoorTime(countdown.closesAt)}.` : null}
      />
    )
  }

  if (countdown.phase === "beforeOpen" && countdown.remainingMs !== null) {
    return (
      <DoorsOpenCountdown
        remainingMs={countdown.remainingMs}
        opensAt={countdown.opensAt}
      />
    )
  }

  if (countdown.phase === "open" && countdown.remainingMs !== null && countdown.remainingMs <= CLOSING_SOON_MS) {
    return (
      <ClosingSoonNotice
        remainingMs={countdown.remainingMs}
        detail={countdown.closesAt ? `Closes at ${formatDoorTime(countdown.closesAt)}.` : null}
      />
    )
  }

  return null
}

interface DoorsOpenCountdownProps {
  remainingMs: number
  opensAt: Date | null
}

/**
 * The whole screen at this point, so it is built as a panel rather than a strip: nothing on the desk
 * can be done until this runs out, and an operator glancing up from a queue has to read it at a
 * distance. Deliberately not tinted as a warning - nothing is wrong, staff are simply early.
 */
function DoorsOpenCountdown({ remainingMs, opensAt }: DoorsOpenCountdownProps) {
  return (
    <Box
      border="1px solid"
      borderColor="border.subtle"
      borderRadius="20px"
      bg="card.bg"
      boxShadow="card"
      px={{ base: 4, md: 8 }}
      py={{ base: 6, md: 8 }}
      role="status"
    >
      <Stack gap={{ base: 5, md: 6 }} align="center" textAlign="center">
        <Stack gap={2} align="center">
          <Stack
            direction="row"
            align="center"
            gap={2}
            borderRadius="999px"
            bg="status.warning.bg"
            color="status.warning.fg"
            px={4}
            py={2}
          >
            <Clock size={16} aria-hidden="true" />
            <Text fontSize="xs" fontWeight="700" letterSpacing="0.08em" textTransform="uppercase">
              Check-in not open yet
            </Text>
          </Stack>
          <Text fontSize={{ base: "sm", md: "md" }} color="text.secondary">
            Scanning starts on its own the moment this reaches zero.
          </Text>
        </Stack>

        <CountdownCards remainingMs={remainingMs} />

        {opensAt ? (
          <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="600" color="text.secondary">
            Doors open at {formatDoorTime(opensAt)}.
          </Text>
        ) : null}
      </Stack>

      {/*
        Spoken at minute granularity on purpose. The wording only changes once a minute, so the live
        region stays quiet between announcements instead of interrupting every second.
      */}
      <VisuallyHidden aria-live="polite">Check-in opens in {describeRemaining(remainingMs)}</VisuallyHidden>
    </Box>
  )
}

interface ClosingSoonNoticeProps {
  remainingMs: number
  detail: string | null
}

function ClosingSoonNotice({ remainingMs, detail }: ClosingSoonNoticeProps) {
  return (
    <NoticeStrip
      tone="warning"
      icon={<Clock size={20} aria-hidden="true" />}
      title="Check-in closes soon"
      detail={detail}
      trailing={<CountdownCards remainingMs={remainingMs} size="sm" />}
      spoken={`Check-in closes in ${describeRemaining(remainingMs)}`}
    />
  )
}

interface ClosedDoorNoticeProps {
  title: string
  detail: string | null
}

function ClosedDoorNotice({ title, detail }: ClosedDoorNoticeProps) {
  return (
    <NoticeStrip tone="error" icon={<DoorClosed size={20} aria-hidden="true" />} title={title} detail={detail} />
  )
}

interface NoticeStripProps {
  tone: "warning" | "error"
  icon: React.ReactNode
  title: string
  detail: string | null
  trailing?: React.ReactNode
  spoken?: string
}

function NoticeStrip({ tone, icon, title, detail, trailing, spoken }: NoticeStripProps) {
  return (
    <Stack
      direction={{ base: "column", md: "row" }}
      align={{ base: "stretch", md: "center" }}
      gap={{ base: 4, md: 5 }}
      borderWidth="1px"
      borderColor={`status.${tone}`}
      borderRadius="20px"
      bg={`status.${tone}.bg`}
      color={`status.${tone}.fg`}
      px={{ base: 4, md: 6 }}
      py={4}
      role="status"
    >
      <Stack direction="row" align="flex-start" gap={3} flex={1} minW={0}>
        <Box flexShrink={0} mt="2px">
          {icon}
        </Box>
        <Box minW={0}>
          <Text fontSize={{ base: "sm", md: "md" }} fontWeight="700">
            {title}
          </Text>
          {detail ? (
            <Text mt={1} fontSize="xs" lineHeight="1.5">
              {detail}
            </Text>
          ) : null}
        </Box>
      </Stack>

      {trailing ? <Box flexShrink={0}>{trailing}</Box> : null}
      {spoken ? <VisuallyHidden aria-live="polite">{spoken}</VisuallyHidden> : null}
    </Stack>
  )
}

const UNIT_NAMES: Record<Exclude<DurationUnit, "seconds">, string> = {
  days: "day",
  hours: "hour",
  minutes: "minute",
}

function describeRemaining(remainingMs: number): string {
  const parts = splitDuration(remainingMs)
  const spoken = (Object.keys(UNIT_NAMES) as (keyof typeof UNIT_NAMES)[])
    .filter((unit) => parts[unit] > 0)
    .map((unit) => `${parts[unit]} ${UNIT_NAMES[unit]}${parts[unit] === 1 ? "" : "s"}`)

  return spoken.length > 0 ? spoken.join(" ") : "less than a minute"
}

function formatDoorTime(instant: Date): string {
  return format(instant, "MMM d, yyyy 'at' h:mm a")
}
