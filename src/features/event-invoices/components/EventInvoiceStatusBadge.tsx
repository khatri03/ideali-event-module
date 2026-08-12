import { HStack, Text } from "@chakra-ui/react"
import { AlertTriangle, Ban, CheckCircle2, Clock, RotateCcw, Scale, type LucideIcon } from "lucide-react"
import type { EventInvoiceStatus } from "@/api/eventInvoices"

type StatusTone = "success" | "warning" | "error" | "info" | "neutral"

interface StatusPresentation {
  tone: StatusTone
  icon: LucideIcon
}

const TONE_TOKENS: Record<StatusTone, { bg: string; fg: string }> = {
  success: { bg: "status.success.bg", fg: "status.success.fg" },
  warning: { bg: "status.warning.bg", fg: "status.warning.fg" },
  error: { bg: "status.error.bg", fg: "status.error.fg" },
  info: { bg: "status.info.bg", fg: "status.info.fg" },
  neutral: { bg: "status.neutral.bg", fg: "status.neutral.fg" },
}

const STATUS_PRESENTATION: Record<EventInvoiceStatus, StatusPresentation> = {
  Paid: { tone: "success", icon: CheckCircle2 },
  PendingPayment: { tone: "warning", icon: Clock },
  PartiallyPaid: { tone: "warning", icon: Clock },
  Failed: { tone: "error", icon: AlertTriangle },
  Cancelled: { tone: "error", icon: Ban },
  Refund: { tone: "info", icon: RotateCcw },
  PartiallyRefunded: { tone: "info", icon: RotateCcw },
  AdjustedInSystem: { tone: "info", icon: Scale },
}

const UNKNOWN_STATUS: StatusPresentation = { tone: "neutral", icon: Scale }

/** The map is exhaustive over the statuses the client knows; this only covers a server that has shipped
 * a new one ahead of the frontend, which must still render rather than crash. */
function presentationFor(status: string): StatusPresentation {
  return STATUS_PRESENTATION[status as EventInvoiceStatus] ?? UNKNOWN_STATUS
}

export interface EventInvoiceStatusBadgeProps {
  status: string
  label: string
  size?: "sm" | "md"
}

/**
 * Colour alone never carries the state: the badge always pairs its tone with an icon and the written
 * label, so a paid order and a cancelled one stay distinguishable without colour vision.
 */
export function EventInvoiceStatusBadge({ status, label, size = "md" }: EventInvoiceStatusBadgeProps) {
  const { tone, icon: Icon } = presentationFor(status)
  const { bg, fg } = TONE_TOKENS[tone]
  const isCompact = size === "sm"

  return (
    <HStack
      as="span"
      // The tone is what tells a cancelled order from a paid one at a glance; naming it in the DOM keeps
      // that contract assertable without reaching into generated class names.
      data-status-tone={tone}
      display="inline-flex"
      gap={2}
      bg={bg}
      color={fg}
      borderRadius="full"
      px={isCompact ? 2.5 : 3.5}
      py={isCompact ? 1 : 2}
      minH={isCompact ? "6" : "8"}
    >
      <Icon size={isCompact ? 13 : 16} aria-hidden="true" />
      <Text as="span" fontSize={isCompact ? "xs" : "sm"} fontWeight="800" lineHeight="1.2" whiteSpace="nowrap">
        {label}
      </Text>
    </HStack>
  )
}
