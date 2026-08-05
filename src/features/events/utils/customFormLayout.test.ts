import { describe, expect, it } from "vitest"
import { clampFormColumns, getFieldColumnSpan } from "@/features/events/utils/customFormLayout"

describe("custom form layout", () => {
  it("Columns_AuthoredWiderThanTheGridSupports_AreCappedAtFour", () => {
    expect(clampFormColumns(12)).toBe(4)
  })

  it("Columns_MissingOrNonPositive_FallBackToOne", () => {
    expect(clampFormColumns(null)).toBe(1)
    expect(clampFormColumns(undefined)).toBe(1)
    expect(clampFormColumns(0)).toBe(1)
    expect(clampFormColumns(-3)).toBe(1)
  })

  it("Span_NarrowerThanItsForm_IsKeptAsAuthored", () => {
    expect(getFieldColumnSpan(2, 3)).toBe(2)
  })

  it("Span_WiderThanItsForm_CannotOverflowTheRow", () => {
    expect(getFieldColumnSpan(6, 2)).toBe(2)
  })

  it("Span_OnASingleColumnForm_IsAlwaysOne", () => {
    expect(getFieldColumnSpan(3, 1)).toBe(1)
  })
})
