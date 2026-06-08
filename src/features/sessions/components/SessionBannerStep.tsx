import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Badge,
  Box,
  Button,
  CloseButton,
  Dialog,
  Flex,
  Image,
  Input,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react"
import { FileImage, ImagePlus, RefreshCcw, Search, Sparkles, Trash2, Upload, X } from "lucide-react"
import { fetchSessionWizardBanner, fetchSessionWizardGenres, updateSessionWizardBanner } from "@/api/sessions"
import { type UnsplashOrientation, type UnsplashPhoto } from "@/api/unsplash"
import { extractApiError } from "@/utils/errors"
import { buildImageFileFromUrl } from "@/utils/image"
import { getSessionWizardStepNumber } from "../hooks/useSessionWizard"
import { useSessionWizardActions } from "../hooks/useSessionWizardActions"
import { useUnsplashSearch } from "../hooks/useUnsplashSearch"

type BannerSourceMode = "upload" | "unsplash"

const UNSPLASH_ORIENTATION_OPTIONS: Array<{ label: string; value: UnsplashOrientation }> = [
  { label: "Landscape", value: "landscape" },
  { label: "Portrait", value: "portrait" },
  { label: "Square", value: "squarish" },
  { label: "Any", value: "any" },
]

interface SessionBannerStepProps {
  sessionId: string
}

function SessionBannerSkeleton() {
  return (
    <Stack gap={4}>
      <Skeleton height="84px" borderRadius="20px" />
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={5}>
        <Skeleton height="300px" borderRadius="24px" />
        <Skeleton height="300px" borderRadius="24px" />
      </SimpleGrid>
    </Stack>
  )
}

function UnsplashPhotoCard({
  photo,
  onUse,
  disabled,
}: {
  photo: UnsplashPhoto
  onUse: (photo: UnsplashPhoto) => void | Promise<boolean>
  disabled?: boolean
}) {
  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        className="block w-full text-left disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => void onUse(photo)}
        disabled={disabled}
      >
        <img
          src={photo.imageUrl}
          alt={photo.altDescription || photo.description || "Unsplash banner photo"}
          loading="lazy"
          className="h-44 w-full object-cover"
        />
        <div className="flex items-center justify-center px-4 py-3">
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-600">
            {photo.width} × {photo.height}
          </span>
        </div>
      </button>
    </article>
  )
}

export function SessionBannerStep({ sessionId }: SessionBannerStepProps) {
  const queryClient = useQueryClient()
  const { setPrimaryAction, setPrimaryActionReady } = useSessionWizardActions()
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const unsplashQueryInputRef = useRef<HTMLInputElement | null>(null)
  const uploadDragDepthRef = useRef(0)
  const objectUrlRef = useRef<string | null>(null)
  const [draftBannerFile, setDraftBannerFile] = useState<File | null>(null)
  const [draftBannerPreviewUrl, setDraftBannerPreviewUrl] = useState<string | null>(null)
  const [clearRequested, setClearRequested] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  const [bannerSource, setBannerSource] = useState<BannerSourceMode>("upload")
  const [bannerUploadError, setBannerUploadError] = useState("")
  const [isUnsplashModalOpen, setIsUnsplashModalOpen] = useState(false)
  const [isPreparingUnsplashSelection, setIsPreparingUnsplashSelection] = useState(false)
  const [activeUnsplashGenreUniqueId, setActiveUnsplashGenreUniqueId] = useState<string | null>(null)

  const {
    query: unsplashQuery,
    setQuery: setUnsplashQuery,
    orientation: unsplashOrientation,
    setOrientation: setUnsplashOrientation,
    results: unsplashResults,
    totalResults: unsplashTotalResults,
    isSearching: isSearchingUnsplash,
    isLoadingMore: isLoadingMoreUnsplash,
    searchError: unsplashSearchError,
    selectedPhoto: selectedUnsplashPhoto,
    setSelectedPhoto: setSelectedUnsplashPhoto,
    hasResults: hasUnsplashResults,
    hasMore: hasMoreUnsplashResults,
    search: searchUnsplash,
    loadMore: loadMoreUnsplash,
    clearResults: clearUnsplashSearchResults,
  } = useUnsplashSearch({ isOpen: isUnsplashModalOpen })

  const bannerQuery = useQuery({
    queryKey: ["sessions", { sessionId, step: "banner" }],
    queryFn: () => fetchSessionWizardBanner(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  const genresQuery = useQuery({
    queryKey: ["sessions", { sessionId, step: "genre" }],
    queryFn: () => fetchSessionWizardGenres(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { bannerFile: File | null; clearBanner: boolean }) =>
      updateSessionWizardBanner(sessionId, payload, getSessionWizardStepNumber("banner")),
    onSuccess: async (data) => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }

      setDraftBannerFile(null)
      setDraftBannerPreviewUrl(null)
      setClearRequested(false)
      setBannerUploadError("")
      queryClient.setQueryData(["sessions", { sessionId, step: "banner" }], data)
      queryClient.setQueryData(["sessions", "wizard-progress", sessionId], (current: { stepNo?: number } | undefined) => ({
        stepNo: Math.max(current?.stepNo ?? 0, data.stepNo ?? 3),
      }))
      await queryClient.invalidateQueries({ queryKey: ["sessions", "review", sessionId] })
    },
    onSettled: () => {
      setPrimaryActionReady(true)
    },
  })

  const savedBannerUrl = bannerQuery.data?.bannerUrl ?? null
  const previewBannerUrl = draftBannerPreviewUrl ?? (clearRequested ? null : savedBannerUrl)
  const hasSavedBanner = Boolean(savedBannerUrl)
  const hasStagedBanner = Boolean(draftBannerFile)
  const selectedGenres = useMemo(
    () => (genresQuery.data ?? []).filter((genre) => genre.isSelected),
    [genresQuery.data],
  )
  const bannerStateLabel = hasStagedBanner
    ? "New banner staged"
    : clearRequested
      ? "Banner will be removed"
      : hasSavedBanner
        ? "Current saved banner"
        : "No banner selected yet"

  const bannerQueryError = bannerQuery.error as unknown
  const updateMutationError = updateMutation.error as unknown

  const revokeStagedPreview = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  const stageBannerFile = useCallback(
    (file: File) => {
      revokeStagedPreview()
      const previewUrl = URL.createObjectURL(file)
      objectUrlRef.current = previewUrl
      setDraftBannerFile(file)
      setDraftBannerPreviewUrl(previewUrl)
      setClearRequested(false)
      setBannerUploadError("")
    },
    [revokeStagedPreview],
  )

  const clearBannerDraft = useCallback(
    (markForRemoval: boolean) => {
      revokeStagedPreview()
      setDraftBannerFile(null)
      setDraftBannerPreviewUrl(null)
      setClearRequested(markForRemoval)
    },
    [revokeStagedPreview],
  )

  const handleUploadFiles = useCallback(
    (files: FileList | null | undefined) => {
      const file = files?.[0]
      if (!file) {
        return
      }

      setBannerSource("upload")
      setSelectedUnsplashPhoto(null)
      stageBannerFile(file)
    },
    [setSelectedUnsplashPhoto, stageBannerFile],
  )

  useEffect(() => {
    if (!isUnsplashModalOpen) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      unsplashQueryInputRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [isUnsplashModalOpen])

  const selectUnsplashPhoto = useCallback(
    async (photo: UnsplashPhoto) => {
      setBannerSource("unsplash")
      setBannerUploadError("")
      setIsPreparingUnsplashSelection(true)

      try {
        const file = await buildImageFileFromUrl(photo.imageUrl, `unsplash-${photo.id}`)
        stageBannerFile(file)
        setSelectedUnsplashPhoto(photo)
        setIsUnsplashModalOpen(false)
        return true
      } catch (selectError) {
        setBannerUploadError(
          selectError instanceof Error ? selectError.message : "Unable to prepare the selected Unsplash image.",
        )
        setSelectedUnsplashPhoto(null)
        return false
      } finally {
        setIsPreparingUnsplashSelection(false)
      }
    },
    [setSelectedUnsplashPhoto, stageBannerFile],
  )

  const clearUnsplashSearch = useCallback(() => {
    setActiveUnsplashGenreUniqueId(null)
    clearUnsplashSearchResults()
    unsplashQueryInputRef.current?.focus()
  }, [clearUnsplashSearchResults])

  useEffect(() => {
    if (!bannerQuery.isSuccess) {
      setPrimaryAction(null)
      setPrimaryActionReady(false)
      return
    }

    setPrimaryAction(async () => {
      setPrimaryActionReady(false)
      await updateMutation.mutateAsync({
        bannerFile: draftBannerFile,
        clearBanner: clearRequested,
      })
    })
    setPrimaryActionReady(true)

    return () => {
      setPrimaryAction(null)
      setPrimaryActionReady(true)
    }
  }, [
    bannerQuery.isSuccess,
    clearRequested,
    draftBannerFile,
    setPrimaryAction,
    setPrimaryActionReady,
    updateMutation,
    updateMutation.mutateAsync,
  ])

  useEffect(() => {
    return () => {
      revokeStagedPreview()
    }
  }, [revokeStagedPreview])

  const handleOpenUnsplashModal = useCallback(() => {
    setBannerSource("unsplash")
    setBannerUploadError("")
    setIsUnsplashModalOpen(true)
  }, [])

  const handleUploadCardClick = useCallback(() => {
    setBannerSource("upload")
    uploadInputRef.current?.click()
  }, [])

  const handleReplaceBanner = useCallback(() => {
    if (bannerSource === "unsplash") {
      handleOpenUnsplashModal()
      return
    }

    setBannerSource("upload")
    uploadInputRef.current?.click()
  }, [bannerSource, handleOpenUnsplashModal])

  if (bannerQuery.isError) {
    return (
      <Stack gap={3}>
        <Text fontSize="sm" color="red.500">
          {extractApiError(bannerQuery.error)}
        </Text>
      </Stack>
    )
  }

  return (
    <Stack gap={5}>
      <Box
        border="1px solid"
        borderColor="gray.200"
        borderRadius="20px"
        bg="linear-gradient(135deg, rgba(117,81,255,0.05) 0%, rgba(66,42,251,0.03) 100%)"
        p={{ base: 4, md: 5 }}
      >
        <Flex align="flex-start" justify="space-between" gap={4} wrap="wrap">
          <Box minW={0}>
            <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
              Banner
            </Text>
            <Text mt={2} fontSize={{ base: "sm", md: "md" }} fontWeight="700" color="gray.800">
              Add a banner image for this session. The step is optional, so you can skip it and return later.
            </Text>
            <Text mt={2} fontSize="sm" color="gray.600">
              JPG, PNG, and WEBP images work best for the wizard preview.
            </Text>
          </Box>

          <Badge
            variant="subtle"
            colorPalette={hasSavedBanner || hasStagedBanner ? "brand" : "gray"}
            borderRadius="999px"
            px={3}
            py={1}
          >
            <Flex align="center" gap={1.5}>
              <Sparkles size={14} />
              <Text as="span" fontSize="xs" fontWeight="800">
                {bannerStateLabel}
              </Text>
            </Flex>
          </Badge>
        </Flex>
      </Box>

      {bannerQuery.isLoading ? (
        <SessionBannerSkeleton />
      ) : (
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={5}>
          <Stack
            gap={4}
            border="1px solid"
            borderColor="gray.200"
            borderRadius="24px"
            bg="white"
            boxShadow="0 10px 28px rgba(15, 23, 42, 0.05)"
            p={{ base: 4, md: 5 }}
          >
            <Box border="1px solid" borderColor="gray.200" borderRadius="22px" bg="gray.50" p={4}>
              <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
                Choose source
              </Text>
              <SimpleGrid columns={1} gap={3} mt={3}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setBannerSource("unsplash")
                    setBannerUploadError("")
                    handleOpenUnsplashModal()
                  }}
                  borderRadius="18px"
                  h="auto"
                  minH="unset"
                  px={0}
                  py={0}
                  borderColor={bannerSource === "unsplash" ? "brand.300" : "gray.200"}
                  bg={bannerSource === "unsplash" ? "rgba(117,81,255,0.05)" : "white"}
                  boxShadow={bannerSource === "unsplash" ? "0 8px 24px rgba(66, 42, 251, 0.08)" : "0 8px 20px rgba(15, 23, 42, 0.04)"}
                  _hover={{
                    bg: bannerSource === "unsplash" ? "rgba(117,81,255,0.07)" : "gray.50",
                    borderColor: "brand.200",
                  }}
                >
                  <Box w="full" p={4} textAlign="left">
                    <Flex align="center" justify="space-between" gap={4}>
                      <Box minW={0}>
                        <Text fontSize="sm" fontWeight="800" color="gray.900">
                          Unsplash
                        </Text>
                        <Text mt={1} fontSize="xs" color="gray.600" lineHeight="1.5">
                          Search and pick a curated photo from the library.
                        </Text>
                      </Box>
                      <Flex
                        h="36px"
                        w="36px"
                        align="center"
                        justify="center"
                        borderRadius="full"
                        bg={bannerSource === "unsplash" ? "brand.500" : "gray.100"}
                        color={bannerSource === "unsplash" ? "white" : "gray.600"}
                        flexShrink={0}
                      >
                        <Search size={16} />
                      </Flex>
                    </Flex>
                  </Box>
                </Button>
              </SimpleGrid>
            </Box>

            <Box
              as="section"
              border="2px dashed"
              borderColor={isDragActive ? "brand.300" : "gray.200"}
              bg={isDragActive ? "rgba(117,81,255,0.04)" : "white"}
              borderRadius="22px"
              minH="220px"
              p={5}
              cursor={updateMutation.isPending ? "not-allowed" : "pointer"}
              transition="all 0.15s ease"
              onDragEnter={(event) => {
                event.preventDefault()
                uploadDragDepthRef.current += 1
                setIsDragActive(true)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                if (!updateMutation.isPending) {
                  setIsDragActive(true)
                }
              }}
              onDragLeave={(event) => {
                event.preventDefault()
                uploadDragDepthRef.current = Math.max(0, uploadDragDepthRef.current - 1)
                if (uploadDragDepthRef.current === 0) {
                  setIsDragActive(false)
                }
              }}
              onDrop={(event) => {
                event.preventDefault()
                uploadDragDepthRef.current = 0
                setIsDragActive(false)
                handleUploadFiles(event.dataTransfer.files)
              }}
            >
              <Stack gap={3} align="center" textAlign="center" justify="center" h="full">
                <Flex
                  h="56px"
                  w="56px"
                  align="center"
                  justify="center"
                  borderRadius="full"
                  bg="white"
                  border="1px solid"
                  borderColor="gray.200"
                  boxShadow="0 8px 18px rgba(15, 23, 42, 0.05)"
                  color="brand.500"
                >
                  <ImagePlus size={22} />
                </Flex>
                <Box>
                  <Text fontSize="sm" fontWeight="800" color="gray.900">
                    {isDragActive ? "Drop the image here" : "Drop or browse to upload"}
                  </Text>
                  <Text mt={1} fontSize="sm" color="gray.600" lineHeight="1.6">
                    {isDragActive
                      ? "Release the file to stage it for saving."
                      : "Drag an image from your device, or click to open the file picker."}
                  </Text>
                </Box>
                <Button
                  type="button"
                  variant="outline"
                  borderRadius="full"
                  h="40px"
                  px={4}
                  colorPalette="gray"
                  onClick={handleUploadCardClick}
                >
                  <Flex align="center" gap={2}>
                    <Upload size={16} />
                    <Text as="span">Choose image</Text>
                  </Flex>
                </Button>
                <Text fontSize="xs" color="gray.500">
                  Accepts JPG, PNG, WEBP
                </Text>
              </Stack>
            </Box>

            <Input
              ref={uploadInputRef}
              id="session-banner-upload"
              type="file"
              accept="image/*"
              disabled={updateMutation.isPending}
              onChange={(event) => {
                handleUploadFiles(event.target.files)
                event.currentTarget.value = ""
              }}
              hidden
            />

            {hasStagedBanner ? (
              <Flex align="center" justify="space-between" gap={3} wrap="wrap">
                <Text fontSize="sm" color="gray.700" fontWeight="700">
                  {draftBannerFile?.name}
                </Text>
                <Button
                  variant="outline"
                  borderRadius="full"
                  h="38px"
                  px={4}
                  colorPalette="red"
                  onClick={() => clearBannerDraft(false)}
                >
                  <Flex align="center" gap={2}>
                    <Trash2 size={15} />
                    <Text as="span">Remove selection</Text>
                  </Flex>
                </Button>
              </Flex>
            ) : null}

            {bannerUploadError ? (
              <Text fontSize="sm" color="red.500">
                {bannerUploadError}
              </Text>
            ) : null}

            {bannerSource === "unsplash" ? (
              <Text fontSize="xs" color="gray.500">
                Open the Unsplash library to search and select a photo.
              </Text>
            ) : null}
          </Stack>

          <Stack
            gap={4}
            border="1px solid"
            borderColor="gray.200"
            borderRadius="24px"
            bg="white"
            boxShadow="0 10px 28px rgba(15, 23, 42, 0.05)"
            p={{ base: 4, md: 5 }}
          >
            <Flex align="flex-start" justify="space-between" gap={3} wrap="wrap">
              <Box>
                <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
                  Current banner preview
                </Text>
                <Text mt={2} fontSize="sm" fontWeight="700" color="gray.900">
                  {previewBannerUrl ? "Selected banner image" : "No banner selected yet"}
                </Text>
                <Text mt={1} fontSize="sm" color="gray.600" lineHeight="1.6">
                  {previewBannerUrl
                    ? "This is the banner that will be used when you continue."
                    : "You can leave this step empty and return later when the image is ready."}
                </Text>
              </Box>

              {previewBannerUrl ? (
                <Badge
                  variant="subtle"
                  colorPalette={clearRequested ? "orange" : "brand"}
                  borderRadius="999px"
                  px={3}
                  py={1}
                >
                  <Flex align="center" gap={1.5}>
                    <FileImage size={14} />
                    <Text as="span" fontSize="xs" fontWeight="800">
                      {clearRequested ? "Marked for removal" : hasStagedBanner ? "New upload" : "Stored image"}
                    </Text>
                  </Flex>
                </Badge>
              ) : null}
            </Flex>

            <Box
              border="1px solid"
              borderColor="gray.200"
              bg="gray.50"
              borderRadius="22px"
              overflow="hidden"
              minH="300px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {previewBannerUrl ? (
                <Image
                  src={previewBannerUrl}
                  alt="Session banner preview"
                  w="full"
                  h="full"
                  maxH="420px"
                  objectFit="contain"
                />
              ) : (
                <Stack gap={2} align="center" textAlign="center" px={6}>
                  <Flex
                    h="56px"
                    w="56px"
                    align="center"
                    justify="center"
                    borderRadius="full"
                    bg="white"
                    border="1px solid"
                    borderColor="gray.200"
                    color="gray.500"
                  >
                    <FileImage size={22} />
                  </Flex>
                  <Text fontSize="sm" fontWeight="800" color="gray.800">
                    Nothing selected yet
                  </Text>
                  <Text fontSize="sm" color="gray.600" lineHeight="1.6" maxW="sm">
                    Pick an image from the left or skip this step for now.
                  </Text>
                </Stack>
              )}
            </Box>

            <Flex align="center" justify="space-between" gap={3} wrap="wrap">
              <Text fontSize="sm" color="gray.600">
                {previewBannerUrl ? "Replace or remove the image before saving." : "Use Skip if you want to continue without a banner."}
              </Text>

              <Flex gap={3} wrap="wrap" ml="auto">
                <Button
                  variant="outline"
                  borderRadius="14px"
                  h="40px"
                  px={4}
                  colorPalette="gray"
                  onClick={handleReplaceBanner}
                >
                  <Flex align="center" gap={2}>
                    <RefreshCcw size={15} />
                    <Text as="span">Replace</Text>
                  </Flex>
                </Button>
                <Button
                  variant="outline"
                  borderRadius="14px"
                  h="40px"
                  px={4}
                  colorPalette="red"
                  disabled={!previewBannerUrl}
                  onClick={() => clearBannerDraft(true)}
                >
                  <Flex align="center" gap={2}>
                    <Trash2 size={15} />
                    <Text as="span">Remove</Text>
                  </Flex>
                </Button>
              </Flex>
            </Flex>

            {selectedUnsplashPhoto ? (
              <Text fontSize="xs" color="gray.500">
                Selected from Unsplash by {selectedUnsplashPhoto.photographerName}
              </Text>
            ) : null}
          </Stack>
        </SimpleGrid>
      )}

      {bannerQuery.isError ? (
        <Text fontSize="sm" color="red.500">
          {extractApiError(bannerQueryError)}
        </Text>
      ) : null}

      {updateMutation.isError ? (
        <Text fontSize="sm" color="red.500">
          {extractApiError(updateMutationError)}
        </Text>
      ) : null}

      <Dialog.Root
        open={isUnsplashModalOpen}
        onOpenChange={(details) => {
          setIsUnsplashModalOpen(details.open)
        }}
        size="xl"
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            maxW={{ base: "100vw", md: "1200px" }}
            maxH={{ base: "100dvh", md: "90vh" }}
            m={{ base: 0, md: "auto" }}
            overflow="hidden"
            display="flex"
            flexDirection="column"
          >
            <Box px={6} pt={6} pb={4} borderBottom="1px solid" borderColor="gray.200">
              <Flex align="flex-start" justify="space-between" gap={4}>
                <Box minW={0}>
                  <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
                    Unsplash library
                  </Text>
                  <Text mt={2} fontSize="lg" fontWeight="800" color="gray.900">
                    Browse and choose a banner image
                  </Text>
                  <Text mt={1} fontSize="sm" color="gray.600" lineHeight="1.6">
                    Search, filter, and select an image without leaving the wizard.
                  </Text>
                </Box>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close Unsplash library" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={6} py={5} overflowY="auto">
              <Stack gap={4}>
                <Flex gap={3} align={{ base: "stretch", md: "flex-end" }} direction={{ base: "column", md: "row" }}>
                  <Box flex="1">
                    <Text fontSize="sm" fontWeight="700" color="gray.700" mb={2}>
                      Search
                    </Text>
                    <Box position="relative">
                      <Input
                        ref={unsplashQueryInputRef}
                        value={unsplashQuery}
                        onChange={(event) => {
                          const nextQuery = event.target.value
                          setActiveUnsplashGenreUniqueId(null)

                          if (!nextQuery.trim()) {
                            clearUnsplashSearchResults()
                            return
                          }

                          setUnsplashQuery(nextQuery)
                        }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          void searchUnsplash()
                        }
                      }}
                      placeholder="Search Unsplash photos"
                      border="1px solid"
                      borderColor="gray.300"
                      borderRadius="14px"
                      h="44px"
                      px={4}
                      pe={12}
                      w="full"
                      _focusVisible={{
                        borderColor: "brand.400",
                        boxShadow: "0 0 0 3px rgba(117, 81, 255, 0.15)",
                        outline: "none",
                      }}
                      />
                      {unsplashQuery ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          position="absolute"
                          right="8px"
                          top="50%"
                          transform="translateY(-50%)"
                          minW="32px"
                          h="32px"
                          px={0}
                          borderRadius="full"
                          colorPalette="gray"
                          onClick={clearUnsplashSearch}
                          aria-label="Clear search"
                        >
                          <X size={14} />
                        </Button>
                      ) : null}
                    </Box>
                  </Box>

                  <Button
                    type="button"
                    borderRadius="14px"
                    h="44px"
                    px={5}
                    color="white"
                    style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                    onClick={() => void searchUnsplash()}
                    loading={isSearchingUnsplash}
                    disabled={isSearchingUnsplash || isPreparingUnsplashSelection}
                  >
                    <Flex align="center" gap={2}>
                      <Search size={16} />
                      <Text as="span">{isSearchingUnsplash ? "Searching..." : "Search"}</Text>
                    </Flex>
                  </Button>
                </Flex>

                {selectedGenres.length > 0 ? (
                  <Box>
                    <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
                      Selected genres
                    </Text>
                    <Flex wrap="wrap" gap={2} mt={2}>
                      {selectedGenres.map((genre) => (
                        <Button
                          key={genre.uniqueId}
                          type="button"
                          variant={activeUnsplashGenreUniqueId === genre.uniqueId ? "solid" : "subtle"}
                          borderRadius="999px"
                          h="38px"
                          px={4}
                          colorPalette={activeUnsplashGenreUniqueId === genre.uniqueId ? "brand" : genre.isSystem ? "gray" : "brand"}
                          bg={activeUnsplashGenreUniqueId === genre.uniqueId ? "brand.500" : undefined}
                          color={activeUnsplashGenreUniqueId === genre.uniqueId ? "white" : undefined}
                          onClick={() => {
                            setActiveUnsplashGenreUniqueId(genre.uniqueId)
                            setUnsplashQuery(genre.name)
                            void searchUnsplash(genre.name, undefined, { suppressNextDebounce: true })
                          }}
                        >
                          {genre.name}
                        </Button>
                      ))}
                    </Flex>
                  </Box>
                ) : null}

                <Box>
                  <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
                    Orientation
                  </Text>
                  <SimpleGrid columns={{ base: 2, md: 4 }} gap={2} mt={2}>
                    {UNSPLASH_ORIENTATION_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant="outline"
                        borderRadius="full"
                        h="40px"
                        px={4}
                        colorPalette={unsplashOrientation === option.value ? "brand" : "gray"}
                        bg={unsplashOrientation === option.value ? "rgba(117,81,255,0.05)" : "white"}
                        onClick={() => {
                          setUnsplashOrientation(option.value)
                          void searchUnsplash(undefined, option.value, { suppressNextDebounce: true })
                        }}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </SimpleGrid>
                </Box>

                {unsplashSearchError ? (
                  <Text fontSize="sm" color="red.500">
                    {unsplashSearchError}
                  </Text>
                ) : null}

                {bannerUploadError ? (
                  <Text fontSize="sm" color="red.500">
                    {bannerUploadError}
                  </Text>
                ) : null}

                <Box minH="0" flex="1">
                  {hasUnsplashResults ? (
                    <Stack gap={4}>
                      <Text fontSize="sm" color="gray.600">
                        Showing {unsplashResults.length}
                        {unsplashTotalResults > 0 ? ` of ${unsplashTotalResults}` : ""} results for{" "}
                        <Text as="span" fontWeight="700" color="gray.800">
                          {unsplashQuery.trim()}
                        </Text>
                      </Text>

                      <SimpleGrid columns={{ base: 1, sm: 2, xl: 3 }} gap={4}>
                        {unsplashResults.map((photo) => (
                          <UnsplashPhotoCard
                            key={photo.id}
                            photo={photo}
                            onUse={selectUnsplashPhoto}
                            disabled={isPreparingUnsplashSelection}
                          />
                        ))}
                      </SimpleGrid>

                      <Flex justify="center">
                        {hasMoreUnsplashResults ? (
                          <Button
                            type="button"
                            variant="outline"
                            borderRadius="14px"
                            h="44px"
                            px={5}
                            colorPalette="gray"
                            onClick={() => void loadMoreUnsplash()}
                            loading={isLoadingMoreUnsplash}
                            disabled={isSearchingUnsplash || isLoadingMoreUnsplash}
                          >
                            {isLoadingMoreUnsplash ? "Loading more..." : "Load more"}
                          </Button>
                        ) : (
                          <Text fontSize="sm" color="gray.500">
                            You’ve reached the end of the results for this search.
                          </Text>
                        )}
                      </Flex>
                    </Stack>
                  ) : (
                    <Box
                      border="1px dashed"
                      borderColor="gray.200"
                      borderRadius="20px"
                      bg="gray.50"
                      px={5}
                      py={10}
                      textAlign="center"
                    >
                      <Text fontSize="sm" fontWeight="700" color="gray.800">
                        Search for a photo to see Unsplash results here.
                      </Text>
                      <Text mt={1} fontSize="sm" color="gray.600">
                        You can search by keywords and adjust orientation before selecting a banner image.
                      </Text>
                    </Box>
                  )}
                </Box>
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Stack>
  )
}
