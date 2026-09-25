import { describe, expect, it } from "vitest"
import {
  addMoney,
  EMPTY_VALUE,
  formatCurrency,
  formatCurrencyCode,
  formatCurrencyMagnitude,
  formatList,
  moneySign,
  sumMoney,
} from "./format"

describe("formatList", () => {
  it("SeveralNames_AreReadOutAsASentenceRatherThanJoinedByCommas", () => {
    expect(formatList(["Invoice No", "Contact Name", "Entity"])).toBe("Invoice No, Contact Name, and Entity")
  })

  it("TwoNames_AreJoinedWithoutAComma", () => {
    expect(formatList(["Invoice No", "Entity"])).toBe("Invoice No and Entity")
  })

  it("SingleName_StandsAlone", () => {
    expect(formatList(["Entity"])).toBe("Entity")
  })
})

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

describe("formatCurrencyCode", () => {
  it("IsoCode_PlacesTheSymbolTheWayThatCurrencyIsWritten", () => {
    expect(formatCurrencyCode("40", "USD")).toBe("$40.00")
    expect(formatCurrencyCode("12.5", "CAD")).toBe("CA$12.50")
  })

  /** An event with no payment account still owes the reader a figure, just not a symbol for it. */
  it("NoCode_LeavesTheFigureBareRatherThanGuessingACurrency", () => {
    expect(formatCurrencyCode("40", null)).toBe("40.00")
  })

  it("UnrecognisedCode_FallsBackToThePlainFigureInsteadOfThrowing", () => {
    expect(formatCurrencyCode("40", "NOT-A-CURRENCY")).toBe("40.00")
  })

  it("MissingOrNonNumericAmount_ReadsAsAbsent", () => {
    expect(formatCurrencyCode(null, "USD")).toBe(EMPTY_VALUE)
    expect(formatCurrencyCode("forty", "USD")).toBe(EMPTY_VALUE)
  })

  /** Long figures are formatted from the text, so nothing is lost to a double on the way to the screen. */
  it("AmountBeyondFloatPrecision_KeepsEveryDigit", () => {
    expect(formatCurrencyCode("12345678901234567890.99", null)).toBe("12,345,678,901,234,567,890.99")
  })
})

describe("formatCurrencyMagnitude", () => {
  it("SignedAmount_DropsTheSignForCallersThatStateDirectionInWords", () => {
    expect(formatCurrencyMagnitude("-45", "$")).toBe("$45.00")
    expect(formatCurrencyMagnitude("45", "$")).toBe("$45.00")
  })
})

describe("addMoney", () => {
  it("TwoCentAmounts_AddExactlyWithoutFloatDrift", () => {
    expect(addMoney("10.01", "20.02")).toBe("30.03")
  })

  it("CarriesIntoTheNextDollarOnTheCent", () => {
    expect(addMoney("0.99", "0.01")).toBe("1.00")
  })

  it("AmountBeyondFloatPrecision_KeepsEveryCent", () => {
    expect(addMoney("99999999.99", "0.02")).toBe("100000000.01")
  })
})

describe("sumMoney", () => {
  it("SeveralAmounts_AddToTheExactCentTotal", () => {
    expect(sumMoney(["0.10", "0.20", "0.03"])).toBe("0.33")
  })

  it("EmptySet_ReadsAsZeroRatherThanAbsent", () => {
    expect(sumMoney([])).toBe("0.00")
  })

  it("SingleAmount_IsNormalisedToTwoDecimals", () => {
    expect(sumMoney(["1500"])).toBe("1500.00")
  })

  it("ManyLargeAmounts_StayExactBecauseTheyAreNeverParsedAsFloats", () => {
    expect(sumMoney(["99999999.99", "99999999.99"])).toBe("199999999.98")
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
