import { useMemo, useState } from "react"
import { EMPTY_BUYER_INFO } from "@/features/events/components/registration/types"
import type {
  AttendeeSessionGroup,
  AttendeeSlotEntry,
  AttendeeSlotState,
  BuyerAttendeeInfoState,
  PurchaseReviewIssue,
} from "@/features/events/components/registration/types"
import { formatPhoneNumberInput } from "@/features/events/utils/ticketSelection"
import { isRoutableEmail } from "@/utils/email"

/** Buyer fields that must be filled in before "same as buyer" can copy anything useful. */
const REQUIRED_BUYER_FIELDS: Array<[keyof BuyerAttendeeInfoState, string]> = [
  ["lastName", "Last name"],
  ["email", "Email"],
]

const REQUIRED_ATTENDEE_FIELDS: Array<keyof BuyerAttendeeInfoState> = ["firstName", "lastName", "email"]

interface UseBuyerAttendeeInfoArgs {
  attendeeSlotEntries: AttendeeSlotEntry[]
  attendeeSlotEntryByKey: Record<string, AttendeeSlotEntry>
  attendeeSessionGroups: AttendeeSessionGroup[]
}

/**
 * Buyer details, per-slot attendee details, and the "same as buyer" shortcuts that let one stand in
 * for the other. Slot state is reconciled against the current selection, so changing quantities never
 * leaves details behind for a ticket that is no longer in the cart.
 */
export function useBuyerAttendeeInfo({
  attendeeSlotEntries,
  attendeeSlotEntryByKey,
  attendeeSessionGroups,
}: UseBuyerAttendeeInfoArgs) {
  const [buyerInfo, setBuyerInfo] = useState<BuyerAttendeeInfoState>(EMPTY_BUYER_INFO)
  const [attendeeInfoBySlot, setAttendeeInfoBySlot] = useState<Record<string, AttendeeSlotState>>({})
  const [sessionSameAsBuyerById, setSessionSameAsBuyerById] = useState<Record<string, boolean>>({})
  const [ticketSameAsBuyerById, setTicketSameAsBuyerById] = useState<Record<string, boolean>>({})
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const [isAlertOpen, setIsAlertOpen] = useState(false)

  // Slots come and go with ticket quantities, so anything the buyer already typed is carried across
  // and anything now unselected is dropped.
  const [previousSlotEntries, setPreviousSlotEntries] = useState(attendeeSlotEntries)
  if (attendeeSlotEntries !== previousSlotEntries) {
    setPreviousSlotEntries(attendeeSlotEntries)
    setAttendeeInfoBySlot((current) => {
      const next: Record<string, AttendeeSlotState> = {}
      let hasChanges = Object.keys(current).length !== attendeeSlotEntries.length

      attendeeSlotEntries.forEach((slot) => {
        const existing = current[slot.key]

        if (existing) {
          next[slot.key] = existing
          return
        }

        next[slot.key] = EMPTY_BUYER_INFO
        hasChanges = true
      })

      return hasChanges ? next : current
    })
  }

  const [previousSessionGroups, setPreviousSessionGroups] = useState(attendeeSessionGroups)
  if (attendeeSessionGroups !== previousSessionGroups) {
    setPreviousSessionGroups(attendeeSessionGroups)

    const allowedSessionIds = new Set(attendeeSessionGroups.map((sessionGroup) => sessionGroup.sessionId))
    const allowedTicketIds = new Set(
      attendeeSessionGroups.flatMap((sessionGroup) => sessionGroup.tickets.map((ticket) => ticket.ticketId)),
    )

    setSessionSameAsBuyerById((current) => pruneFlags(current, allowedSessionIds))
    setTicketSameAsBuyerById((current) => pruneFlags(current, allowedTicketIds))
  }

  const isSessionSameAsBuyer = (sessionId: string) => Boolean(sessionSameAsBuyerById[sessionId])

  const isTicketSameAsBuyer = (sessionId: string, ticketId: string) =>
    isSessionSameAsBuyer(sessionId) || Boolean(ticketSameAsBuyerById[ticketId])

  const missingBuyerDetails = useMemo(
    () =>
      REQUIRED_BUYER_FIELDS.filter(([field]) => !buyerInfo[field].trim()).map(([, label]) => label),
    [buyerInfo],
  )

  function openMissingBuyerDetailsAlert() {
    const fields =
      missingBuyerDetails.length === 1 ? missingBuyerDetails[0] : missingBuyerDetails.join(" and ")
    const verb = missingBuyerDetails.length === 1 ? "is" : "are"

    setAlertMessage(`${fields} ${verb} required in Your Information before enabling Same As Buyer.`)
    setIsAlertOpen(true)
  }

  function closeAlert() {
    setIsAlertOpen(false)
    setAlertMessage(null)
  }

  function updateBuyerField(field: keyof BuyerAttendeeInfoState, value: string) {
    const nextValue = field === "phone" ? formatPhoneNumberInput(value) : value

    setBuyerInfo((current) => ({ ...current, [field]: nextValue }))
  }

  function updateAttendeeField(slotKey: string, field: keyof BuyerAttendeeInfoState, value: string) {
    const slot = attendeeSlotEntryByKey[slotKey]
    if (!slot || isTicketSameAsBuyer(slot.sessionId, slot.ticketId)) return

    setAttendeeInfoBySlot((current) => {
      const slotState = current[slotKey]
      if (!slotState) return current

      return { ...current, [slotKey]: { ...slotState, [field]: value } }
    })
  }

  function toggleSessionSameAsBuyer(sessionId: string, checked: boolean) {
    if (checked && missingBuyerDetails.length > 0) {
      openMissingBuyerDetailsAlert()
      return
    }

    setSessionSameAsBuyerById((current) => ({ ...current, [sessionId]: checked }))

    if (!checked) closeAlert()
  }

  function toggleTicketSameAsBuyer(sessionId: string, ticketId: string, checked: boolean) {
    if (checked && missingBuyerDetails.length > 0) {
      openMissingBuyerDetailsAlert()
      return
    }

    // A session-wide toggle already covers every ticket under it.
    if (isSessionSameAsBuyer(sessionId)) return

    setTicketSameAsBuyerById((current) => ({ ...current, [ticketId]: checked }))

    if (!checked) closeAlert()
  }

  /**
   * Presence checks, plus the shape of every address a ticket or confirmation is mailed to - the
   * server is what actually validates the submission.
   */
  function getIssues(): PurchaseReviewIssue[] {
    const issues: PurchaseReviewIssue[] = []

    if (missingBuyerDetails.length > 0) {
      issues.push({ message: "Complete the buyer details before continuing.", target: "buyer-attendee-info" })
    } else if (!isRoutableEmail(buyerInfo.email)) {
      issues.push({ message: "Enter a valid buyer email address.", target: "buyer-attendee-info" })
    }

    const incompleteSlot = attendeeSlotEntries.find((slot) => {
      if (!slot.requiresAttendeeInfo) return false
      if (isTicketSameAsBuyer(slot.sessionId, slot.ticketId)) return false

      const info = attendeeInfoBySlot[slot.key]
      if (!info) return true

      return REQUIRED_ATTENDEE_FIELDS.some((field) => !(info[field] ?? "").trim())
    })

    if (incompleteSlot) {
      issues.push({
        message: `${incompleteSlot.sessionName} needs attendee details for ${incompleteSlot.ticketName}.`,
        target: "buyer-attendee-info",
      })
    }

    const slotWithBadEmail = attendeeSlotEntries.find((slot) => {
      if (!slot.requiresAttendeeInfo || slot === incompleteSlot) return false
      if (isTicketSameAsBuyer(slot.sessionId, slot.ticketId)) return false

      return !isRoutableEmail(attendeeInfoBySlot[slot.key]?.email)
    })

    if (slotWithBadEmail) {
      issues.push({
        message: `${slotWithBadEmail.sessionName} needs a valid attendee email for ${slotWithBadEmail.ticketName}.`,
        target: "buyer-attendee-info",
      })
    }

    return issues
  }

  /** The details for one slot, which are the buyer's own whenever "same as buyer" is on. */
  function getAttendeeInfo(slot: AttendeeSlotEntry): BuyerAttendeeInfoState {
    return isTicketSameAsBuyer(slot.sessionId, slot.ticketId)
      ? buyerInfo
      : (attendeeInfoBySlot[slot.key] ?? EMPTY_BUYER_INFO)
  }

  function reset() {
    setBuyerInfo(EMPTY_BUYER_INFO)
    setAttendeeInfoBySlot({})
    setSessionSameAsBuyerById({})
    setTicketSameAsBuyerById({})
    closeAlert()
  }

  return {
    buyerInfo,
    attendeeInfoBySlot,
    ticketSameAsBuyerById,
    alertMessage,
    isAlertOpen,
    missingBuyerDetails,
    isSessionSameAsBuyer,
    isTicketSameAsBuyer,
    getAttendeeInfo,
    updateBuyerField,
    updateAttendeeField,
    toggleSessionSameAsBuyer,
    toggleTicketSameAsBuyer,
    closeAlert,
    getIssues,
    reset,
  }
}

function pruneFlags(current: Record<string, boolean>, allowedIds: Set<string>) {
  const next: Record<string, boolean> = {}
  let hasChanges = false

  Object.entries(current).forEach(([id, isEnabled]) => {
    if (!allowedIds.has(id)) {
      hasChanges = true
      return
    }

    next[id] = isEnabled
  })

  return hasChanges ? next : current
}
