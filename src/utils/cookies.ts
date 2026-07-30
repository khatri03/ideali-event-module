interface CookieOptions {
  path: string
  /** Omit for a session cookie that dies with the tab. */
  expires?: Date
}

function isSecureContext(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:"
}

export function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null
  }

  const prefix = `${encodeURIComponent(name)}=`

  for (const entry of document.cookie.split(";")) {
    const pair = entry.trim()
    if (pair.startsWith(prefix)) {
      return decodeURIComponent(pair.slice(prefix.length))
    }
  }

  return null
}

export function writeCookie(name: string, value: string, options: CookieOptions): void {
  if (typeof document === "undefined") {
    return
  }

  const parts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `Path=${options.path}`,
    "SameSite=Lax",
  ]

  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`)
  }

  // Browsers drop Secure cookies over plain http, which would silently break the dev server.
  if (isSecureContext()) {
    parts.push("Secure")
  }

  document.cookie = parts.join("; ")
}

/** The path must match the one the cookie was written with, or the browser keeps the original. */
export function deleteCookie(name: string, path: string): void {
  if (typeof document === "undefined") {
    return
  }

  document.cookie = `${encodeURIComponent(name)}=; Path=${path}; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
}
