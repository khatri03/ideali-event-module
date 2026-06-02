export function htmlToPlainText(html: string): string {
  if (!html.trim()) {
    return ""
  }

  if (typeof window !== "undefined" && typeof window.DOMParser !== "undefined") {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")
    return (doc.body.textContent || "").trim()
  }

  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}
