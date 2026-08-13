/** One glyph for "nothing here", so an absent value never reads as a different kind of absence from one
 * surface to the next. */
export const EMPTY_VALUE = "—"

const MONEY_LOCALE = "en-US"

const SENTENCE_LIST_FORMAT = new Intl.ListFormat("en-US", { style: "long", type: "conjunction" })

/** Reads a set of names out the way a sentence would, so copy can be built from the list it describes. */
export function formatList(items: readonly string[]): string {
  return SENTENCE_LIST_FORMAT.format(items)
}

const MONEY_PATTERN = /^-?\d+(\.\d+)?$/

const MONEY_FORMAT = new Intl.NumberFormat(MONEY_LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Which side of zero an amount falls on, decided on the decimal text rather than a parsed float, so a
 * figure too long for a double still answers correctly. An amount that is not a plain decimal reads as
 * zero: there is no sign to report and the caller's fallback copy is the honest thing to show.
 */
export function moneySign(amount: string): -1 | 0 | 1 {
  const trimmed = amount.trim()
  if (!MONEY_PATTERN.test(trimmed) || /^-?0*(\.0*)?$/.test(trimmed)) {
    return 0
  }
  return trimmed.startsWith("-") ? -1 : 1
}

/**
 * Money arrives from the API as decimal text and is never turned into a float on the way to the screen -
 * `Intl` formats the string directly, so nothing is rounded away in transit. The symbol is prefixed by
 * hand because the API sends a display symbol rather than an ISO code, which is what `style: "currency"`
 * would need.
 */
export function formatCurrency(amount: string | null | undefined, currencySymbol: string): string {
  const trimmed = amount?.trim()
  if (!trimmed || !MONEY_PATTERN.test(trimmed)) {
    return EMPTY_VALUE
  }

  const isNegative = trimmed.startsWith("-")
  // Intl accepts decimal text and formats it without ever building a float; the lib type only admits
  // literals it can check at compile time, which a runtime amount never is.
  const digits = (isNegative ? trimmed.slice(1) : trimmed) as Intl.StringNumericLiteral
  const magnitude = MONEY_FORMAT.format(digits)

  return `${isNegative ? "-" : ""}${currencySymbol}${magnitude}`
}

/** The same figure with its sign dropped, for places that state the direction in words instead. */
export function formatCurrencyMagnitude(amount: string | null | undefined, currencySymbol: string): string {
  const trimmed = amount?.trim()
  return formatCurrency(trimmed?.startsWith("-") ? trimmed.slice(1) : trimmed, currencySymbol)
}

function toCents(amount: string): bigint {
  const trimmed = amount.trim()
  const isNegative = trimmed.startsWith("-")
  const digits = isNegative ? trimmed.slice(1) : trimmed
  const [integerPart, fractionPart = ""] = digits.split(".")
  const cents = BigInt(integerPart || "0") * 100n + BigInt((fractionPart + "00").slice(0, 2) || "0")
  return isNegative ? -cents : cents
}

function fromCents(cents: bigint): string {
  const isNegative = cents < 0n
  const magnitude = isNegative ? -cents : cents
  const fractionPart = (magnitude % 100n).toString().padStart(2, "0")
  return `${isNegative ? "-" : ""}${magnitude / 100n}.${fractionPart}`
}

/**
 * Decimal-text subtraction that never routes money through a float, so results stay exact down to the
 * cent regardless of how many digits either side carries.
 */
export function subtractMoney(minuend: string, subtrahend: string): string {
  return fromCents(toCents(minuend) - toCents(subtrahend))
}
