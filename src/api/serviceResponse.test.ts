import { describe, expect, it } from "vitest"
import { assertSuccess, ServiceResponseError } from "./serviceResponse"

const FALLBACK = "Online payment could not be started. Please try again."

describe("assertSuccess", () => {
  /**
   * A 200 whose body is not an envelope object - an HTML fallback page, a bare string - must read as the
   * caller's plain message, never a Zod complaint about the shape (IN-01). Every API module routes through
   * here, so the fix lives at the root rather than in each caller.
   */
  it.each([
    ["an HTML fallback page", "<html>Service unavailable</html>"],
    ["a bare string", "unexpected"],
    ["a number", 500],
    ["null", null],
  ])("NonObjectBody_ThrowsTheFallbackMessage_%s", (_case, body) => {
    expect(() => assertSuccess(body, FALLBACK)).toThrow(ServiceResponseError)
    expect(() => assertSuccess(body, FALLBACK)).toThrow(FALLBACK)
  })

  /** A self-reported failure carries the server's own reason so the buyer learns why the call was refused. */
  it("SelfReportedFailure_ThrowsTheServerReason", () => {
    expect(() => assertSuccess({ success: false, message: "Nothing left to pay." }, FALLBACK)).toThrow(
      "Nothing left to pay.",
    )
  })

  /** A failure with no message falls back to the caller's wording rather than throwing an empty error. */
  it("SelfReportedFailureWithoutAMessage_FallsBackToTheCallersWording", () => {
    expect(() => assertSuccess({ success: false, message: "   " }, FALLBACK)).toThrow(FALLBACK)
  })

  /** A well-formed success envelope - including one that omits `success` - passes without throwing. */
  it.each([
    ["success is true", { success: true, data: { ok: 1 } }],
    ["success is omitted", { data: { ok: 1 } }],
  ])("SuccessEnvelope_DoesNotThrow_%s", (_case, body) => {
    expect(() => assertSuccess(body, FALLBACK)).not.toThrow()
  })
})
