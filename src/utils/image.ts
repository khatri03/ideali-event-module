export function mimeTypeToExtension(mimeType: string | null | undefined, fallbackUrl?: string): string {
  const normalizedMimeType = mimeType?.split(";")[0]?.trim().toLowerCase()

  switch (normalizedMimeType) {
    case "image/jpeg":
    case "image/jpg":
      return ".jpg"
    case "image/png":
      return ".png"
    case "image/webp":
      return ".webp"
    case "image/gif":
      return ".gif"
    default: {
      if (fallbackUrl) {
        try {
          const fallbackPath = new URL(fallbackUrl).pathname
          const match = fallbackPath.match(/\.[a-z0-9]+$/i)
          if (match?.[0]) {
            return match[0].toLowerCase()
          }
        } catch {
          return ".png"
        }
      }

      return ".png"
    }
  }
}

export async function buildImageFileFromUrl(imageUrl: string, fallbackName: string): Promise<File> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error("Unable to read the selected image.")
  }

  const blob = await response.blob()
  const mimeTypeHeader = response.headers.get("content-type") || blob.type || "image/png"
  const mimeType = (mimeTypeHeader.split(";")[0] || "image/png").trim()
  const extension = mimeTypeToExtension(mimeType, imageUrl)
  return new File([blob], `${fallbackName}${extension}`, { type: mimeType })
}
