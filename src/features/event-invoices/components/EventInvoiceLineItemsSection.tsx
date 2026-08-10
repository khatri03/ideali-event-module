import { useState } from "react"
import { Badge, Box, Button, Heading, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react"
import { format } from "date-fns"
import { Send } from "lucide-react"
import { ConfirmDialog } from "@/features/custom-lists"
import { extractApiError } from "@/utils/errors"
import { parseUtcDateTime } from "@/utils/utcDates"
import type { EventInvoiceLineItem, EventInvoiceTicket } from "@/api/eventInvoices"
import { useResendEventInvoice, useResendEventInvoiceTicket } from "../hooks/useEventInvoices"

interface EventInvoiceLineItemsSectionProps {
  invoiceUniqueId: string
  lineItems: EventInvoiceLineItem[]
  currencySymbol: string
}

type ResendTarget = { kind: "invoice" } | { kind: "ticket"; ticket: EventInvoiceTicket }

const TICKET_STATUS_COLOR: Record<string, string> = {
  Active: "green",
  CheckedIn: "blue",
  Cancelled: "gray",
  Refunded: "red",
}

function formatMoney(value: number, currencySymbol: string) {
  return `${currencySymbol}${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`
}

function formatTimestamp(value: string | null) {
  const parsed = parseUtcDateTime(value)
  return parsed ? format(parsed, "MMM d, yyyy h:mm a") : null
}

function LineItemCard({
  item,
  currencySymbol,
  onResendTicket,
}: {
  item: EventInvoiceLineItem
  currencySymbol: string
  onResendTicket: (ticket: EventInvoiceTicket) => void
}) {
  return (
    <Box border="1px solid" borderColor="gray.200" borderRadius="16px" overflow="hidden">
      <Box px={4} py={3} bg="gray.50" borderBottomWidth="1px" borderBottomColor="gray.200">
        <HStack justify="space-between" wrap="wrap" gap={2}>
          <Stack gap={0}>
            <Text fontWeight="700" color="gray.900">
              {item.ticketTypeName}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {item.sessionName}
            </Text>
          </Stack>
          <Text fontWeight="700" color="gray.900">
            {item.quantity} × {formatMoney(item.unitPrice, currencySymbol)} = {formatMoney(item.lineTotal, currencySymbol)}
          </Text>
        </HStack>
      </Box>

      <Box p={4}>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <Stack gap={2}>
            <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
              Attendees
            </Text>
            {item.attendees.length === 0 ? (
              <Text fontSize="sm" color="gray.500">
                No attendee details recorded.
              </Text>
            ) : (
              item.attendees.map((attendee, index) => (
                <Text key={`${attendee.name}-${index}`} fontSize="sm" color="gray.700">
                  {attendee.name}
                  {attendee.email ? ` · ${attendee.email}` : ""}
                  {attendee.phone ? ` · ${attendee.phone}` : ""}
                </Text>
              ))
            )}
          </Stack>

          <Stack gap={2}>
            <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
              Issued tickets
            </Text>
            {item.tickets.length === 0 ? (
              <Text fontSize="sm" color="gray.500">
                No ticket issued yet - payment has not settled.
              </Text>
            ) : (
              item.tickets.map((ticket) => (
                <HStack key={ticket.ticketUniqueId} gap={2} wrap="wrap">
                  <Text fontSize="sm" fontFamily="mono" color="gray.700">
                    {ticket.ticketCode}
                  </Text>
                  <Badge colorPalette={TICKET_STATUS_COLOR[ticket.ticketStatus] ?? "gray"} variant="subtle" borderRadius="full" px={2} py={0.5} fontSize="xs">
                    {ticket.ticketStatusLabel}
                  </Badge>
                  {ticket.deliveredAtUtc ? (
                    <Text fontSize="xs" color="gray.500">
                      Delivered {formatTimestamp(ticket.deliveredAtUtc)}
                    </Text>
                  ) : (
                    <Text fontSize="xs" color="orange.600">
                      Not delivered
                    </Text>
                  )}
                  {ticket.checkedInAtUtc ? (
                    <Text fontSize="xs" color="gray.500">
                      Checked in {formatTimestamp(ticket.checkedInAtUtc)}
                    </Text>
                  ) : null}
                  <Button
                    size="xs"
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
                  </Button>
                </HStack>
              ))
            )}
          </Stack>
        </SimpleGrid>
      </Box>
    </Box>
  )
}

export function EventInvoiceLineItemsSection({ invoiceUniqueId, lineItems, currencySymbol }: EventInvoiceLineItemsSectionProps) {
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
        <Heading fontSize="lg" fontWeight="800" color="gray.900">
          Ticket line items
        </Heading>
        {hasAnyTicket ? (
          <Button
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
        <Text fontSize="sm" color="gray.600">
          No ticket lines on this invoice.
        </Text>
      ) : (
        <Stack gap={4}>
          {lineItems.map((item) => (
            <LineItemCard
              key={item.invoiceItemUniqueId}
              item={item}
              currencySymbol={currencySymbol}
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
