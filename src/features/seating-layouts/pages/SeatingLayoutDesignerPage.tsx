import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import type { Region } from "@seatsio/seatsio-types"
import { SeatsioDesigner } from "@seatsio/seatsio-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { useNavigate } from "react-router-dom"
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
  Spinner,
  SimpleGrid,
  Stack,
  Text,
  VStack,
  Tooltip,
} from "@chakra-ui/react"
import { ArrowLeft, LayoutGrid, Plus, Sparkles } from "lucide-react"
import { StyledSelect } from "@/components/common"
import { APP_ROUTES } from "@/utils/routes"
import { extractApiError } from "@/utils/errors"
import { createOrganizerVenue } from "@/api/organizer"
import { createSeatsIoWorkspace, type SeatsIoWorkspace } from "@/api/seatsio"
import { useSeatingLayoutVenues } from "../hooks/useSeatingLayoutVenues"
import { useSeatingLayoutWorkspace } from "../hooks/useSeatingLayoutWorkspace"
import { useSaveSeatsIoSeatingLayout } from "../hooks/useSaveSeatsIoSeatingLayout"
import { seatingLayoutDesignerSchema, type SeatingLayoutDesignerValues } from "../schemas/seatingLayout.schemas"

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

export function SeatingLayoutDesignerPage() {
  const navigate = useNavigate()
  const workspaceQuery = useSeatingLayoutWorkspace()
  const saveLayoutMutation = useSaveSeatsIoSeatingLayout()
  const venuesQuery = useSeatingLayoutVenues()
  const autoCreateRequestedRef = useRef(false)
  const savedChartKeyRef = useRef<string | null>(null)
  const [workspaceOverride, setWorkspaceOverride] = useState<SeatsIoWorkspace | null>(null)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [designerError, setDesignerError] = useState<string | null>(null)
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false)
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
  const venueUniqueIdValue = useWatch({ control, name: "venueUniqueId" })
  const trimmedVenueUniqueId = venueUniqueIdValue.trim()
  const trimmedName = nameValue.trim()
  const hasLayoutDetails = Boolean(trimmedVenueUniqueId && trimmedName)

  const venueOptions = useMemo(
    () =>
      venuesQuery.venues.map((venue) => ({
        label: venue.name,
        value: venue.uniqueId,
      })),
    [venuesQuery.venues]
  )

  const workspace = workspaceOverride ?? workspaceQuery.data ?? null
  const isWorkspaceReady = Boolean(workspace?.secretKey && workspace?.region)

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

  async function handleSaveChart(chartKey: string) {
    if (!trimmedVenueUniqueId || !trimmedName || savedChartKeyRef.current === chartKey) {
      return
    }

    savedChartKeyRef.current = chartKey
    setDesignerError(null)

    try {
      await saveLayoutMutation.mutateAsync({
        venueUniqueId: trimmedVenueUniqueId,
        name: trimmedName,
        seatsIoChartKey: chartKey,
      })
      navigate(APP_ROUTES.seatingLayouts.list)
    } catch (error) {
      setDesignerError(error instanceof Error ? error.message : "Failed to save chart layout.")
      savedChartKeyRef.current = null
    }
  }

  const canRenderDesigner = Boolean(hasLayoutDetails && isWorkspaceReady)

  return (
    <Box w="full">
      <Flex align="center" justify="space-between" gap={4} mb={6} wrap="wrap">
        <Box>
          <Badge colorPalette="purple" borderRadius="999px" px={3} py={1} mb={3}>
            Seats.io builder
          </Badge>
          <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em">
            Create seating layout
          </Heading>
          <Text mt={2} color="gray.600" fontSize={{ base: "sm", md: "md" }}>
            Choose a venue and layout name. Once the workspace credentials are ready, the Seats.io designer opens automatically.
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
            <Field.Root invalid={!!errors.venueUniqueId}>
              <Flex align="center" justify="space-between" gap={3} mb={2}>
                <Field.Label mb={0}>Venue</Field.Label>
                <Tooltip.Root openDelay={300} closeDelay={100}>
                  <Tooltip.Trigger asChild>
                    <Button
                      variant="outline"
                      aria-label="Add venue"
                      borderRadius="999px"
                      h="44px"
                      w="44px"
                      minW="44px"
                      p={0}
                      disabled={canRenderDesigner}
                      onClick={() => setIsVenueDialogOpen(true)}
                    >
                      <Plus size={18} />
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Positioner>
                    <Tooltip.Content>Quick add venue</Tooltip.Content>
                  </Tooltip.Positioner>
                </Tooltip.Root>
              </Flex>
              <StyledSelect
                options={venueOptions}
                value={venueUniqueIdValue ?? ""}
                onChange={(value) => setValue("venueUniqueId", value, { shouldDirty: true, shouldValidate: true })}
                placeholder={venuesQuery.isLoading ? "Loading venues..." : "Select venue"}
                disabled={venuesQuery.isLoading || canRenderDesigner}
                size="md"
              />
              {errors.venueUniqueId && <Field.ErrorText>{errors.venueUniqueId.message}</Field.ErrorText>}
              {venuesQuery.isError ? (
                <Text mt={2} fontSize="sm" color="red.600">
                  {extractApiError(venuesQuery.error)}
                </Text>
              ) : null}
            </Field.Root>

            <Field.Root invalid={!!errors.name}>
              <Field.Label>Layout name</Field.Label>
              <Input
                {...register("name")}
                placeholder="Main hall seating plan"
                minH="11"
                borderRadius="14px"
                disabled={canRenderDesigner}
              />
              {errors.name && <Field.ErrorText>{errors.name.message}</Field.ErrorText>}
            </Field.Root>
          </SimpleGrid>

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

        </Box>

        <Box w="full">
          {!hasLayoutDetails ? (
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
                  Fill in the layout details to start shaping the chart
                </Heading>
                <Text color="gray.600" fontSize={{ base: "sm", md: "md" }}>
                  The designer opens automatically once a venue, layout name, and workspace credentials are available.
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
                    {trimmedName}
                  </Heading>
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
                    key={workspace?.id ?? "workspace"}
                    secretKey={workspace!.secretKey}
                    region={workspace!.region as Region}
                    onChartCreated={handleSaveChart}
                    onChartPublished={handleSaveChart}
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
