import { useCallback, useEffect, useRef, useState } from "react"
import { searchUnsplashPhotos, type UnsplashOrientation, type UnsplashPhoto } from "@/api/unsplash"

const UNSPLASH_SEARCH_DEBOUNCE_MS = 1000

interface UseUnsplashSearchOptions {
  isOpen: boolean
}

interface UseUnsplashSearchResult {
  query: string
  setQuery: (query: string) => void
  orientation: UnsplashOrientation
  setOrientation: (orientation: UnsplashOrientation) => void
  results: UnsplashPhoto[]
  totalResults: number
  page: number
  isSearching: boolean
  isLoadingMore: boolean
  searchError: string
  selectedPhoto: UnsplashPhoto | null
  setSelectedPhoto: (photo: UnsplashPhoto | null) => void
  hasResults: boolean
  hasMore: boolean
  search: (queryOverride?: string, orientationOverride?: UnsplashOrientation, options?: { suppressNextDebounce?: boolean }) => Promise<void>
  loadMore: () => Promise<void>
  clearResults: () => void
}

export function useUnsplashSearch({ isOpen }: UseUnsplashSearchOptions): UseUnsplashSearchResult {
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressNextDebounceRef = useRef(false)

  const [query, setQuery] = useState("")
  const [orientation, setOrientation] = useState<UnsplashOrientation>("landscape")
  const [results, setResults] = useState<UnsplashPhoto[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [page, setPage] = useState(1)
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [selectedPhoto, setSelectedPhoto] = useState<UnsplashPhoto | null>(null)

  const hasResults = results.length > 0
  const hasMore = totalResults > 0 && results.length < totalResults

  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
  }, [])

  const mergeResults = useCallback((existing: UnsplashPhoto[], incoming: UnsplashPhoto[]) => {
    const seen = new Set(existing.map((photo) => photo.id))
    const merged = [...existing]
    for (const photo of incoming) {
      if (!seen.has(photo.id)) {
        seen.add(photo.id)
        merged.push(photo)
      }
    }
    return merged
  }, [])

  const execute = useCallback(
    async ({
      query: q,
      page: p,
      append,
      orientation: o,
    }: {
      query: string
      page: number
      append: boolean
      orientation: UnsplashOrientation
    }) => {
      const normalizedQuery = q.trim()

      if (!normalizedQuery) {
        setSearchError("Enter a search term to browse Unsplash images.")
        setResults([])
        setPage(1)
        setTotalResults(0)
        setSelectedPhoto(null)
        return
      }

      abortControllerRef.current?.abort()
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      setSearchError("")
      if (append) {
        setIsLoadingMore(true)
      } else {
        setIsSearching(true)
        setPage(1)
        setTotalResults(0)
        setResults([])
        setSelectedPhoto(null)
      }

      try {
        const response = await searchUnsplashPhotos(normalizedQuery, {
          page: p,
          perPage: 12,
          orientation: o,
          signal: abortController.signal,
        })
        setTotalResults(response.totalResults)
        setPage(p)
        setResults((current) => (append ? mergeResults(current, response.results) : response.results))
      } catch (searchError) {
        if (abortController.signal.aborted) return

        if (!append) {
          setResults([])
          setTotalResults(0)
        }

        setSearchError(searchError instanceof Error ? searchError.message : "Unable to search Unsplash.")
      } finally {
        if (!abortController.signal.aborted) {
          setIsSearching(false)
          setIsLoadingMore(false)
        }
      }
    },
    [mergeResults],
  )

  const search = useCallback(
    async (
      queryOverride?: string,
      orientationOverride?: UnsplashOrientation,
      options?: { suppressNextDebounce?: boolean },
    ) => {
      clearDebounce()
      suppressNextDebounceRef.current = options?.suppressNextDebounce ?? false
      const q = (queryOverride ?? query).trim()
      const o = orientationOverride ?? orientation
      await execute({ query: q, page: 1, append: false, orientation: o })
    },
    [clearDebounce, execute, orientation, query],
  )

  const loadMore = useCallback(async () => {
    const q = query.trim()
    if (!q || isSearching || isLoadingMore || !hasMore) return
    await execute({ query: q, page: page + 1, append: true, orientation })
  }, [execute, hasMore, isLoadingMore, isSearching, orientation, page, query])

  const clearResults = useCallback(() => {
    setQuery("")
    setResults([])
    setTotalResults(0)
    setPage(1)
    setSearchError("")
    setSelectedPhoto(null)
  }, [])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    clearDebounce()

    if (!isOpen) return

    if (suppressNextDebounceRef.current) {
      suppressNextDebounceRef.current = false
      return
    }

    const normalizedQuery = query.trim()
    if (!normalizedQuery) return

    debounceTimerRef.current = window.setTimeout(() => {
      void execute({ query: normalizedQuery, page: 1, append: false, orientation })
    }, UNSPLASH_SEARCH_DEBOUNCE_MS)
  }, [clearDebounce, execute, isOpen, orientation, query])

  return {
    query,
    setQuery,
    orientation,
    setOrientation,
    results,
    totalResults,
    page,
    isSearching,
    isLoadingMore,
    searchError,
    selectedPhoto,
    setSelectedPhoto,
    hasResults,
    hasMore,
    search,
    loadMore,
    clearResults,
  }
}
