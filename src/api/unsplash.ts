import { z } from "zod"
import { client } from "@/api/client"

const unsplashSearchPhotoSchema = z.object({
  id: z.string(),
  description: z.string().nullable().optional(),
  altDescription: z.string().nullable().optional(),
  imageUrl: z.string(),
  photographerName: z.string(),
  photographerProfileUrl: z.string(),
  photoPageUrl: z.string(),
  width: z.number().int(),
  height: z.number().int(),
})

const unsplashSearchResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().nullable().optional(),
  data: z
    .object({
      query: z.string(),
      totalResults: z.number().int(),
      results: z.array(unsplashSearchPhotoSchema),
    })
    .nullable()
    .optional(),
})

export type UnsplashOrientation = "landscape" | "portrait" | "squarish" | "any"

export interface UnsplashPhoto {
  id: string
  description: string
  altDescription: string
  imageUrl: string
  photographerName: string
  photographerProfileUrl: string
  photoPageUrl: string
  width: number
  height: number
}

export interface UnsplashSearchResult {
  query: string
  totalResults: number
  results: UnsplashPhoto[]
}

function toPhoto(photo: z.infer<typeof unsplashSearchPhotoSchema>): UnsplashPhoto {
  return {
    id: photo.id,
    description: photo.description ?? "",
    altDescription: photo.altDescription ?? "",
    imageUrl: photo.imageUrl,
    photographerName: photo.photographerName,
    photographerProfileUrl: photo.photographerProfileUrl,
    photoPageUrl: photo.photoPageUrl,
    width: photo.width,
    height: photo.height,
  }
}

export async function searchUnsplashPhotos(
  query: string,
  options?: {
    page?: number
    perPage?: number
    orientation?: UnsplashOrientation
    signal?: AbortSignal
  },
): Promise<UnsplashSearchResult> {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) {
    return {
      query: normalizedQuery,
      totalResults: 0,
      results: [],
    }
  }

  const page = Math.max(options?.page ?? 1, 1)
  const perPage = Math.min(Math.max(options?.perPage ?? 12, 1), 30)
  const orientation = options?.orientation ?? "landscape"
  const orientationQuery = orientation === "any" ? "" : `&orientation=${encodeURIComponent(orientation)}`
  const response = await client.get<unknown>(
    `/api/unsplash/search?query=${encodeURIComponent(normalizedQuery)}&page=${page}&perPage=${perPage}${orientationQuery}`,
    { signal: options?.signal },
  )

  const payload = unsplashSearchResponseSchema.parse(response.data)
  if (!payload.success) {
    throw new Error(payload.message || "Unable to search Unsplash.")
  }

  return {
    query: payload.data?.query ?? normalizedQuery,
    totalResults: payload.data?.totalResults ?? 0,
    results: (payload.data?.results ?? []).map(toPhoto),
  }
}
