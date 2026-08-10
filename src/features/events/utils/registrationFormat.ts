import { parseUtcDateTime } from "@/utils/utcDates"

const LOCAL_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

export { parseUtcDateTime }

export function formatRegistrationDateTime(value: string | null | undefined, timeZone = LOCAL_TIME_ZONE) {
  const date = parseUtcDateTime(value)
  if (!date) return "Date not set"

  return new Intl.DateTimeFormat("en-US", { timeZone, dateStyle: "medium", timeStyle: "short" }).format(date)
}

export function formatPurchaseCountdown(milliseconds: number) {
  const safeMilliseconds = Math.max(milliseconds, 0)
  const totalSeconds = Math.floor(safeMilliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const paddedMinutes = minutes.toString().padStart(2, "0")
  const paddedSeconds = seconds.toString().padStart(2, "0")

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${paddedMinutes}:${paddedSeconds}`
  }

  return `${paddedMinutes}:${paddedSeconds}`
}

const CURRENCY_PREFIXES: Record<string, string> = {
  CAD: "CAD$",
  USD: "USD$",
  AUD: "AUD$",
  NZD: "NZD$",
  SGD: "SGD$",
  HKD: "HK$",
  MXN: "MX$",
  JPY: "JPY¥",
  EUR: "EUR€",
  GBP: "GBP£",
}

export function getCurrencyDisplayPrefix(currencyCode?: string | null) {
  const trimmedCurrency = currencyCode?.trim()
  if (!trimmedCurrency) return "$"

  const normalizedCurrency = trimmedCurrency.toUpperCase()
  return CURRENCY_PREFIXES[normalizedCurrency] ?? `${normalizedCurrency} `
}

function formatCurrencyNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatAmount(value: number, currencyCode?: string | null) {
  if (!Number.isFinite(value) || value < 0) return "$0.00"

  const trimmedCurrency = currencyCode?.trim()
  if (!trimmedCurrency) {
    return `$${formatCurrencyNumber(value)}`
  }

  const isIsoCurrencyCode = /^[A-Za-z]{3}$/.test(trimmedCurrency)
  const prefix = isIsoCurrencyCode ? getCurrencyDisplayPrefix(trimmedCurrency) : trimmedCurrency

  return `${prefix}${formatCurrencyNumber(value)}`
}

export function formatChargeRate(valueType: string, value: number, currencyCode?: string | null) {
  if (valueType.trim().toLowerCase().includes("percent")) {
    const normalizedValue = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2).replace(/\.?0+$/, "")
    return `${normalizedValue}%`
  }

  return formatAmount(value, currencyCode)
}

export function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "").trim()
  if (normalized.length !== 6) return hex

  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)

  if ([red, green, blue].some((channel) => Number.isNaN(channel))) return hex

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
