import { useMutation } from "@tanstack/react-query"
import { resendEventInvoiceTicket } from "@/api/eventInvoices"
import { toaster } from "@/lib/toaster"
import { extractApiError } from "@/utils/errors"

export interface AttendeeTicketResend {
  invoiceUniqueId: string
  ticketUniqueId: string
}

/**
 * Sends one ticket again from the door. Who receives it is settled server-side - the attendee on their
 * own address when they have one, the buyer otherwise - so the operator picks a person, not a mailbox.
 */
export function useResendAttendeeTicket() {
  return useMutation({
    mutationFn: ({ invoiceUniqueId, ticketUniqueId }: AttendeeTicketResend) =>
      resendEventInvoiceTicket(invoiceUniqueId, ticketUniqueId),
    onSuccess: () => toaster.create({ type: "success", title: "Ticket queued for sending." }),
    onError: (error) => toaster.create({ type: "error", title: extractApiError(error) }),
  })
}
