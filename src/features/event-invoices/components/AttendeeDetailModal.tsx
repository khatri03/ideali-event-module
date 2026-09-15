import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Badge,
  Box,
  Button,
  Dialog,
  Field,
  HStack,
  IconButton,
  Input,
  Link,
  Portal,
  Separator,
  Stack,
  Text,
  VisuallyHidden,
} from "@chakra-ui/react"
import { Armchair, Copy, ExternalLink, Pencil, Send, X } from "lucide-react"
import { ConfirmDialog } from "@/components/common"
import { toaster } from "@/lib/toaster"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import type { EventInvoiceAttendee, EventInvoiceLineItem, EventInvoiceTicket } from "@/api/eventInvoices"
import { useResendEventInvoiceTicket, useUpdateEventInvoiceAttendee } from "../hooks/useEventInvoices"

interface AttendeeDetailModalProps {
  invoiceUniqueId: string
  lineItem: EventInvoiceLineItem
  canResendTickets: boolean
  onClose: () => void
}

const TICKET_STATUS_TOKENS: Record<string, { bg: string; fg: string }> = {
  Active: { bg: "status.success.bg", fg: "status.success.fg" },
  CheckedIn: { bg: "status.info.bg", fg: "status.info.fg" },
  Cancelled: { bg: "status.neutral.bg", fg: "status.neutral.fg" },
  Refunded: { bg: "status.error.bg", fg: "status.error.fg" },
}
const NEUTRAL_TICKET_TOKENS = { bg: "status.neutral.bg", fg: "status.neutral.fg" }

const attendeeEditSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email").max(255).or(z.literal("")).nullable(),
  phone: z.string().max(50).nullable(),
})
type AttendeeEditValues = z.infer<typeof attendeeEditSchema>

function AttendeeRow({
  attendee,
  ticket,
  slotNumber,
  invoiceUniqueId,
  lineItemUniqueId,
  canResend,
}: {
  attendee: EventInvoiceAttendee
  ticket: EventInvoiceTicket | undefined
  slotNumber: number
  invoiceUniqueId: string
  lineItemUniqueId: string
  canResend: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [resendTarget, setResendTarget] = useState<EventInvoiceTicket | null>(null)

  const updateMutation = useUpdateEventInvoiceAttendee(invoiceUniqueId)
  const resendMutation = useResendEventInvoiceTicket(invoiceUniqueId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AttendeeEditValues>({
    resolver: zodResolver(attendeeEditSchema),
    defaultValues: {
      name: attendee.name,
      email: attendee.email ?? "",
      phone: attendee.phone ?? "",
    },
  })

  function handleEdit() {
    reset({ name: attendee.name, email: attendee.email ?? "", phone: attendee.phone ?? "" })
    setEditing(true)
  }

  async function handleSave(values: AttendeeEditValues) {
    await updateMutation.mutateAsync({
      lineItemUniqueId,
      slotIndex: attendee.slotIndex,
      data: {
        name: values.name,
        email: values.email || null,
        phone: values.phone || null,
      },
    })
    setEditing(false)
  }

  async function handleConfirmResend() {
    if (!resendTarget) return
    try {
      await resendMutation.mutateAsync(resendTarget.ticketUniqueId)
      setResendTarget(null)
    } catch {
      // Error surfaced via mutation's own state — keep dialog open.
    }
  }

  async function handleCopyCode() {
    if (!ticket) return
    try {
      await navigator.clipboard.writeText(ticket.ticketCode)
      toaster.create({ type: "success", title: "Ticket code copied." })
    } catch {
      toaster.create({ type: "error", title: "Copy failed — select the code manually." })
    }
  }

  const tokens = ticket ? (TICKET_STATUS_TOKENS[ticket.ticketStatus] ?? NEUTRAL_TICKET_TOKENS) : NEUTRAL_TICKET_TOKENS

  return (
    <Box
      as="section"
      aria-labelledby={`attendee-heading-${slotNumber}`}
      border="1px solid"
      borderColor="border.subtle"
      borderRadius="12px"
      overflow="hidden"
      boxShadow="xs"
      bg="card.bg"
    >
      {/* Row header */}
      <HStack px={3} py={2} bg="app.bg" justify="space-between" gap={2}>
        <HStack gap={2}>
          <Text
            as="h3"
            id={`attendee-heading-${slotNumber}`}
            fontSize="xs"
            fontWeight="700"
            color="text.secondary"
            letterSpacing="0.04em"
          >
            Attendee {slotNumber}
          </Text>
          {ticket ? (
            <Badge
              bg={tokens.bg}
              color={tokens.fg}
              borderRadius="full"
              px={2}
              py={0.5}
              fontSize="xs"
              fontWeight="700"
            >
              {ticket.ticketStatusLabel}
            </Badge>
          ) : null}
        </HStack>

        {!editing ? (
          <HStack gap={0.5}>
            <IconButton
              aria-label="Edit attendee"
              size="xs"
              variant="ghost"
              colorPalette="brand"
              borderRadius="6px"
              minH="7"
              minW="7"
              cursor="pointer"
              onClick={handleEdit}
            >
              <Pencil size={12} />
            </IconButton>
            {canResend && ticket ? (
              <IconButton
                aria-label={`Resend ticket ${ticket.ticketCode}`}
                size="xs"
                variant="ghost"
                colorPalette="brand"
                borderRadius="6px"
                minH="7"
                minW="7"
                cursor="pointer"
                onClick={() => setResendTarget(ticket)}
              >
                <Send size={12} />
              </IconButton>
            ) : null}
          </HStack>
        ) : null}
      </HStack>

      {/* Row body */}
      <Box px={3} py={3}>
        {editing ? (
          <Stack as="form" gap={3} onSubmit={handleSubmit(handleSave)}>
            <Field.Root invalid={Boolean(errors.name)}>
              <Field.Label fontSize="xs">Name</Field.Label>
              <Input {...register("name")} size="sm" borderRadius="8px" />
              {errors.name ? <Field.ErrorText fontSize="xs">{errors.name.message}</Field.ErrorText> : null}
            </Field.Root>
            <Field.Root invalid={Boolean(errors.email)}>
              <Field.Label fontSize="xs">Email</Field.Label>
              <Input {...register("email")} size="sm" borderRadius="8px" type="email" />
              {errors.email ? <Field.ErrorText fontSize="xs">{errors.email.message}</Field.ErrorText> : null}
            </Field.Root>
            <Field.Root invalid={Boolean(errors.phone)}>
              <Field.Label fontSize="xs">Phone</Field.Label>
              <Input {...register("phone")} size="sm" borderRadius="8px" />
              {errors.phone ? <Field.ErrorText fontSize="xs">{errors.phone.message}</Field.ErrorText> : null}
            </Field.Root>
            {updateMutation.error ? (
              <Text fontSize="xs" color="status.error.fg">
                {extractApiError(updateMutation.error)}
              </Text>
            ) : null}
            <HStack gap={2}>
              <Button
                type="submit"
                size="sm"
                colorPalette="brand"
                borderRadius="8px"
                disabled={updateMutation.isPending}
                loading={updateMutation.isPending}
                loadingText="Saving..."
                cursor="pointer"
              >
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                borderRadius="8px"
                cursor="pointer"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </HStack>
          </Stack>
        ) : (
          <Stack gap={2}>
            <Stack gap={0.5}>
              <Text fontSize="sm" fontWeight="700" color="text.primary">
                {attendee.name}
              </Text>
              <Text fontSize="xs" color="text.secondary">
                {[attendee.email, attendee.phone].filter(Boolean).join(" · ") || "No contact info"}
              </Text>
            </Stack>

            {ticket ? (
              <>
                <Separator />
                <HStack justify="space-between" gap={3} wrap="wrap">
                  <HStack gap={2} wrap="wrap">
                    {ticket.seatObjectLabel ? (
                      <HStack
                        gap={1}
                        px={2}
                        py={0.5}
                        bg="app.bg"
                        borderRadius="6px"
                        color="text.secondary"
                      >
                        <Armchair size={11} aria-hidden />
                        <Text fontSize="xs" fontWeight="700" color="text.primary">
                          {ticket.seatObjectLabel}
                          <VisuallyHidden> seat</VisuallyHidden>
                        </Text>
                      </HStack>
                    ) : null}
                    <Button
                      type="button"
                      size="xs"
                      variant="subtle"
                      colorPalette="gray"
                      borderRadius="6px"
                      px={2}
                      gap={1.5}
                      maxW="160px"
                      cursor="pointer"
                      title={ticket.ticketCode}
                      aria-label={`Copy ticket code ${ticket.ticketCode}`}
                      onClick={handleCopyCode}
                    >
                      <Text as="span" fontFamily="mono" fontSize="2xs" color="text.primary" truncate>
                        {ticket.ticketCode}
                      </Text>
                      <Copy size={11} aria-hidden />
                    </Button>
                  </HStack>
                  <Link
                    href={APP_ROUTES.eventTicketView(ticket.ticketUniqueId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    display="inline-flex"
                    alignItems="center"
                    gap={1}
                    fontSize="xs"
                    fontWeight="700"
                    color="brand.600"
                    cursor="pointer"
                    _hover={{ textDecoration: "underline" }}
                  >
                    View ticket
                    <ExternalLink size={11} aria-hidden />
                  </Link>
                </HStack>
              </>
            ) : null}
          </Stack>
        )}
      </Box>

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
          errorMessage={resendMutation.error ? extractApiError(resendMutation.error) : null}
          isPending={resendMutation.isPending}
          onConfirm={handleConfirmResend}
          onClose={() => setResendTarget(null)}
        />
      ) : null}
    </Box>
  )
}

/** Modal showing per-slot attendee contact details with inline edit and per-ticket resend. */
export function AttendeeDetailModal({ invoiceUniqueId, lineItem, canResendTickets, onClose }: AttendeeDetailModalProps) {
  return (
    <Dialog.Root
      open
      onOpenChange={(details) => { if (!details.open) onClose() }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner alignItems={{ base: "flex-end", md: "center" }} p={{ base: 0, md: 4 }}>
          <Dialog.Content
            w={{ base: "100%", md: "28rem" }}
            maxW="100%"
            maxH={{ base: "88dvh", md: "82vh" }}
            borderRadius={{ base: "16px 16px 0 0", md: "16px" }}
            display="flex"
            flexDirection="column"
            overflow="hidden"
          >
            <Dialog.Header
              borderBottomWidth="1px"
              borderBottomColor="border.subtle"
              pb={4}
              flexShrink={0}
            >
              <Stack gap={0.5}>
                <Dialog.Title fontSize="lg" fontWeight="800" color="text.primary">
                  {lineItem.ticketTypeName}
                </Dialog.Title>
                <Text fontSize="sm" color="text.secondary">
                  {lineItem.sessionName} · {lineItem.quantity}{" "}
                  {lineItem.quantity === 1 ? "attendee" : "attendees"}
                </Text>
              </Stack>
              <Dialog.CloseTrigger asChild>
                <IconButton
                  aria-label="Close"
                  variant="ghost"
                  size="sm"
                  borderRadius="8px"
                  cursor="pointer"
                  position="absolute"
                  top={3}
                  right={3}
                >
                  <X size={16} />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body py={4} overflowY="auto" flex="1" minH={0}>
              {lineItem.attendees.length === 0 ? (
                <Text fontSize="sm" color="text.secondary">
                  No attendee details recorded for this line item.
                </Text>
              ) : (
                <Stack gap={3}>
                  {lineItem.attendees.map((attendee, index) => (
                    <AttendeeRow
                      key={attendee.slotIndex}
                      attendee={attendee}
                      ticket={lineItem.tickets[index]}
                      slotNumber={index + 1}
                      invoiceUniqueId={invoiceUniqueId}
                      lineItemUniqueId={lineItem.invoiceItemUniqueId}
                      canResend={canResendTickets}
                    />
                  ))}
                </Stack>
              )}
            </Dialog.Body>

            <Dialog.Footer
              borderTopWidth="1px"
              borderTopColor="border.subtle"
              pt={4}
              flexShrink={0}
            >
              <Button
                variant="outline"
                borderRadius="10px"
                fontWeight="700"
                px={6}
                minH="11"
                w={{ base: "full", md: "auto" }}
                cursor="pointer"
                onClick={onClose}
              >
                Close
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
