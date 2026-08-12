import { useState } from "react"
import { Badge, Box, Button, Heading, HStack, Link, SimpleGrid, Stack, Text, VisuallyHidden } from "@chakra-ui/react"
import { format } from "date-fns"
import { Send } from "lucide-react"
import { ConfirmDialog } from "@/features/custom-lists"
import { extractApiError } from "@/utils/errors"
import { formatCurrency } from "@/utils/format"
import { APP_ROUTES } from "@/utils/routes"
import { parseUtcDateTime } from "@/utils/utcDates"
import type { EventInvoiceLineItem, EventInvoiceTicket } from "@/api/eventInvoices"
import { useResendEventInvoice, useResendEventInvoiceTicket } from "../hooks/useEventInvoices"

interface EventInvoiceLineItemsSectionProps {
  invoiceUniqueId: string
  lineItems: EventInvoiceLineItem[]
  currencySymbol: string
  /** A cancelled order keeps its ticket history on screen but is never posted out again. */
  canResendTickets: boolean
}

type ResendTarget = { kind: "invoice" } | { kind: "ticket"; ticket: EventInvoiceTicket }

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
  currencySymbol,
  canResend,
  onResendTicket,
}: {
  item: EventInvoiceLineItem
  currencySymbol: string
  canResend: boolean
  onResendTicket: (ticket: EventInvoiceTicket) => void
}) {
  return (
    <Box border="1px solid" borderColor="border.subtle" borderRadius="16px" overflow="hidden">
      <Box px={4} py={3} bg="app.bg" borderBottomWidth="1px" borderBottomColor="border.subtle">
        <HStack justify="space-between" wrap="wrap" gap={2}>
          <Stack gap={0}>
            <Text fontWeight="700" color="text.primary">
              {item.ticketTypeName}
            </Text>
            <Text fontSize="xs" color="text.secondary">
              {item.sessionName}
            </Text>
          </Stack>
          <Text fontWeight="700" color="text.primary">
            {item.quantity} × {formatCurrency(item.unitPrice, currencySymbol)} = {formatCurrency(item.lineTotal, currencySymbol)}
          </Text>
        </HStack>
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
  currencySymbol,
  canResendTickets,
}: EventInvoiceLineItemsSectionProps) {
  const [resendTarget, setResendTarget] = useState<ResendTarget | null>(null)
  const resendInvoiceMutation = useResendEventInvoice(invoiceUniqueId)
  const resendTicketMutation = useResendEventInvoiceTicket(invoiceUniqueId)

  const hasAnyTicket = lineItems.some((item) => item.tickets.length > 0)

  async function handleConfirmResend() {
    try {
      if (resendTarget?.kind === "invoice") {
        await resendInvoiceMutation.mutateAsync()
      } else if (resendTarget?.kind === "ticket") {
        await resendTicketMutation.mutateAsync(resendTarget.ticket.ticketUniqueId)
      }
      setResendTarget(null)
    } catch {
      // Surfaced via the mutation's own error state below - keep the dialog open so it stays visible.
    }
  }

  const activeMutation = resendTarget?.kind === "ticket" ? resendTicketMutation : resendInvoiceMutation

  return (
    <Box border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" boxShadow="card" p={{ base: 4, md: 6 }}>
      <HStack justify="space-between" wrap="wrap" gap={2} mb={4}>
        <Heading as="h2" fontSize="lg" fontWeight="800" color="text.primary">
          Ticket delivery
        </Heading>
        {hasAnyTicket && canResendTickets ? (
          <Button
            data-print-hide
            size="sm"
            variant="outline"
            colorPalette="brand"
            borderRadius="12px"
            minH="11"
            px={4}
            cursor="pointer"
            onClick={() => setResendTarget({ kind: "invoice" })}
          >
            <Send size={14} />
            Resend all tickets
          </Button>
        ) : null}
      </HStack>

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
              currencySymbol={currencySymbol}
              canResend={canResendTickets}
              onResendTicket={(ticket) => setResendTarget({ kind: "ticket", ticket })}
            />
          ))}
        </Stack>
      )}

      {resendTarget ? (
        <ConfirmDialog
          title={resendTarget.kind === "invoice" ? "Resend all tickets" : "Resend ticket"}
          description={
            resendTarget.kind === "invoice" ? (
              <Text>Re-email every ticket on this order to the buyer and any attendees with their own address?</Text>
            ) : (
              <Text>
                Re-email ticket <strong>{resendTarget.ticket.ticketCode}</strong>?
              </Text>
            )
          }
          confirmLabel={resendTarget.kind === "invoice" ? "Resend all" : "Resend ticket"}
          loadingLabel="Sending..."
          tone="primary"
          errorMessage={activeMutation.error ? extractApiError(activeMutation.error) : null}
          isPending={activeMutation.isPending}
          onConfirm={handleConfirmResend}
          onClose={() => setResendTarget(null)}
        />
      ) : null}
    </Box>
  )
}
