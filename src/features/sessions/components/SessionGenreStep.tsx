import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Badge, Box, Button, CloseButton, Dialog, Flex, Input, SimpleGrid, Skeleton, Stack, Text } from "@chakra-ui/react"
import { Check, Plus, Sparkles } from "lucide-react"
import { createSessionWizardGenre, fetchSessionWizardGenres, updateSessionWizardGenres } from "@/api/sessions"
import { extractApiError } from "@/utils/errors"
import { useSessionWizardActions } from "../hooks/useSessionWizardActions"

interface SessionGenreStepProps {
  sessionId: string
}

function SessionGenreSkeleton() {
  return (
    <Stack gap={4}>
      <Skeleton height="74px" borderRadius="20px" />
      <Skeleton height="24px" width="160px" borderRadius="999px" />
      <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} gap={3}>
        {Array.from({ length: 10 }).map((_, index) => (
          <Skeleton key={index} height="40px" borderRadius="999px" />
        ))}
      </SimpleGrid>
    </Stack>
  )
}

export function SessionGenreStep({ sessionId }: SessionGenreStepProps) {
  const queryClient = useQueryClient()
  const { setPrimaryAction, setPrimaryActionReady } = useSessionWizardActions()
  const [draftGenreUniqueIds, setDraftGenreUniqueIds] = useState<string[] | null>(null)
  const [genreSearch, setGenreSearch] = useState("")
  const [isCreateGenreOpen, setIsCreateGenreOpen] = useState(false)
  const [createGenreName, setCreateGenreName] = useState("")

  const genresQuery = useQuery({
    queryKey: ["sessions", { sessionId, step: "genre" }],
    queryFn: () => fetchSessionWizardGenres(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  const currentGenres = genresQuery.data ?? []
  const currentSelectedGenreUniqueIds = useMemo(() => {
    if (draftGenreUniqueIds) {
      return draftGenreUniqueIds
    }

    return currentGenres.filter((genre) => genre.isSelected).map((genre) => genre.uniqueId)
  }, [currentGenres, draftGenreUniqueIds])

  const currentSelectedGenreUniqueIdSet = useMemo(() => new Set(currentSelectedGenreUniqueIds), [currentSelectedGenreUniqueIds])

  const selectedGenreCount = currentSelectedGenreUniqueIds.length
  const filteredGenres = useMemo(() => {
    const normalizedSearch = genreSearch.trim().toLowerCase()

    if (!normalizedSearch) {
      return currentGenres
    }

    return currentGenres.filter((genre) => genre.name.toLowerCase().includes(normalizedSearch))
  }, [currentGenres, genreSearch])

  const updateMutation = useMutation({
    mutationFn: (payload: { genreUniqueIds: string[] }) => updateSessionWizardGenres(sessionId, payload),
    onSuccess: async (data) => {
      setDraftGenreUniqueIds(null)
      queryClient.setQueryData(["sessions", { sessionId, step: "genre" }], data)
      queryClient.setQueryData(["sessions", "wizard-progress", sessionId], (current: { stepNo?: number } | undefined) => ({
        stepNo: Math.max(current?.stepNo ?? 0, 3),
      }))
      await queryClient.invalidateQueries({ queryKey: ["sessions", "review", sessionId] })
    },
    onSettled: () => {
      setPrimaryActionReady(true)
    },
  })

  const createGenreMutation = useMutation({
    mutationFn: (payload: { name: string }) => createSessionWizardGenre(sessionId, payload),
    onSuccess: (createdGenre) => {
      if (createdGenre.uniqueId && currentSelectedGenreUniqueIds.length < 5) {
        setDraftGenreUniqueIds((current) => {
          const nextSelected = new Set(
            current ?? currentGenres.filter((item) => item.isSelected).map((item) => item.uniqueId),
          )

          if (nextSelected.size < 5) {
            nextSelected.add(createdGenre.uniqueId)
          }

          return Array.from(nextSelected)
        })
      }

      setCreateGenreName("")
      setIsCreateGenreOpen(false)
    },
    onError: () => {},
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions", { sessionId, step: "genre" }] })
      await queryClient.invalidateQueries({ queryKey: ["sessions", "review", sessionId] })
    },
  })

  useEffect(() => {
    if (!genresQuery.isSuccess || !genresQuery.data) {
      setPrimaryAction(null)
      setPrimaryActionReady(false)
      return
    }

    setPrimaryAction(async () => {
      setPrimaryActionReady(false)
      await updateMutation.mutateAsync({
        genreUniqueIds: currentSelectedGenreUniqueIds,
      })
    })
    setPrimaryActionReady(true)

    return () => {
      setPrimaryAction(null)
      setPrimaryActionReady(true)
    }
  }, [
    currentSelectedGenreUniqueIds,
    genresQuery.data,
    genresQuery.isSuccess,
    setPrimaryAction,
    setPrimaryActionReady,
    updateMutation,
    updateMutation.mutateAsync,
  ])

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
              Genre
            </Text>
            <Text mt={2} fontSize={{ base: "sm", md: "md" }} fontWeight="700" color="gray.800">
              Choose up to 5 genres for this session. Organizer-defined genres appear first.
            </Text>
          </Box>

          <Flex align="center" gap={2} alignSelf="flex-start">
            <Badge variant="subtle" colorPalette="brand" borderRadius="999px" px={3} py={1}>
              <Flex align="center" gap={1.5}>
                <Check size={14} />
                <Text as="span" fontSize="xs" fontWeight="800">
                  {selectedGenreCount}/5 selected
                </Text>
              </Flex>
            </Badge>
          </Flex>
        </Flex>
      </Box>

      {genresQuery.isLoading ? (
        <SessionGenreSkeleton />
      ) : (
        <Stack gap={4}>
          <Flex align="center" justify="space-between" gap={3}>
            <Text fontSize="sm" fontWeight="700" color="gray.700">
              Select genres
            </Text>

            <Button
              type="button"
              aria-label="Add genre"
              variant="solid"
              colorPalette="brand"
              borderRadius="full"
              h="38px"
              w="38px"
              minW="38px"
              p={0}
              onClick={() => setIsCreateGenreOpen(true)}
            >
              <Plus size={16} />
            </Button>
          </Flex>

          <Input
            value={genreSearch}
            onChange={(event) => setGenreSearch(event.target.value)}
            placeholder="Search genres"
            borderRadius="14px"
            h="11"
            px={4}
            bg="white"
            borderColor="gray.200"
          />

          <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} gap={3}>
            {filteredGenres.map((genre) => {
              const isSelected = currentSelectedGenreUniqueIdSet.has(genre.uniqueId)
              const isDisabled = !isSelected && selectedGenreCount >= 5

              return (
                <Button
                  key={genre.uniqueId}
                  variant={isSelected ? "solid" : "outline"}
                  colorPalette={isSelected ? "brand" : "gray"}
                  borderRadius="999px"
                  h="42px"
                  px={4}
                  minW={0}
                  justifyContent="center"
                  whiteSpace="nowrap"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setDraftGenreUniqueIds((current) => {
                      const nextSelected = new Set(current ?? currentGenres.filter((item) => item.isSelected).map((item) => item.uniqueId))

                      if (nextSelected.has(genre.uniqueId)) {
                        nextSelected.delete(genre.uniqueId)
                      } else if (nextSelected.size < 5) {
                        nextSelected.add(genre.uniqueId)
                      }

                      return Array.from(nextSelected)
                    })
                  }}
                >
                  {genre.name}
                </Button>
              )
            })}
          </SimpleGrid>
        </Stack>
      )}

      {genresQuery.isError ? (
        <Text fontSize="sm" color="red.500">
          {extractApiError(genresQuery.error)}
        </Text>
      ) : null}

      {updateMutation.isError ? (
        <Text fontSize="sm" color="red.500">
          {extractApiError(updateMutation.error)}
        </Text>
      ) : null}

      {currentGenres.length > 0 ? (
        <Flex align="center" gap={2} color="gray.600" fontSize="sm">
          <Sparkles size={15} />
          <Text>
            Pick the genres that best describe this session. You can skip this step if none fit.
          </Text>
        </Flex>
      ) : null}

      <Dialog.Root
        open={isCreateGenreOpen}
        onOpenChange={(details) => {
          if (!details.open) {
            setIsCreateGenreOpen(false)
            setCreateGenreName("")
            createGenreMutation.reset()
            return
          }

          setIsCreateGenreOpen(true)
        }}
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            maxW={{ base: "100vw", md: "560px" }}
            m={{ base: 0, md: "auto" }}
            overflow="hidden"
          >
            <Box px={5} pt={5} pb={4} borderBottom="1px solid" borderColor="gray.200">
              <Flex align="flex-start" justify="space-between" gap={4}>
                <Box>
                  <Text fontSize="lg" fontWeight="900" color="gray.900" lineHeight="1.1">
                    Add Genre
                  </Text>
                  <Text mt={1} fontSize="sm" color="gray.600">
                    Keep it short and organizer-friendly.
                  </Text>
                </Box>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close genre dialog" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Box as="form" onSubmit={async (event) => {
              event.preventDefault()
              try {
                await createGenreMutation.mutateAsync({ name: createGenreName })
              } catch {
                // error displayed inline via createGenreMutation.isError
              }
            }} px={5} py={5}>
              <Stack gap={4}>
                <Box>
                  <Text fontSize="sm" fontWeight="700" color="gray.700" mb={2}>
                    Genre
                  </Text>
                  <Input
                    value={createGenreName}
                    onChange={(event) => setCreateGenreName(event.target.value)}
                    placeholder="e.g. Health"
                    borderRadius="14px"
                    h="11"
                    px={4}
                    bg="white"
                    borderColor="gray.200"
                    autoFocus
                  />
                </Box>

                {createGenreMutation.isError ? (
                  <Text fontSize="sm" color="red.500">
                    {extractApiError(createGenreMutation.error)}
                  </Text>
                ) : null}

                <Flex gap={3} justify="flex-end" flexWrap="wrap" pt={1}>
                  <Button
                    type="button"
                    variant="outline"
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    onClick={() => {
                      setIsCreateGenreOpen(false)
                      setCreateGenreName("")
                      createGenreMutation.reset()
                    }}
                  >
                    Close
                  </Button>
                  <Button
                    type="submit"
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    color="white"
                    style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                    loading={createGenreMutation.isPending}
                    loadingText="Saving..."
                    disabled={createGenreMutation.isPending || !createGenreName.trim()}
                  >
                    Save
                  </Button>
                </Flex>
              </Stack>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Stack>
  )
}
