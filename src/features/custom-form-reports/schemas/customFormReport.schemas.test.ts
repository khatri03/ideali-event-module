import { describe, expect, it } from "vitest"
import { REPORT_FILTER_OPERATOR, REPORT_SYSTEM_FIELD } from "@/api/customFormReports"
import { isSameReport, type AppliedReport } from "./customFormReport.schemas"

const REPORT: AppliedReport = {
  moduleId: 1,
  entityUniqueId: "entity-1",
  formUniqueId: "form-1",
  fieldUniqueIds: ["field-1", "field-2"],
  filters: [
    {
      fieldUniqueId: "field-1",
      systemField: null,
      operator: REPORT_FILTER_OPERATOR.isAnyOf,
      values: ["Large", "Medium"],
    },
  ],
}

describe("isSameReport", () => {
  it("IdenticalSetups_AreTheSameReport", () => {
    expect(isSameReport(REPORT, { ...REPORT, filters: [{ ...REPORT.filters[0] }] })).toBe(true)
  })

  it("DifferentForm_IsADifferentReportEvenWithTheSameColumns", () => {
    expect(isSameReport(REPORT, { ...REPORT, formUniqueId: "form-2" })).toBe(false)
  })

  it("ReorderedColumns_AreADifferentReportBecauseTheLayoutChanges", () => {
    expect(isSameReport(REPORT, { ...REPORT, fieldUniqueIds: ["field-2", "field-1"] })).toBe(false)
  })

  it("AnAddedColumn_IsADifferentReport", () => {
    expect(isSameReport(REPORT, { ...REPORT, fieldUniqueIds: ["field-1", "field-2", "field-3"] })).toBe(false)
  })

  it("ARemovedFilter_IsADifferentReport", () => {
    expect(isSameReport(REPORT, { ...REPORT, filters: [] })).toBe(false)
  })

  it("AFilterPointedAtARecordDetailInstead_IsADifferentReport", () => {
    expect(
      isSameReport(REPORT, {
        ...REPORT,
        filters: [
          {
            ...REPORT.filters[0],
            fieldUniqueId: null,
            systemField: REPORT_SYSTEM_FIELD.contactNo,
          },
        ],
      }),
    ).toBe(false)
  })

  it("AFilterCondition_ChangingAloneIsEnoughToDifferTheReport", () => {
    expect(
      isSameReport(REPORT, {
        ...REPORT,
        filters: [{ ...REPORT.filters[0], operator: REPORT_FILTER_OPERATOR.equals }],
      }),
    ).toBe(false)
  })

  it("AnExtraFilterValue_IsADifferentReport", () => {
    expect(
      isSameReport(REPORT, {
        ...REPORT,
        filters: [{ ...REPORT.filters[0], values: ["Large", "Medium", "Small"] }],
      }),
    ).toBe(false)
  })
})
