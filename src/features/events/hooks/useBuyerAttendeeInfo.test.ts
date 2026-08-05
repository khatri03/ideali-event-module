import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useBuyerAttendeeInfo } from "./useBuyerAttendeeInfo"
import type { AttendeeSlotEntry } from "@/features/events/components/registration/types"

const SLOT: AttendeeSlotEntry = {
  key: "session-1|ticket-1|0",
  sessionId: "session-1",
  sessionName: "Friday Dinner & Entertainment",
  ticketId: "ticket-1",
  ticketName: "Aga Khan",
  attendeeLabel: "Attendee 1",
  requiresAttendeeInfo: true,
}

const SESSION_GROUP = {
  key: "session-1",
  sessionId: SLOT.sessionId,
  sessionName: SLOT.sessionName,
  attendeeCount: 1,
  requiresAttendeeInfo: true,
  tickets: [
    {
      key: "ticket-1",
      sessionId: SLOT.sessionId,
      sessionName: SLOT.sessionName,
      ticketId: SLOT.ticketId,
      ticketName: SLOT.ticketName,
      attendeeCount: 1,
      requiresAttendeeInfo: true,
          slots: [{ key: SLOT.key, attendeeLabel: SLOT.attendeeLabel }],
    },
  ],
}

// Stable references: the hook reconciles slot state by comparing these against the previous render.
const HOOK_ARGS = {
  attendeeSlotEntries: [SLOT],
  attendeeSlotEntryByKey: { [SLOT.key]: SLOT },
  attendeeSessionGroups: [SESSION_GROUP],
}

function renderBuyerAttendeeInfo() {
  return renderHook(() => useBuyerAttendeeInfo(HOOK_ARGS))
}

function fillBuyer(result: { current: ReturnType<typeof useBuyerAttendeeInfo> }) {
  act(() => {
    result.current.updateBuyerField("lastName", "Ahmed")
    result.current.updateBuyerField("email", "khatri03@gmail.com")
  })
}

function fillAttendee(
  result: { current: ReturnType<typeof useBuyerAttendeeInfo> },
  fields: Partial<Record<"firstName" | "lastName" | "email", string>>,
) {
  act(() => {
    Object.entries(fields).forEach(([field, value]) => {
      result.current.updateAttendeeField(SLOT.key, field as "firstName", value)
    })
  })
}

describe("useBuyerAttendeeInfo", () => {
  it("Issues_AttendeeFirstNameBlank_RaisesNothing", () => {
    const { result } = renderBuyerAttendeeInfo()
    fillBuyer(result)
    // First name carries no required marker on the form, so it cannot gate the step.
    fillAttendee(result, { lastName: "Ayyan", email: "fueldistributionportal@gmail.com" })

    expect(result.current.getIssues()).toEqual([])
  })

  it("Issues_AttendeeLastNameBlank_NamesTheMissingField", () => {
    const { result } = renderBuyerAttendeeInfo()
    fillBuyer(result)
    fillAttendee(result, { firstName: "Ayyan", email: "fueldistributionportal@gmail.com" })

    expect(result.current.getIssues()).toEqual([
      {
        message: "Friday Dinner & Entertainment needs an attendee last name for Aga Khan.",
        target: "buyer-attendee-info",
      },
    ])
  })

  it("Issues_AttendeeLastNameAndEmailBlank_NamesBoth", () => {
    const { result } = renderBuyerAttendeeInfo()
    fillBuyer(result)

    expect(result.current.getIssues()).toEqual([
      {
        message: "Friday Dinner & Entertainment needs an attendee last name and email for Aga Khan.",
        target: "buyer-attendee-info",
      },
    ])
  })

  it("Issues_AttendeeEmailMalformed_RejectsItSeparatelyFromTheBlankCheck", () => {
    const { result } = renderBuyerAttendeeInfo()
    fillBuyer(result)
    fillAttendee(result, { lastName: "Ayyan", email: "not-an-address" })

    expect(result.current.getIssues()).toEqual([
      {
        message: "Friday Dinner & Entertainment needs a valid attendee email for Aga Khan.",
        target: "buyer-attendee-info",
      },
    ])
  })

  it("Issues_SameAsBuyerOnForTheTicket_SkipsTheAttendeeEntirely", () => {
    const { result } = renderBuyerAttendeeInfo()
    fillBuyer(result)

    act(() => result.current.toggleTicketSameAsBuyer(SLOT.sessionId, SLOT.ticketId, true))

    expect(result.current.getIssues()).toEqual([])
  })

  it("Issues_BuyerEmailMalformed_ReportsTheBuyerBeforeTheAttendee", () => {
    const { result } = renderBuyerAttendeeInfo()
    act(() => {
      result.current.updateBuyerField("lastName", "Ahmed")
      result.current.updateBuyerField("email", "khatri03@")
    })
    fillAttendee(result, { lastName: "Ayyan", email: "fueldistributionportal@gmail.com" })

    expect(result.current.getIssues()).toEqual([
      { message: "Enter a valid buyer email address.", target: "buyer-attendee-info" },
    ])
  })
})
