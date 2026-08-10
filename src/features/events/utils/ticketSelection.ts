import type { EventRegistrationSession, EventRegistrationTicket } from "@/api/events"
import { parseUtcDateTime } from "@/features/events/utils/registrationFormat"
import type {
  BannerSlide,
  EventRegisterWizardEvent,
  SelectedSessionSummary,
} from "@/features/events/components/registration/types"

export function getTicketPricePeriod(ticket: EventRegistrationTicket) {
  const now = new Date()

  return ticket.pricePeriods.find((period) => {
    const start = parseUtcDateTime(period.startDateTime)
    const end = parseUtcDateTime(period.endDateTime)
    return Boolean(start && end && start <= now && now <= end)
  })
}

/**
 * A ticket type with nothing left to sell, where what is holding the seats is another buyer's
 * checkout rather than a genuine sell-out. Returns the moment the earliest of those holds runs out.
 *
 * Null covers both "there are seats" and "sold out for good" - the caller shows a waiting state only
 * when there is a real moment to wait for.
 */
export function getTicketHoldRelease(ticket: EventRegistrationTicket, now = new Date()) {
  if ((getTicketRemaining(ticket) ?? 0) > 0) return null

  const releasesAt = parseUtcDateTime(ticket.nextSeatsAvailableAtUtc)
  if (!releasesAt || releasesAt <= now) return null

  return releasesAt
}

/**
 * Whether the buyer is looking at a page that can change under them without an action of their own.
 * Drives the poll: no held seats, no polling.
 */
export function hasTicketOnHold(sessions: EventRegistrationSession[], now = new Date()) {
  return sessions.some((session) =>
    session.ticketTypes.some((ticket) => getTicketHoldRelease(ticket, now) !== null),
  )
}

export function getTicketRemaining(ticket: EventRegistrationTicket) {
  if (ticket.availableForSale !== null && ticket.availableForSale !== undefined) return ticket.availableForSale
  if (ticket.totalQuantity !== null && ticket.totalQuantity !== undefined) {
    return Math.max(ticket.totalQuantity - (ticket.ticketsSold ?? 0), 0)
  }

  return null
}

/**
 * Display-only price for the ticket card. The payable amount always comes from the server-priced
 * cart - this just shows the buyer which price period they are currently in.
 */
export function getTicketDisplayPrice(ticket: EventRegistrationTicket) {
  return getTicketPricePeriod(ticket)?.amount ?? ticket.fullPrice ?? 0
}

export function getTicketSavings(ticket: EventRegistrationTicket) {
  const fullPrice = ticket.fullPrice ?? 0
  const displayPrice = getTicketDisplayPrice(ticket)

  if (!Number.isFinite(fullPrice) || !Number.isFinite(displayPrice) || fullPrice <= 0 || displayPrice >= fullPrice) {
    return null
  }

  const amountSaved = fullPrice - displayPrice

  return {
    fullPrice,
    amountSaved,
    percentageSaved: Math.round((amountSaved / fullPrice) * 100),
  }
}

/**
 * Upper bound offered by the quantity picker. Purely a UI affordance - the server is what actually
 * enforces availability and per-order limits when the line is added to the cart.
 */
export function getTicketSelectableMax(ticket: EventRegistrationTicket) {
  const remaining = getTicketRemaining(ticket)
  const purchaseMax = ticket.maxPurchase ?? null

  if (remaining !== null && purchaseMax !== null) return Math.max(Math.min(remaining, purchaseMax), 0)
  if (remaining !== null) return Math.max(remaining, 0)
  if (purchaseMax !== null) return Math.max(purchaseMax, 0)

  return null
}

export function getTicketQuantityOptions(ticket: EventRegistrationTicket, quantity: number) {
  const minimumPurchase = Math.max(ticket.minPurchase ?? 1, 1)
  const maxAllowed = getTicketSelectableMax(ticket)
  const upperBound = maxAllowed !== null ? Math.max(maxAllowed, 0) : Math.max(quantity + 10, minimumPurchase + 9)
  const quantities = new Set<number>([0])

  for (let value = minimumPurchase; value <= upperBound; value += 1) {
    quantities.add(value)
  }

  return Array.from(quantities)
    .sort((left, right) => left - right)
    .map((value) => ({ value: String(value), label: String(value) }))
}

export function getTicketQuantityAfterDecrement(ticket: EventRegistrationTicket, quantity: number) {
  const minimumPurchase = Math.max(ticket.minPurchase ?? 1, 1)
  return quantity <= minimumPurchase ? 0 : quantity - 1
}

export function isCardPaymentMethod(paymentMethod: string) {
  return /card/i.test(paymentMethod)
}

/**
 * Cheque takes a different endpoint from every other method, so the check has to be a named rule
 * rather than a string comparison scattered across the checkout.
 */
export function isChequePaymentMethod(paymentMethod: string) {
  return /cheque|check/i.test(paymentMethod)
}

export function isHtmlContent(value: string | null | undefined) {
  return Boolean(value && /<[^>]+>/.test(value))
}

export function formatPhoneNumberInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10)

  if (digits.length === 0) return ""
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

export function getSelectedSessionSummaries(
  sessions: EventRegistrationSession[],
  selectedTicketQuantities: Record<string, number>,
) {
  return sessions.reduce<SelectedSessionSummary[]>((summaries, session) => {
    const selectedTickets = session.ticketTypes.flatMap((ticket) => {
      const quantity = selectedTicketQuantities[ticket.uniqueId] ?? 0
      return quantity <= 0 ? [] : [{ ticket, quantity }]
    })

    if (selectedTickets.length === 0) {
      return summaries
    }

    summaries.push({
      session,
      selectedTickets,
      attendeeCount: selectedTickets.reduce((total, item) => total + item.quantity, 0),
      requiresAttendeeInfo: session.requiresAttendeeInfo,
    })

    return summaries
  }, [])
}

export function getSessionBannerSlides(event: EventRegisterWizardEvent) {
  const slides: BannerSlide[] = []

  if (event.bannerUrl) {
    slides.push({ imageUrl: event.bannerUrl })
  }

  event.sessions.forEach((session) => {
    if (!session.bannerUrl) return
    slides.push({ imageUrl: session.bannerUrl })
  })

  return slides
}
