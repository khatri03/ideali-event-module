export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0]

/**
 * Mirrors the server-side limits in DocumentCategoryService so an over-sized or unsupported file is
 * refused before it is uploaded. The server still enforces all three - this only saves a round trip.
 */
export const MAX_FILES_PER_UPLOAD = 5
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

export const ALLOWED_EXTENSIONS = [
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".txt", ".csv", ".rtf", ".odt", ".ods", ".odp",
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg",
  ".zip",
] as const

/** `accept` attribute for the file input - the same list, comma separated. */
export const UPLOAD_ACCEPT = ALLOWED_EXTENSIONS.join(",")

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "—"
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed)
}

const FILE_SIZE_UNITS = ["B", "KB", "MB", "GB"] as const

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "—"
  }

  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < FILE_SIZE_UNITS.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  // Bytes are always whole; larger units read better with one decimal.
  return `${unitIndex === 0 ? size : size.toFixed(1)} ${FILE_SIZE_UNITS[unitIndex]}`
}

function fileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".")
  return dotIndex < 0 ? "" : fileName.slice(dotIndex).toLowerCase()
}

/** Returns the first reason this file cannot be uploaded, or null when it is acceptable. */
export function validateUploadFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `"${file.name}" exceeds the ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB limit.`
  }

  const extension = fileExtension(file.name)
  return extension && (ALLOWED_EXTENSIONS as readonly string[]).includes(extension)
    ? null
    : `"${file.name}" is not an allowed file type.`
}
