import type { CheckInAttempt } from "@/api/eventCheckIn"

type CheckInOutcome = CheckInAttempt["outcome"]

interface CheckInOutcomePresentation {
  /** The instruction the operator acts on, not a description of what the server did. */
  heading: string
  toastType: "success" | "warning" | "error" | "info"
  surface: string
  border: string
  foreground: string
}

/**
 * One source of truth for how an outcome reads, so the toast that fires and the strip left on screen
 * cannot drift into telling the operator two different things about the same ticket.
 */
export const CHECK_IN_OUTCOME_PRESENTATION: Record<CheckInOutcome, CheckInOutcomePresentation> = {
  Success: {
    heading: "Admit",
    toastType: "success",
    surface: "status.success.bg",
    border: "status.success",
    foreground: "status.success.fg",
  },
  AlreadyCheckedIn: {
    heading: "Already inside",
    toastType: "warning",
    surface: "status.warning.bg",
    border: "status.warning",
    foreground: "status.warning.fg",
  },
  Invalid: {
    heading: "Do not admit",
    toastType: "error",
    surface: "status.error.bg",
    border: "status.error",
    foreground: "status.error.fg",
  },
  ManualOverride: {
    heading: "Check-in reversed",
    toastType: "info",
    surface: "status.info.bg",
    border: "status.info",
    foreground: "status.info.fg",
  },
}

/**
 * An admission is read in passing and must not stack up over the queue; a refusal has to survive the
 * operator looking away to speak to the guest it concerns.
 */
export const CHECK_IN_TOAST_DURATION_MS: Record<CheckInOutcome, number> = {
  Success: 2500,
  AlreadyCheckedIn: 5000,
  Invalid: 9000,
  ManualOverride: 4000,
}
