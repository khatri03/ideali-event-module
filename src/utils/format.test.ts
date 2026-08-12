import { describe, expect, it } from "vitest"
import { EMPTY_VALUE, formatCurrency, formatCurrencyMagnitude, moneySign } from "./format"

describe("formatCurrency", () => {
  it("WholeAndFractionalAmounts_AlwaysCarryTwoDecimals", () => {
    expect(formatCurrency("420", "$")).toBe("$420.00")
    expect(formatCurrency("504.5", "$")).toBe("$504.50")
    expect(formatCurrency("504.56", "$")).toBe("$504.56")
  })

  it("ThousandsSeparatorApplied_SoLargeTotalsStayReadable", () => {
    expect(formatCurrency("1234567.89", "$")).toBe("$1,234,567.89")
  })

  it("NegativeAmount_PutsTheSignAheadOfTheSymbol", () => {
    expect(formatCurrency("-45", "$")).toBe("-$45.00")
  })

  it("AmountTooLongForADouble_KeepsEveryDigitBecauseItIsNeverParsedAsAFloat", () => {
    expect(formatCurrency("12345678901234567890.99", "$")).toBe("$12,345,678,901,234,567,890.99")
  })

  it("NonNumericOrAbsentAmount_RendersTheSharedEmptyGlyph", () => {
    expect(formatCurrency(null, "$")).toBe(EMPTY_VALUE)
    expect(formatCurrency(undefined, "$")).toBe(EMPTY_VALUE)
    expect(formatCurrency("", "$")).toBe(EMPTY_VALUE)
    expect(formatCurrency("not money", "$")).toBe(EMPTY_VALUE)
  })

  it("CurrencySymbolFromTheApi_IsUsedVerbatim", () => {
    expect(formatCurrency("10", "CAD$")).toBe("CAD$10.00")
    expect(formatCurrency("10", "£")).toBe("£10.00")
  })
})

describe("formatCurrencyMagnitude", () => {
  it("SignedAmount_DropsTheSignForCallersThatStateDirectionInWords", () => {
    expect(formatCurrencyMagnitude("-45", "$")).toBe("$45.00")
    expect(formatCurrencyMagnitude("45", "$")).toBe("$45.00")
  })
})

describe("moneySign", () => {
  it("AmountOwed_ReportsPositive", () => {
    expect(moneySign("0.01")).toBe(1)
    expect(moneySign("420")).toBe(1)
  })

  it("AmountOwedBack_ReportsNegative", () => {
    expect(moneySign("-0.01")).toBe(-1)
    expect(moneySign("-45.00")).toBe(-1)
  })

  it("EveryWrittenFormOfZero_ReportsZero", () => {
    expect(moneySign("0")).toBe(0)
    expect(moneySign("0.00")).toBe(0)
    expect(moneySign("-0.00")).toBe(0)
    expect(moneySign("00.000")).toBe(0)
  })

  it("UnparseableAmount_ReportsZeroRatherThanGuessingADirection", () => {
    expect(moneySign("not money")).toBe(0)
    expect(moneySign("")).toBe(0)
  })
})
