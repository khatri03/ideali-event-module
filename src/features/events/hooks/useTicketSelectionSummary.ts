import { useMemo } from "react"
import type { EventRegistrationSession } from "@/api/events"
import type { EventCartPrice } from "@/features/events/schemas/eventCart.schemas"
import type {
  AttendeeSessionGroup,
  AttendeeSlotEntry,
  SelectedTicketSummaryItem,
} from "@/features/events/components/registration/types"
import { getSelectedSessionSummaries, getTicketDisplayPrice } from "@/features/events/utils/ticketSelection"

export interface SelectedTicketSessionGroup {
  sessionId: string
  sessionName: string
  items: SelectedTicketSummaryItem[]
  total: number
}

interface TicketSelectionSummary {
  selectedTicketSummary: SelectedTicketSummaryItem[]
  selectedTicketSummaryBySession: SelectedTicketSessionGroup[]
  selectedTicketCount: number
  selectedTicketTotal: number
  selectedSessionSummaries: ReturnType<typeof getSelectedSessionSummaries>
  attendeeSessionGroups: AttendeeSessionGroup[]
  attendeeSlotEntries: AttendeeSlotEntry[]
  attendeeSlotEntryByKey: Record<string, AttendeeSlotEntry>
  requiresAttendeeInfo: boolean
}

/**
 * Everything the wizard derives from "which tickets are selected": the flat line list, its per-session
 * grouping, and the attendee slots those quantities imply. Pure derivation - the quantities and the
 * server price come in, nothing here talks to the network or holds state of its own.
 */
export function useTicketSelectionSummary(
  sessions: EventRegistrationSession[],
  selectedTicketQuantities: Record<string, number>,
  cartPrice: EventCartPrice | null | undefined,
): TicketSelectionSummary {
  const selectedTicketSummary = useMemo<SelectedTicketSummaryItem[]>(
    () =>
      sessions.flatMap((session) =>
        session.ticketTypes.flatMap((ticket) => {
          const quantity = selectedTicketQuantities[ticket.uniqueId] ?? 0
          if (quantity <= 0) return []

          const unitPrice = getTicketDisplayPrice(ticket)

          return [
            {
              sessionId: session.uniqueId,
              sessionName: session.name,
              ticketId: ticket.uniqueId,
              ticketName: ticket.name,
              ticket,
              quantity,
              unitPrice,
              lineTotal: unitPrice * quantity,
            },
          ]
        }),
      ),
    [sessions, selectedTicketQuantities],
  )

  const selectedTicketSummaryBySession = useMemo(
    () =>
      selectedTicketSummary.reduce<SelectedTicketSessionGroup[]>((groups, item) => {
        const existingGroup = groups.find((group) => group.sessionId === item.sessionId)

        if (existingGroup) {
          existingGroup.items.push(item)
          existingGroup.total += item.lineTotal
          return groups
        }

        groups.push({
          sessionId: item.sessionId,
          sessionName: item.sessionName,
          items: [item],
          total: item.lineTotal,
        })

        return groups
      }, []),
    [selectedTicketSummary],
  )

  const selectedSessionSummaries = useMemo(
    () => getSelectedSessionSummaries(sessions, selectedTicketQuantities),
    [sessions, selectedTicketQuantities],
  )

  const attendeeSessionGroups = useMemo<AttendeeSessionGroup[]>(
    () =>
      selectedSessionSummaries.map((sessionSummary) => ({
        key: sessionSummary.session.uniqueId,
        sessionId: sessionSummary.session.uniqueId,
        sessionName: sessionSummary.session.name,
        attendeeCount: sessionSummary.attendeeCount,
        requiresAttendeeInfo: sessionSummary.requiresAttendeeInfo,
        tickets: sessionSummary.selectedTickets.map((selectedTicket) => {
          const slots = Array.from({ length: selectedTicket.quantity }, (_, index) => ({
            key: `${sessionSummary.session.uniqueId}:${selectedTicket.ticket.uniqueId}:${index + 1}`,
            attendeeLabel: `Attendee ${index + 1}`,
          }))

          return {
            key: `${sessionSummary.session.uniqueId}:${selectedTicket.ticket.uniqueId}`,
            sessionId: sessionSummary.session.uniqueId,
            sessionName: sessionSummary.session.name,
            ticketId: selectedTicket.ticket.uniqueId,
            ticketName: selectedTicket.ticket.name,
            attendeeCount: selectedTicket.quantity,
            requiresAttendeeInfo: sessionSummary.requiresAttendeeInfo,
            slots,
          }
        }),
      })),
    [selectedSessionSummaries],
  )

  const attendeeSlotEntries = useMemo<AttendeeSlotEntry[]>(
    () =>
      attendeeSessionGroups.flatMap((sessionGroup) =>
        sessionGroup.tickets.flatMap((ticketGroup) =>
          ticketGroup.slots.map((slot) => ({
            key: slot.key,
            sessionId: sessionGroup.sessionId,
            sessionName: sessionGroup.sessionName,
            ticketId: ticketGroup.ticketId,
            ticketName: ticketGroup.ticketName,
            attendeeLabel: slot.attendeeLabel,
            requiresAttendeeInfo: sessionGroup.requiresAttendeeInfo,
          })),
        ),
      ),
    [attendeeSessionGroups],
  )

  const attendeeSlotEntryByKey = useMemo(
    () =>
      attendeeSlotEntries.reduce<Record<string, AttendeeSlotEntry>>((entries, slot) => {
        entries[slot.key] = slot
        return entries
      }, {}),
    [attendeeSlotEntries],
  )

  const selectedTicketCount = selectedTicketSummary.reduce((total, item) => total + item.quantity, 0)

  // Server-priced net subtotal. Falls back to the catalog-derived figure only until the first
  // pricing round-trip lands, so the buyer never sees an empty total mid-flight.
  const selectedTicketTotal =
    cartPrice?.netSubtotal ?? selectedTicketSummary.reduce((total, item) => total + item.lineTotal, 0)

  return {
    selectedTicketSummary,
    selectedTicketSummaryBySession,
    selectedTicketCount,
    selectedTicketTotal,
    selectedSessionSummaries,
    attendeeSessionGroups,
    attendeeSlotEntries,
    attendeeSlotEntryByKey,
    requiresAttendeeInfo: selectedSessionSummaries.some((session) => session.requiresAttendeeInfo),
  }
}
