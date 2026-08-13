import { useState } from "react"
import { Badge, Box, Button, Heading, HStack, Link, SimpleGrid, Stack, Text, VisuallyHidden } from "@chakra-ui/react"
import { format } from "date-fns"
import { Send } from "lucide-react"
import { ConfirmDialog } from "@/components/common"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import { parseUtcDateTime } from "@/utils/utcDates"
import type { EventInvoiceLineItem, EventInvoiceTicket } from "@/api/eventInvoices"
import { useResendEventInvoiceTicket } from "../hooks/useEventInvoices"

interface EventInvoiceLineItemsSectionProps {
  invoiceUniqueId: string
  lineItems: EventInvoiceLineItem[]
  /** A cancelled order keeps its ticket history on screen but is never posted out again. */
  canResendTickets: boolean
}

/** Mirrors EventTicketStatus on the server; a status it has not seen falls back to neutral. */
const TICKET_STATUS_TOKENS: Record<string, { bg: string; fg: string }> = {
  Active: { bg: "status.success.bg", fg: "status.success.fg" },
  CheckedIn: { bg: "status.info.bg", fg: "status.info.fg" },
  Cancelled: { bg: "status.neutral.bg", fg: "status.neutral.fg" },
  Refunded: { bg: "status.error.bg", fg: "status.error.fg" },
}

const NEUTRAL_TICKET_TOKENS = { bg: "status.neutral.bg", fg: "status.neutral.fg" }

function formatTimestamp(value: string | null) {
  const parsed = parseUtcDateTime(value)
  return parsed ? format(parsed, "MMM d, yyyy h:mm a") : null
}

function LineItemCard({
  item,
  canResend,
  onResendTicket,
}: {
  item: EventInvoiceLineItem
  canResend: boolean
  onResendTicket: (ticket: EventInvoiceTicket) => void
}) {
  return (
    <Box border="1px solid" borderColor="border.subtle" borderRadius="16px" overflow="hidden">
      <Box px={4} py={3} bg="app.bg" borderBottomWidth="1px" borderBottomColor="border.subtle">
        <Text fontSize="xs" fontWeight="700" color="text.secondary" textTransform="uppercase" letterSpacing="0.08em">
          {item.sessionName}
        </Text>
      </Box>

      <Box p={4}>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <Stack gap={2}>
            <Text fontSize="xs" fontWeight="700" color="text.secondary" textTransform="uppercase" letterSpacing="0.08em">
              Attendees
            </Text>
            {item.attendees.length === 0 ? (
              <Text fontSize="sm" color="text.secondary">
                No attendee details recorded.
              </Text>
            ) : (
              item.attendees.map((attendee, index) => (
                <Text key={`${attendee.name}-${index}`} fontSize="sm" color="text.secondary">
                  {attendee.name}
                  {attendee.email ? ` · ${attendee.email}` : ""}
                  {attendee.phone ? ` · ${attendee.phone}` : ""}
                </Text>
              ))
            )}
          </Stack>

          <Stack gap={2}>
            <Text fontSize="xs" fontWeight="700" color="text.secondary" textTransform="uppercase" letterSpacing="0.08em">
              Issued tickets
            </Text>
            {item.tickets.length === 0 ? (
              <Text fontSize="sm" color="text.secondary">
                No ticket issued yet - payment has not settled.
              </Text>
            ) : (
              item.tickets.map((ticket) => (
                <HStack key={ticket.ticketUniqueId} gap={2} wrap="wrap">
                  <Link
                    href={APP_ROUTES.eventTicketView(ticket.ticketUniqueId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    fontSize="sm"
                    fontFamily="mono"
                    fontWeight="700"
                    color="brand.600"
                    display="inline-flex"
                    alignItems="center"
                    minH="11"
                    cursor="pointer"
                    _hover={{ textDecoration: "underline" }}
                  >
                    {ticket.ticketCode}
                    <VisuallyHidden> - open ticket</VisuallyHidden>
                  </Link>
                  <Badge
                    bg={(TICKET_STATUS_TOKENS[ticket.ticketStatus] ?? NEUTRAL_TICKET_TOKENS).bg}
                    color={(TICKET_STATUS_TOKENS[ticket.ticketStatus] ?? NEUTRAL_TICKET_TOKENS).fg}
                    borderRadius="full"
                    px={2}
                    py={0.5}
                    fontSize="xs"
                    fontWeight="700"
                  >
                    {ticket.ticketStatusLabel}
                  </Badge>
                  {ticket.deliveredAtUtc ? (
                    <Text fontSize="xs" color="text.secondary">
                      Delivered {formatTimestamp(ticket.deliveredAtUtc)}
                    </Text>
                  ) : (
                    <Text fontSize="xs" color="status.warning.fg">
                      Not delivered
                    </Text>
                  )}
                  {ticket.checkedInAtUtc ? (
                    <Text fontSize="xs" color="text.secondary">
                      Checked in {formatTimestamp(ticket.checkedInAtUtc)}
                    </Text>
                  ) : null}
                  {canResend ? (
                    <Button
                      data-print-hide
                      size="sm"
                      variant="ghost"
                      colorPalette="brand"
                      borderRadius="10px"
                      minH="11"
                      px={2}
                      cursor="pointer"
                      onClick={() => onResendTicket(ticket)}
                    >
                      <Send size={14} />
                      Resend
                      <VisuallyHidden> ticket {ticket.ticketCode}</VisuallyHidden>
                    </Button>
                  ) : null}
                </HStack>
              ))
            )}
          </Stack>
        </SimpleGrid>
      </Box>
    </Box>
  )
}

export function EventInvoiceLineItemsSection({
  invoiceUniqueId,
  lineItems,
  canResendTickets,
}: EventInvoiceLineItemsSectionProps) {
  const [resendTarget, setResendTarget] = useState<EventInvoiceTicket | null>(null)
  const resendTicketMutation = useResendEventInvoiceTicket(invoiceUniqueId)

  async function handleConfirmResend() {
    if (!resendTarget) return
    try {
      await resendTicketMutation.mutateAsync(resendTarget.ticketUniqueId)
      setResendTarget(null)
    } catch {
      // Surfaced via the mutation's own error state below - keep the dialog open so it stays visible.
    }
  }

  return (
    <Box border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 6 }}>
      <Heading as="h2" fontSize="lg" fontWeight="800" color="text.primary" mb={4}>
        Ticket delivery
      </Heading>

      {lineItems.length === 0 ? (
        <Text fontSize="sm" color="text.secondary">
          No ticket lines on this invoice.
        </Text>
      ) : (
        <Stack gap={4}>
          {lineItems.map((item) => (
            <LineItemCard
              key={item.invoiceItemUniqueId}
              item={item}
              canResend={canResendTickets}
              onResendTicket={(ticket) => setResendTarget(ticket)}
            />
          ))}
        </Stack>
      )}

      {resendTarget ? (
        <ConfirmDialog
          title="Resend ticket"
          description={
            <Text>
              Re-email ticket <strong>{resendTarget.ticketCode}</strong>?
            </Text>
          }
          confirmLabel="Resend ticket"
          loadingLabel="Sending..."
          tone="primary"
          errorMessage={resendTicketMutation.error ? extractApiError(resendTicketMutation.error) : null}
          isPending={resendTicketMutation.isPending}
          onConfirm={handleConfirmResend}
          onClose={() => setResendTarget(null)}
        />
      ) : null}
    </Box>
  )
}
