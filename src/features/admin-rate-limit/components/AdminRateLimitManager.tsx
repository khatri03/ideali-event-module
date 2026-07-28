import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Box, Button, Field, Input, SimpleGrid, SkeletonText, Stack, Text } from "@chakra-ui/react"
import { fetchRateLimitSettings, updateRateLimitSettings } from "@/api/adminRateLimit"
import { extractApiError } from "@/utils/errors"
import { toaster } from "@/lib/toaster"
import { rateLimitFormSchema, type RateLimitFormValues } from "../schemas/rateLimit.schemas"

const RATE_LIMIT_QUERY_KEY = ["admin", "rate-limit"]

export function AdminRateLimitManager() {
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({
    queryKey: RATE_LIMIT_QUERY_KEY,
    queryFn: fetchRateLimitSettings,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RateLimitFormValues>({
    resolver: zodResolver(rateLimitFormSchema),
    defaultValues: { permitLimit: 5, windowSeconds: 60 },
  })

  // Prefills once the current settings load — defaultValues only apply at mount, and the fetch is async.
  useEffect(() => {
    if (settingsQuery.data) {
      reset(settingsQuery.data)
    }
  }, [settingsQuery.data, reset])

  const updateMutation = useMutation({
    mutationFn: updateRateLimitSettings,
    onSuccess: () => {
      toaster.create({ type: "success", title: "Rate limit settings updated." })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: RATE_LIMIT_QUERY_KEY })
    },
  })

  function handleSave(values: RateLimitFormValues) {
    updateMutation.mutate(values)
  }

  if (settingsQuery.isError) {
    return (
      <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
        <Text fontSize="sm" fontWeight="700" color="red.700">
          {extractApiError(settingsQuery.error)}
        </Text>
      </Box>
    )
  }

  return (
    <Box
      as="form"
      onSubmit={handleSubmit(handleSave)}
      borderRadius="20px"
      border="1px solid"
      borderColor="border.subtle"
      bg="card.bg"
      boxShadow="card"
      p={{ base: 4, md: 6 }}
    >
      {settingsQuery.isLoading ? (
        <SkeletonText noOfLines={4} />
      ) : (
        <Stack gap={5}>
          <Text fontSize="sm" color="text.secondary">
            Applies to login, refresh-token, and 2FA verification — requests per IP over the window below are
            rejected with 429 until the window resets. Takes effect immediately, no redeploy needed.
          </Text>

          <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
            <Field.Root invalid={Boolean(errors.permitLimit)}>
              <Field.Label fontWeight="700">Requests per window</Field.Label>
              <Input
                {...register("permitLimit", { valueAsNumber: true })}
                type="number"
                min={1}
                max={1000}
                minH="11"
                borderRadius="14px"
                px={4}
              />
              {errors.permitLimit ? <Field.ErrorText>{errors.permitLimit.message}</Field.ErrorText> : null}
            </Field.Root>

            <Field.Root invalid={Boolean(errors.windowSeconds)}>
              <Field.Label fontWeight="700">Window (seconds)</Field.Label>
              <Input
                {...register("windowSeconds", { valueAsNumber: true })}
                type="number"
                min={1}
                max={3600}
                minH="11"
                borderRadius="14px"
                px={4}
              />
              {errors.windowSeconds ? <Field.ErrorText>{errors.windowSeconds.message}</Field.ErrorText> : null}
            </Field.Root>
          </SimpleGrid>

          <Box>
            <Button
              type="submit"
              borderRadius="14px"
              h="44px"
              px={7}
              w={{ base: "full", md: "auto" }}
              color="white"
              cursor="pointer"
              loading={updateMutation.isPending}
              loadingText="Saving..."
              disabled={updateMutation.isPending}
              style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
            >
              Save changes
            </Button>
          </Box>
        </Stack>
      )}
    </Box>
  )
}
