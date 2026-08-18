export type CheckInConfirmationKind = "manualCheckIn" | "undoCheckIn" | "sendTicket"

interface CheckInConfirmationCopy {
  title: string
  description: string
  confirmLabel: string
  loadingLabel: string
  tone: "destructive" | "primary"
}

/**
 * A scan is the operator pointing a camera at a ticket the guest is holding; everything else on this
 * screen is typed or clicked against a name in a list, where the wrong row is one pixel away. Those are
 * the actions that ask first, and they ask in the same words wherever they are fired from.
 */
export function describeCheckInConfirmation(
  kind: CheckInConfirmationKind,
  ticketCode: string,
  outstandingBalance: string | null = null,
): CheckInConfirmationCopy {
  switch (kind) {
    case "manualCheckIn":
      return {
        title: "Check in this ticket?",
        // The balance is named here rather than only afterwards because this is the last moment the
        // operator can still send the guest to the cashier instead of through the door.
        description: outstandingBalance
          ? `Ticket ${ticketCode} will be marked as arrived. This order still owes ${outstandingBalance} - collect it before admitting.`
          : `Ticket ${ticketCode} will be marked as arrived. Do this only with the guest at the door.`,
        confirmLabel: "Check in",
        loadingLabel: "Checking in...",
        tone: "primary",
      }
    case "undoCheckIn":
      return {
        title: "Undo this check-in?",
        description: `Ticket ${ticketCode} goes back to expected and the arrival time recorded against it is cleared.`,
        confirmLabel: "Undo check-in",
        loadingLabel: "Reversing...",
        tone: "destructive",
      }
    case "sendTicket":
      return {
        title: "Send this ticket again?",
        description: `Ticket ${ticketCode} is emailed again, to the attendee on their own address or to the buyer if the ticket carries none.`,
        confirmLabel: "Send ticket",
        loadingLabel: "Sending...",
        tone: "primary",
      }
  }
}
