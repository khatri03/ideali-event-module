export function formatUtcOffset(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "-"
  const absoluteMinutes = Math.abs(minutes)
  const hours = Math.floor(absoluteMinutes / 60)
  const remainingMinutes = absoluteMinutes % 60

  return `UTC${sign}${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}`
}

export function stripUtcPrefix(label: string): string {
  return label.replace(/^\(UTC[+-]\d{2}:\d{2}\)\s*/, "")
}
