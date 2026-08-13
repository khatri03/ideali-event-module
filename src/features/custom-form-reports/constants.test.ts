import { describe, expect, it } from "vitest"
import { REPORT_SYSTEM_FIELD } from "@/api/customFormReports"
import { entityLabelFor, reportRecordDetails } from "./constants"

function entityDetailLabel(entityLabel: string) {
  return reportRecordDetails(entityLabel).find((detail) => detail.systemField === REPORT_SYSTEM_FIELD.entityName)
    ?.label
}

describe("entityLabelFor", () => {
  it("EventModule_NamesTheColumnAfterTheEventItReportsOn", () => {
    expect(entityLabelFor("Event")).toBe("Event")
  })

  it("MembershipModule_NamesTheColumnAfterTheMembershipType", () => {
    expect(entityLabelFor("Membership")).toBe("Membership Type")
  })

  it("ModuleThisBuildDoesNotKnow_FallsBackToTheGenericWord", () => {
    expect(entityLabelFor("Donation")).toBe("Entity")
  })

  it("NoModuleChosenYet_FallsBackToTheGenericWord", () => {
    expect(entityLabelFor(null)).toBe("Entity")
  })
})

describe("reportRecordDetails", () => {
  it("EntityDetail_TakesTheModulesOwnWord", () => {
    expect(entityDetailLabel("Membership Type")).toBe("Membership Type")
  })

  it("EveryOtherDetail_KeepsItsOwnName", () => {
    const labels = reportRecordDetails("Event").map((detail) => detail.label)

    expect(labels).toEqual(["Invoice No", "Contact Name", "Contact No", "Contact Email", "Event"])
  })
})
