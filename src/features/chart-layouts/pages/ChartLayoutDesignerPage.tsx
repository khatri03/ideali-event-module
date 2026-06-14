import { useEffect, useMemo, useRef, useState } from "react"
import type { Region } from "@seatsio/seatsio-types"
import { SeatsioDesigner } from "@seatsio/seatsio-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  Heading,
  Input,
  Skeleton,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { ArrowLeft, LayoutGrid, Sparkles } from "lucide-react"
import { StyledSelect } from "@/components/common"
import { APP_ROUTES } from "@/utils/routes"
import { extractApiError } from "@/utils/errors"
import { createSeatsIoWorkspace, type SeatsIoWorkspace } from "@/api/seatsio"
import { useChartLayoutVenues } from "../hooks/useChartLayoutVenues"
import { useSeatsIoWorkspace } from "../hooks/useSeatsIoWorkspace"
import { useSaveSeatsIoChartLayout } from "../hooks/useSaveSeatsIoChartLayout"
import { chartLayoutDesignerSchema, type ChartLayoutDesignerValues } from "../schemas/chartLayout.schemas"

function DesignerLoadingState() {
  return (
    <Box
      borderRadius="24px"
      border="1px solid"
      borderColor="border.subtle"
      bg="card.bg"
      p={6}
      minH={{ base: "60vh", lg: "800px" }}
    >
      <Skeleton height="26px" width="260px" mb={3} />
      <Skeleton height="16px" width="320px" mb={6} />
      <Skeleton borderRadius="20px" h={{ base: "52vh", lg: "680px" }} />
    </Box>
  )
}

export function ChartLayoutDesignerPage() {
  const navigate = useNavigate()
  const workspaceQuery = useSeatsIoWorkspace()
  const saveLayoutMutation = useSaveSeatsIoChartLayout()
  const venuesQuery = useChartLayoutVenues()
  const autoCreateRequestedRef = useRef(false)
  const submittedLayoutRef = useRef<ChartLayoutDesignerValues | null>(null)
  const savedChartKeyRef = useRef<string | null>(null)
  const [workspaceOverride, setWorkspaceOverride] = useState<SeatsIoWorkspace | null>(null)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [designerError, setDesignerError] = useState<string | null>(null)
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false)
  const [activeLayout, setActiveLayout] = useState<ChartLayoutDesignerValues | null>(null)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ChartLayoutDesignerValues>({
    resolver: zodResolver(chartLayoutDesignerSchema),
    defaultValues: {
      venueUniqueId: "",
      name: "",
      uniqueName: "",
    },
  })

  const nameValue = useWatch({ control, name: "name" })
  const uniqueNameValue = useWatch({ control, name: "uniqueName" })
  const venueUniqueIdValue = useWatch({ control, name: "venueUniqueId" })

  const venueOptions = useMemo(
    () =>
      venuesQuery.venues.map((venue) => ({
        label: venue.name,
        value: venue.uniqueId,
      })),
    [venuesQuery.venues]
  )

  useEffect(() => {
    if (nameValue && !uniqueNameValue) {
      const slug = nameValue
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
      setValue("uniqueName", slug, { shouldDirty: true, shouldValidate: true })
    }
  }, [nameValue, setValue, uniqueNameValue])

  useEffect(() => {
    async function ensureWorkspace() {
      if (!workspaceQuery.isSuccess || workspaceQuery.data || workspaceOverride || autoCreateRequestedRef.current) {
        return
      }

      autoCreateRequestedRef.current = true
      setIsCreatingWorkspace(true)
      setWorkspaceError(null)

      try {
        const workspace = await createSeatsIoWorkspace()
        setWorkspaceOverride(workspace)
      } catch (error) {
        setWorkspaceError(error instanceof Error ? error.message : "Failed to configure Seats.io workspace.")
      } finally {
        setIsCreatingWorkspace(false)
      }
    }

    void ensureWorkspace()
  }, [workspaceOverride, workspaceQuery.data, workspaceQuery.isSuccess])

  async function handleSaveChart(chartKey: string) {
    const layout = submittedLayoutRef.current
    if (!layout || savedChartKeyRef.current === chartKey) {
      return
    }

    savedChartKeyRef.current = chartKey
    setDesignerError(null)

    try {
      await saveLayoutMutation.mutateAsync({
        venueUniqueId: layout.venueUniqueId,
        name: layout.name,
        uniqueName: layout.uniqueName,
        seatsIoChartKey: chartKey,
      })
      navigate(APP_ROUTES.chartLayouts.list)
    } catch (error) {
      setDesignerError(error instanceof Error ? error.message : "Failed to save chart layout.")
      savedChartKeyRef.current = null
    }
  }

  async function onSubmit(values: ChartLayoutDesignerValues) {
    submittedLayoutRef.current = values
    setActiveLayout(values)
    savedChartKeyRef.current = null
  }

  const workspace = workspaceOverride ?? workspaceQuery.data ?? null
  const isWorkspaceReady = Boolean(workspace?.secretKey && workspace?.region)
  const canRenderDesigner = Boolean(activeLayout && isWorkspaceReady)

  return (
    <Box w="full">
      <Flex align="center" justify="space-between" gap={4} mb={6} wrap="wrap">
        <Box>
          <Badge colorPalette="purple" borderRadius="999px" px={3} py={1} mb={3}>
            Seats.io builder
          </Badge>
          <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em">
            Create chart layout
          </Heading>
          <Text mt={2} color="gray.600" fontSize={{ base: "sm", md: "md" }}>
            Choose a venue, open the Seats.io designer, and save the generated chart key back to the organizer workspace.
          </Text>
        </Box>

        <Button variant="outline" minH="11" px={5} onClick={() => navigate(APP_ROUTES.chartLayouts.list)}>
          <ArrowLeft size={16} />
          Back to layouts
        </Button>
      </Flex>

      <Flex direction={{ base: "column", lg: "row" }} gap={6} align="start">
        <Box
          flex={{ base: "1 1 auto", lg: "0 0 360px" }}
          w={{ base: "full", lg: "360px" }}
          borderRadius="24px"
          border="1px solid"
          borderColor="border.subtle"
          bg="card.bg"
          p={5}
          boxShadow="card"
        >
          <Flex align="center" gap={2} mb={5}>
            <LayoutGrid size={18} />
            <Text fontSize="lg" fontWeight="700">
              Layout details
            </Text>
          </Flex>

          <Box
            as="form"
            onSubmit={(event) => {
              event.preventDefault()
              void handleSubmit(onSubmit)(event)
            }}
          >
            <Field.Root mb={4} invalid={!!errors.venueUniqueId}>
              <Field.Label>Venue</Field.Label>
              <StyledSelect
                options={venueOptions}
                value={venueUniqueIdValue ?? ""}
                onChange={(value) => setValue("venueUniqueId", value, { shouldDirty: true, shouldValidate: true })}
                placeholder={venuesQuery.isLoading ? "Loading venues..." : "Select venue"}
                disabled={venuesQuery.isLoading}
                size="md"
              />
              {errors.venueUniqueId && (
                <Field.ErrorText>{errors.venueUniqueId.message}</Field.ErrorText>
              )}
              {venuesQuery.isError ? (
                <Text mt={2} fontSize="sm" color="red.600">
                  {extractApiError(venuesQuery.error)}
                </Text>
              ) : null}
            </Field.Root>

            <Field.Root mb={4} invalid={!!errors.name}>
              <Field.Label>Layout name</Field.Label>
              <Input
                {...register("name")}
                placeholder="Main hall seating plan"
                minH="11"
                borderRadius="14px"
              />
              {errors.name && <Field.ErrorText>{errors.name.message}</Field.ErrorText>}
            </Field.Root>

            <Field.Root mb={4} invalid={!!errors.uniqueName}>
              <Field.Label>Unique name</Field.Label>
              <Input
                {...register("uniqueName")}
                placeholder="main-hall-seating-plan"
                minH="11"
                borderRadius="14px"
              />
              {errors.uniqueName && <Field.ErrorText>{errors.uniqueName.message}</Field.ErrorText>}
            </Field.Root>

            <Button
              type="submit"
              w="full"
              minH="11"
              px={5}
              bg="linear-gradient(135deg, #7551FF 0%, #422AFB 100%)"
              color="white"
              loading={isSubmitting}
              loadingText="Preparing designer..."
            >
              Open designer
            </Button>
          </Box>

          {workspaceQuery.isLoading ? (
            <Text mt={4} fontSize="sm" color="gray.600">
              Checking workspace configuration...
            </Text>
          ) : null}

          {workspaceQuery.isError ? (
            <Box mt={4} p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
              <Text fontSize="sm" fontWeight="700" color="red.700">
                Workspace lookup failed
              </Text>
              <Text mt={1} fontSize="sm" color="red.600">
                {extractApiError(workspaceQuery.error)}
              </Text>
            </Box>
          ) : null}

          {isCreatingWorkspace ? (
            <Flex mt={4} align="center" gap={2} color="gray.600" fontSize="sm">
              <Spinner size="sm" />
              Configuring Seats.io workspace for this organizer.
            </Flex>
          ) : null}

          {workspaceError ? (
            <Box mt={4} p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
              <Text fontSize="sm" fontWeight="700" color="red.700">
                Workspace setup failed
              </Text>
              <Text mt={1} fontSize="sm" color="red.600">
                {workspaceError}
              </Text>
            </Box>
          ) : null}

          {workspace ? (
            <Box mt={4} p={4} borderRadius="16px" bg="app.bg" border="1px solid" borderColor="border.subtle">
              <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500" fontWeight="800">
                Workspace ready
              </Text>
              <Text mt={1} fontSize="sm" fontWeight="700">
                {workspace.name}
              </Text>
              <Text fontSize="xs" color="gray.600" wordBreak="break-all">
                {workspace.publicKey}
              </Text>
            </Box>
          ) : null}
        </Box>

        <Box flex={1} w="full">
          {!activeLayout ? (
            <Box
              borderRadius="24px"
              border="1px solid"
              borderColor="border.subtle"
              bg="card.bg"
              p={8}
              minH={{ base: "40vh", lg: "800px" }}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <VStack gap={3} textAlign="center" maxW="lg">
                <Sparkles size={28} />
                <Heading fontSize={{ base: "xl", md: "2xl" }} fontWeight="800">
                  Open the designer to start shaping the chart
                </Heading>
                <Text color="gray.600" fontSize={{ base: "sm", md: "md" }}>
                  Once you submit the layout details, we’ll load the Seats.io designer and save the chart key for you.
                </Text>
              </VStack>
            </Box>
          ) : !isWorkspaceReady ? (
            <DesignerLoadingState />
          ) : (
            <Box
              borderRadius="24px"
              border="1px solid"
              borderColor="border.subtle"
              bg="card.bg"
              p={4}
              boxShadow="card"
            >
              <Flex align="center" justify="space-between" gap={3} mb={4} wrap="wrap">
                <Box>
                  <Heading fontSize={{ base: "lg", md: "xl" }} fontWeight="800">
                    {activeLayout.name}
                  </Heading>
                  <Text fontSize="sm" color="gray.600">
                    Unique name: {activeLayout.uniqueName}
                  </Text>
                </Box>
                <Badge variant="subtle" colorPalette="purple">
                  Seats.io designer
                </Badge>
              </Flex>

              {designerError ? (
                <Box mb={4} p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
                  <Text fontSize="sm" fontWeight="700" color="red.700">
                    Designer save failed
                  </Text>
                  <Text mt={1} fontSize="sm" color="red.600">
                    {designerError}
                  </Text>
                </Box>
              ) : null}

              {canRenderDesigner ? (
                <Box h={{ base: "70vh", lg: "820px" }} w="full">
                  <SeatsioDesigner
                    key={`${activeLayout.uniqueName}-${workspace?.id ?? "workspace"}`}
                    secretKey={workspace!.secretKey}
                    region={workspace!.region as Region}
                    onChartCreated={handleSaveChart}
                    onChartPublished={handleSaveChart}
                    onExitRequested={() => navigate(APP_ROUTES.chartLayouts.list)}
                  />
                </Box>
              ) : (
                <DesignerLoadingState />
              )}
            </Box>
          )}
        </Box>
      </Flex>
    </Box>
  )
}
