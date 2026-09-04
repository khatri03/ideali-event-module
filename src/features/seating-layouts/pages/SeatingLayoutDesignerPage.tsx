import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import type { Region } from "@seatsio/seatsio-types"
import { SeatsioDesigner } from "@seatsio/seatsio-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { useNavigate, useParams } from "react-router-dom"
import {
  Badge,
  Box,
  Button,
  CloseButton,
  Dialog,
  Field,
  Flex,
  Heading,
  Input,
  Skeleton,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from "@chakra-ui/react"
import { ArrowLeft, LayoutGrid, Plus, Sparkles } from "lucide-react"
import { StyledSelect } from "@/components/common"
import { APP_ROUTES } from "@/utils/routes"
import { extractApiError } from "@/utils/errors"
import { toaster } from "@/lib/toaster"
import { createOrganizerVenue } from "@/api/organizer"
import { createSeatsIoWorkspace, type SeatsIoWorkspace } from "@/api/seatsio"
import { useSeatingLayoutVenues } from "../hooks/useSeatingLayoutVenues"
import { useSeatsIoSeatingLayoutDetail } from "../hooks/useSeatsIoSeatingLayoutDetail"
import { useSaveSeatsIoSeatingLayout } from "../hooks/useSaveSeatsIoSeatingLayout"
import { seatingLayoutDesignerSchema, type SeatingLayoutDesignerValues } from "../schemas/seatingLayout.schemas"
import { SeatsIoChartCategoriesCard } from "../components"

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

const SUPPORTED_SEATSIO_REGIONS = new Set<Region>(["eu", "na", "sa", "oc"])

export function SeatingLayoutDesignerPage() {
  const navigate = useNavigate()
  const params = useParams<{ chartUniqueId?: string }>()
  const routeChartUniqueId = params.chartUniqueId ?? ""
  const isEditRoute = Boolean(routeChartUniqueId)

  const saveLayoutMutation = useSaveSeatsIoSeatingLayout()
  const venuesQuery = useSeatingLayoutVenues()
  const layoutDetailQuery = useSeatsIoSeatingLayoutDetail(routeChartUniqueId, isEditRoute)
  const [layoutMode, setLayoutMode] = useState<"create" | "edit">(isEditRoute ? "edit" : "create")
  const [layoutChartKey, setLayoutChartKey] = useState<string | null>(null)
  const [designerWorkspace, setDesignerWorkspace] = useState<SeatsIoWorkspace | null>(null)
  const [isLoadingDesignerCredentials, setIsLoadingDesignerCredentials] = useState(false)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [designerError, setDesignerError] = useState<string | null>(null)
  const [isDesignerRendered, setIsDesignerRendered] = useState(false)
  const [designerRevision, setDesignerRevision] = useState(0)
  const [isVenueDialogOpen, setIsVenueDialogOpen] = useState(false)
  const [venueName, setVenueName] = useState("")
  const [venueNameError, setVenueNameError] = useState("")

  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useForm<SeatingLayoutDesignerValues>({
    resolver: zodResolver(seatingLayoutDesignerSchema),
    defaultValues: {
      venueUniqueId: "",
      name: "",
    },
  })

  const createVenueMutation = useMutation({
    mutationFn: createOrganizerVenue,
  })

  const nameValue = useWatch({ control, name: "name" })
  const venueUniqueIdValue = useWatch({ control, name: "venueUniqueId" }) ?? ""
  const trimmedVenueUniqueId = venueUniqueIdValue.trim()
  const trimmedName = nameValue.trim()
  const hasLayoutDetails = Boolean(trimmedName)

  const venueOptions = useMemo(
    () =>
      venuesQuery.venues.map((venue) => ({
        label: venue.name,
        value: venue.uniqueId,
      })),
    [venuesQuery.venues]
  )

  const workspace = designerWorkspace
  const isWorkspaceReady = Boolean(workspace?.secretKey && workspace?.region && layoutChartKey)
  const designerRegion = workspace?.region
  const hasSupportedRegion = Boolean(designerRegion && SUPPORTED_SEATSIO_REGIONS.has(designerRegion as Region))

  const [prevIsEditRoute, setPrevIsEditRoute] = useState(isEditRoute)
  if (isEditRoute !== prevIsEditRoute) {
    setPrevIsEditRoute(isEditRoute)
    setLayoutMode(isEditRoute ? "edit" : "create")
  }

  const [prevLayoutDetailData, setPrevLayoutDetailData] = useState(layoutDetailQuery.data)
  if (layoutDetailQuery.data !== prevLayoutDetailData) {
    setPrevLayoutDetailData(layoutDetailQuery.data)

    if (layoutDetailQuery.data) {
      setValue("venueUniqueId", layoutDetailQuery.data.venueUniqueId ?? "", {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      })
      setValue("name", layoutDetailQuery.data.name, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      })
      setLayoutChartKey(layoutDetailQuery.data.seatsIoChartKey)
    }
  }

  const isWorkspaceCreationInFlightRef = useRef(false)

  useEffect(() => {
    if (layoutMode !== "edit") {
      return
    }

    if (!layoutChartKey || designerWorkspace || isWorkspaceCreationInFlightRef.current || workspaceError) {
      return
    }

    isWorkspaceCreationInFlightRef.current = true

    void Promise.resolve()
      .then(() => {
        setIsLoadingDesignerCredentials(true)
        setIsDesignerRendered(false)
        return createSeatsIoWorkspace()
      })
      .then((designerCredentials) => {
        setDesignerWorkspace(designerCredentials)
      })
      .catch((error) => {
        setWorkspaceError(error instanceof Error ? error.message : "Failed to configure Seats.io workspace.")
      })
      .finally(() => {
        setIsLoadingDesignerCredentials(false)
        isWorkspaceCreationInFlightRef.current = false
      })
  }, [designerWorkspace, layoutChartKey, layoutMode, workspaceError])

  async function handleCreateVenue() {
    const trimmedName = venueName.trim()
    if (!trimmedName) {
      setVenueNameError("Venue name is required.")
      return
    }

    setVenueNameError("")

    try {
      const createdVenue = await createVenueMutation.mutateAsync({ name: trimmedName })
      await venuesQuery.refetch()
      setValue("venueUniqueId", createdVenue.uniqueId, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
      setVenueName("")
      setIsVenueDialogOpen(false)
    } catch (error) {
      setVenueNameError(extractApiError(error))
    }
  }

  async function handlePersistLayout() {
    if (!trimmedName) {
      return
    }

    setDesignerError(null)
    const currentChartKey = layoutChartKey?.trim()

    try {
      const savedLayout = await saveLayoutMutation.mutateAsync({
        venueUniqueId: trimmedVenueUniqueId || undefined,
        name: trimmedName,
        seatsIoChartKey: currentChartKey ?? undefined,
      })

      if (!savedLayout.seatsIoChartKey) {
        throw new Error("Seats.io chart key was not returned.")
      }

      setLayoutChartKey(savedLayout.seatsIoChartKey)

      if (layoutMode === "create") {
        setLayoutMode("edit")
        setIsLoadingDesignerCredentials(true)
        setWorkspaceError(null)
        setIsDesignerRendered(false)
        navigate(APP_ROUTES.seatingLayouts.edit(savedLayout.uniqueId), { replace: true })

        try {
          const designerCredentials = await createSeatsIoWorkspace()
          setDesignerWorkspace(designerCredentials)
        } catch (error) {
          setWorkspaceError(error instanceof Error ? error.message : "Failed to configure Seats.io workspace.")
        } finally {
          setIsLoadingDesignerCredentials(false)
        }
        return
      }

      // Only the name and venue were saved. Remounting the designer here would blank the canvas and drop any
      // drawing that has not been saved from the designer's own toolbar.
      toaster.create({ type: "success", title: "Layout details saved" })
    } catch (error) {
      setDesignerError(error instanceof Error ? error.message : "Failed to save chart layout.")
    }
  }

  const canRenderDesigner = Boolean(layoutMode === "edit" && isWorkspaceReady && hasSupportedRegion && layoutChartKey)
  const isCreateMode = layoutMode === "create"
  const chartUniqueId = routeChartUniqueId || layoutDetailQuery.data?.uniqueId || ""

  function handleCategoriesChanged() {
    setIsDesignerRendered(false)
    setDesignerRevision((current) => current + 1)
  }

  return (
    <Box w="full">
      <Flex align="center" justify="space-between" gap={4} mb={6} wrap="wrap">
        <Box>
          <Badge colorPalette="purple" borderRadius="999px" px={3} py={1} mb={3}>
            Seats.io builder
          </Badge>
          <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em">
            {isCreateMode ? "Create seating layout" : "Edit seating layout"}
          </Heading>
          <Text mt={2} color="gray.600" fontSize={{ base: "sm", md: "md" }}>
            {isCreateMode
              ? "Choose a layout name first. Venue is optional for now and can be mapped later when venues are ready."
              : "The name and venue save from here. The seating itself is saved from the designer's own toolbar."}
          </Text>
        </Box>

        <Button variant="outline" minH="11" px={5} onClick={() => navigate(APP_ROUTES.seatingLayouts.list)}>
          <ArrowLeft size={16} />
          Back to layouts
        </Button>
      </Flex>

      <Stack gap={6} align="stretch">
        <Box
          w="full"
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

          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <Field.Root invalid={!!errors.name}>
              <Field.Label>Name</Field.Label>
              <Input
                {...register("name")}
                placeholder="Main hall seating plan"
                minH="11"
                borderRadius="14px"
                px={4}
              />
              {errors.name && <Field.ErrorText>{errors.name.message}</Field.ErrorText>}
            </Field.Root>

            <Field.Root invalid={!!errors.venueUniqueId} w="full">
              <Flex align="center" justify="space-between" gap={3} mb={2} w="full">
                <Flex align="center" gap={2} minW={0}>
                  <Field.Label mb={0}>Venue</Field.Label>
                  <Tooltip.Root openDelay={300} closeDelay={100}>
                    <Tooltip.Trigger asChild>
                      <Button
                        variant="outline"
                        aria-label="Add venue"
                        borderRadius="999px"
                        h="32px"
                        w="32px"
                        minW="32px"
                        flexShrink={0}
                        p={0}
                        disabled={createVenueMutation.isPending}
                        onClick={() => setIsVenueDialogOpen(true)}
                      >
                        <Plus size={16} />
                      </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Positioner>
                      <Tooltip.Content>Quick add venue</Tooltip.Content>
                    </Tooltip.Positioner>
                  </Tooltip.Root>
                </Flex>
              </Flex>
              <Box w="full" minW={0}>
                <StyledSelect
                  options={venueOptions}
                  value={venueUniqueIdValue ?? ""}
                  onChange={(value) => {
                    setValue("venueUniqueId", value, { shouldDirty: true, shouldValidate: true })
                  }}
                  placeholder={venuesQuery.isLoading ? "Loading venues..." : "Select venue"}
                  disabled={venuesQuery.isLoading}
                  size="md"
                />
              </Box>
              {errors.venueUniqueId && <Field.ErrorText>{errors.venueUniqueId.message}</Field.ErrorText>}
              {venuesQuery.isError ? (
                <Text mt={2} fontSize="sm" color="red.600">
                  {extractApiError(venuesQuery.error)}
                </Text>
              ) : null}
            </Field.Root>
          </SimpleGrid>

          {isCreateMode ? (
            <Text mt={4} fontSize="sm" color="gray.600">
              Save the venue and name first to create the Seats.io chart.
            </Text>
          ) : null}

          <Flex mt={5} justify="flex-end" gap={3} wrap="wrap">
            <Button
              borderRadius="14px"
              minH="11"
              px={6}
              color="white"
              style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
              loading={saveLayoutMutation.isPending || isLoadingDesignerCredentials}
              onClick={handlePersistLayout}
              disabled={!hasLayoutDetails}
            >
              {isCreateMode ? "Create chart layout" : "Save details"}
            </Button>
          </Flex>

          {workspaceError ? (
            <Box mt={4} p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
              <Text fontSize="sm" fontWeight="700" color="red.700">
                Workspace setup failed
              </Text>
              <Text mt={1} fontSize="sm" color="red.600">
                {workspaceError}
              </Text>
              {layoutMode === "edit" ? (
                <Button
                  mt={3}
                  variant="outline"
                  colorPalette="red"
                  minH="11"
                  onClick={() => {
                    setWorkspaceError(null)
                    setIsLoadingDesignerCredentials(true)
                    setDesignerError(null)
                    void createSeatsIoWorkspace()
                      .then((credentials) => {
                        setDesignerWorkspace(credentials)
                      })
                      .catch((error) => {
                        setWorkspaceError(error instanceof Error ? error.message : "Failed to configure Seats.io workspace.")
                      })
                      .finally(() => {
                        setIsLoadingDesignerCredentials(false)
                      })
                  }}
                >
                  Retry setup
                </Button>
              ) : null}
            </Box>
          ) : null}

          {workspace && !hasSupportedRegion ? (
            <Box mt={4} p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
              <Text fontSize="sm" fontWeight="700" color="red.700">
                Unsupported Seats.io region
              </Text>
              <Text mt={1} fontSize="sm" color="red.600">
                The workspace returned "{designerRegion}" but Seats.io designer only accepts eu, na, sa, or oc.
              </Text>
            </Box>
          ) : null}

        </Box>

        <SeatsIoChartCategoriesCard
          chartUniqueId={chartUniqueId}
          chartName={trimmedName}
          isEnabled={layoutMode === "edit"}
          onCategoriesChanged={handleCategoriesChanged}
        />

        <Box w="full">
          {isCreateMode ? (
            <Box
              borderRadius="24px"
              border="1px solid"
              borderColor="border.subtle"
              bg="card.bg"
              p={6}
              boxShadow="card"
            >
              <Flex align="center" gap={2} mb={3}>
                <Sparkles size={18} />
                <Text fontSize="lg" fontWeight="700">
                  Chart designer will open after the first save
                </Text>
              </Flex>
              <Text fontSize="sm" color="gray.600" maxW="2xl">
                Provide a layout name first. Venue is optional and can be mapped later when venues are ready. We’ll switch this page into edit mode, fetch the Seats.io credentials from the backend, and render the designer using the saved chart name.
              </Text>
            </Box>
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
                    {trimmedName}
                  </Heading>
                </Box>
                <Badge variant="subtle" colorPalette="purple">
                  Edit mode
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

              {workspaceError ? (
                <Box mb={4} p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
                  <Text fontSize="sm" fontWeight="700" color="red.700">
                    Workspace setup failed
                  </Text>
                  <Text mt={1} fontSize="sm" color="red.600">
                    {workspaceError}
                  </Text>
                </Box>
              ) : null}

              {isLoadingDesignerCredentials ? (
                <DesignerLoadingState />
              ) : canRenderDesigner ? (
                <Box h={{ base: "70vh", lg: "820px" }} w="full">
                  <SeatsioDesigner
                    key={`${workspace?.id ?? "workspace"}:${layoutChartKey}:${designerRevision}`}
                    secretKey={workspace!.secretKey}
                    region={designerRegion as Region}
                    chartKey={layoutChartKey ?? undefined}
                    openLatestDrawing
                    onDesignerRendered={() => setIsDesignerRendered(true)}
                    onDesignerRenderingFailed={() => {
                      setDesignerError("Seats.io designer failed to render. Please verify the workspace secret key and region.")
                    }}
                    onExitRequested={() => navigate(APP_ROUTES.seatingLayouts.list)}
                  />
                </Box>
              ) : (
                <DesignerLoadingState />
              )}
            </Box>
          )}
        </Box>
      </Stack>

      {layoutMode === "edit" && isWorkspaceReady && !isDesignerRendered && !designerError ? (
        <Text mt={4} fontSize="sm" color="gray.600">
          Loading Seats.io designer...
        </Text>
      ) : null}

      <Dialog.Root
        open={isVenueDialogOpen}
        onOpenChange={(details) => {
          setIsVenueDialogOpen(details.open)
          if (!details.open) {
            setVenueNameError("")
          }
        }}
        size="lg"
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            maxW={{ base: "100vw", md: "560px" }}
            maxH={{ base: "100dvh", md: "90vh" }}
            m={{ base: 0, md: "auto" }}
            overflow="hidden"
            display="flex"
            flexDirection="column"
          >
            <Box px={6} pt={6} pb={4} borderBottom="1px solid" borderColor="gray.200">
              <Flex align="flex-start" justify="space-between" gap={4}>
                <Box>
                  <Text fontSize="lg" fontWeight="800" color="gray.900">
                    Add venue
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Create a new venue and auto-select it for the layout.
                  </Text>
                </Box>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close venue modal" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={6} py={6} overflowY="auto">
              <Stack gap={4}>
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
                    Venue name
                  </Text>
                  <Input
                    value={venueName}
                    onChange={(event) => {
                      setVenueName(event.target.value)
                      if (venueNameError) {
                        setVenueNameError("")
                      }
                    }}
                    placeholder="Main hall, rooftop, venue name..."
                    border="1px solid"
                    borderColor="secondaryGray.100"
                    borderRadius="14px"
                    h="44px"
                    px={4}
                    w="full"
                    _focusVisible={{
                      borderColor: "brand.400",
                      boxShadow: "0 0 0 3px rgba(117, 81, 255, 0.15)",
                      outline: "none",
                    }}
                  />
                  {venueNameError ? (
                    <Text mt={2} fontSize="sm" color="red.500">
                      {venueNameError}
                    </Text>
                  ) : null}
                </Box>

                <Flex
                  pt={5}
                  borderTop="1px solid"
                  borderColor="gray.200"
                  align="center"
                  justify="space-between"
                  gap={3}
                  flexWrap="wrap"
                >
                  <Button
                    variant="outline"
                    colorPalette="gray"
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    minW={{ base: "full", md: "140px" }}
                    _hover={{ bg: "gray.50", borderColor: "gray.300" }}
                    onClick={() => {
                      setIsVenueDialogOpen(false)
                    }}
                  >
                    Close
                  </Button>

                  <Button
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    minW={{ base: "full", md: "140px" }}
                    onClick={handleCreateVenue}
                    color="white"
                    style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                    loading={createVenueMutation.isPending}
                  >
                    Save
                  </Button>
                </Flex>
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  )
}
