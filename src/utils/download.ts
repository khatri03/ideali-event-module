/**
 * Hands a generated file to the browser's download machinery. The object URL is released once the click has been
 * dispatched, so a session that exports repeatedly does not hold every file it produced in memory.
 */
export function saveBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = objectUrl
  link.download = fileName
  link.rel = "noopener"
  document.body.append(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(objectUrl)
}
