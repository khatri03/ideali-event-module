import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Badge, Box, Button, Flex, SimpleGrid, Skeleton, Stack, Text } from "@chakra-ui/react"
import { Check, Sparkles } from "lucide-react"
import { fetchSessionWizardGenres, updateSessionWizardGenres } from "@/api/sessions"
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

          <Badge variant="subtle" colorPalette="brand" borderRadius="999px" px={3} py={1} alignSelf="flex-start">
            <Flex align="center" gap={1.5}>
              <Check size={14} />
              <Text as="span" fontSize="xs" fontWeight="800">
                {selectedGenreCount}/5 selected
              </Text>
            </Flex>
          </Badge>
        </Flex>
      </Box>

      {genresQuery.isLoading ? (
        <SessionGenreSkeleton />
      ) : (
        <Stack gap={4}>
          <Text fontSize="sm" fontWeight="700" color="gray.700">
            Select genres
          </Text>

          <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} gap={3}>
            {currentGenres.map((genre) => {
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
    </Stack>
  )
}
