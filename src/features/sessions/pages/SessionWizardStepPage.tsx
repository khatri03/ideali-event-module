import { useEffect, useState, type ReactNode } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
  Badge,
  Box,
  Button,
  CloseButton,
  Dialog,
  Flex,
  Input,
  Skeleton,
  Stack,
  Text,
  Tooltip,
} from "@chakra-ui/react"
import { Plus } from "lucide-react"
import { useParams } from "react-router-dom"
import { EventDescriptionEditor } from "@/features/events"
import { createOrganizerVenue, fetchOrganizerVenues, type OrganizerVenueOption } from "@/api/organizer"
import {
  fetchSessionWizardDescription,
  fetchSessionWizardName,
  fetchSessionWizardVenue,
  updateSessionWizardDescription,
  updateSessionWizardName,
  updateSessionWizardVenue,
} from "@/api/sessions"
import { StyledSelect } from "@/components/common/StyledSelect"
import { extractApiError } from "@/utils/errors"
import { useSessionWizardNavigation } from "../hooks/useSessionWizard"
import { useSessionWizardActions } from "../hooks/useSessionWizardActions"

export function SessionWizardStepPage() {
  const { activeStep } = useSessionWizardNavigation()
  const { sessionId } = useParams<{ sessionId?: string }>()

  if (!sessionId) {
    return <SessionStepPlaceholder label={activeStep?.label ?? "Session step"} />
  }

  if (activeStep?.slug === "description") {
    return <SessionDescriptionStep sessionId={sessionId} />
  }

  if (activeStep?.slug === "venue") {
    return <SessionVenueStep sessionId={sessionId} />
  }

  if (activeStep?.slug === "name" || !activeStep) {
    return <SessionNameStep sessionId={sessionId} />
  }

  return <SessionStepPlaceholder label={activeStep.label} />
}

function SessionStepShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={4}>
      <Badge borderRadius="999px" px={3} py={1} colorPalette="green" variant="subtle" alignSelf="flex-start">
        {label}
      </Badge>
      {children}
    </Stack>
  )
}

function SessionStepPlaceholder({ label }: { label: string }) {
  return (
    <SessionStepShell label={label}>
      <Text fontSize="lg" fontWeight="800" color="gray.900">
        {label}
      </Text>
      <Text fontSize="sm" color="gray.600">
        This step is scaffolded for now.
      </Text>
    </SessionStepShell>
  )
}

function LoadingState({ label }: { label: string }) {
  return (
    <Stack gap={4}>
      <Skeleton h="18px" w="120px" />
      <Skeleton h="52px" w="full" maxW="560px" borderRadius="12px" />
      <Skeleton h="18px" w="320px" />
      <Text fontSize="sm" color="gray.500">
        {label}
      </Text>
    </Stack>
  )
}

function SessionNameStep({ sessionId }: { sessionId: string }) {
  return <SessionNameEditor sessionId={sessionId} />
}

function SessionNameEditor({ sessionId }: { sessionId: string }) {
  const { setPrimaryAction } = useSessionWizardActions()
  const [error, setError] = useState("")
  const [draftName, setDraftName] = useState<string | null>(null)
  const [loadedName, setLoadedName] = useState("")
  const [loadError, setLoadError] = useState("")
  const displayedName = draftName ?? loadedName
  const isLoading = !loadedName && !loadError

  useEffect(() => {
    let isActive = true

    fetchSessionWizardName(sessionId)
      .then((result) => {
        if (!isActive) {
          return
        }

        setLoadedName(result.name)
      })
      .catch((fetchError: unknown) => {
        if (!isActive) {
          return
        }

        setLoadError(extractApiError(fetchError))
      })

    return () => {
      isActive = false
    }
  }, [sessionId])

  useEffect(() => {
    setPrimaryAction(async () => {
      const trimmedName = displayedName.trim()
      if (!trimmedName) {
        setError("Session name is required.")
        throw new Error("Session name is required.")
      }

      setError("")
      try {
        const result = await updateSessionWizardName(sessionId, { name: trimmedName })
        setDraftName(result.name)
      } catch (saveError: unknown) {
        setError(extractApiError(saveError))
        throw saveError
      }
    })

    return () => setPrimaryAction(null)
  }, [displayedName, sessionId, setPrimaryAction])

  if (isLoading) {
    return <LoadingState label="Loading the session name..." />
  }

  if (loadError) {
    return (
      <SessionStepShell label="Name">
        <Text fontSize="lg" fontWeight="800" color="gray.900">
          Name
        </Text>
        <Text fontSize="sm" color="red.500">
          {loadError}
        </Text>
      </SessionStepShell>
    )
  }

  return (
    <SessionStepShell label="Name">
      <Text fontSize="lg" fontWeight="800" color="gray.900">
        Name
      </Text>
      <Box>
        <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
          Session name
        </Text>
        <Input
          value={displayedName}
          onChange={(event) => {
            setDraftName(event.target.value)
            if (error) {
              setError("")
            }
          }}
          placeholder="Keynote, workshop, networking..."
          border="1px solid"
          borderColor="secondaryGray.100"
          borderRadius="14px"
          h="44px"
          px={4}
          w="full"
          maxW="560px"
          autoFocus
          _focusVisible={{
            borderColor: "brand.400",
            boxShadow: "0 0 0 3px rgba(117, 81, 255, 0.15)",
            outline: "none",
          }}
        />
        {error ? (
          <Text mt={2} fontSize="sm" color="red.500">
            {error}
          </Text>
        ) : null}
      </Box>
      <Text fontSize="sm" color="text.secondary">
        Keep it short and specific so the session is easy to recognize.
      </Text>
    </SessionStepShell>
  )
}

function SessionDescriptionStep({ sessionId }: { sessionId: string }) {
  const query = useQuery({
    queryKey: ["sessions", { sessionId, step: "description" }],
    queryFn: () => fetchSessionWizardDescription(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  if (query.isLoading) {
    return <LoadingState label="Loading the session description..." />
  }

  if (query.isError) {
    return (
      <SessionStepShell label="Description">
        <Text fontSize="lg" fontWeight="800" color="gray.900">
          Description
        </Text>
        <Text fontSize="sm" color="red.500">
          {extractApiError(query.error)}
        </Text>
      </SessionStepShell>
    )
  }

  return (
    <SessionDescriptionEditor
      key={`${sessionId}:${query.data?.description ?? ""}`}
      sessionId={sessionId}
      initialDescription={query.data?.description ?? ""}
    />
  )
}

function SessionDescriptionEditor({ sessionId, initialDescription }: { sessionId: string; initialDescription: string }) {
  const { setPrimaryAction } = useSessionWizardActions()
  const [description, setDescription] = useState(initialDescription)
  const [error, setError] = useState("")

  useEffect(() => {
    setPrimaryAction(async () => {
      setError("")
      try {
        const result = await updateSessionWizardDescription(sessionId, {
          description: description.trim() ? description.trim() : null,
        })
        setDescription(result.description ?? "")
      } catch (saveError: unknown) {
        setError(extractApiError(saveError))
        throw saveError
      }
    })

    return () => setPrimaryAction(null)
  }, [description, sessionId, setPrimaryAction])

  return (
    <SessionStepShell label="Description">
      <Text fontSize="lg" fontWeight="800" color="gray.900">
        Description
      </Text>
      <Box maxW="720px">
        <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
          Session description
        </Text>
        <EventDescriptionEditor
          value={description}
          onChange={(value) => {
            setDescription(value)
            if (error) {
              setError("")
            }
          }}
        />
        {error ? (
          <Text mt={2} fontSize="sm" color="red.500">
            {error}
          </Text>
        ) : null}
      </Box>
      <Text fontSize="sm" color="text.secondary">
        Optional. Keep it helpful and focused.
      </Text>
    </SessionStepShell>
  )
}

function SessionVenueStep({ sessionId }: { sessionId: string }) {
  const sessionVenueQuery = useQuery({
    queryKey: ["sessions", { sessionId, step: "venue" }],
    queryFn: () => fetchSessionWizardVenue(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  const venuesQuery = useQuery({
    queryKey: ["venues", { scope: "organizer" }],
    queryFn: fetchOrganizerVenues,
    retry: false,
  })

  if (sessionVenueQuery.isLoading || venuesQuery.isLoading) {
    return <LoadingState label="Loading the session venue..." />
  }

  if (sessionVenueQuery.isError) {
    return (
      <SessionStepShell label="Venue">
        <Text fontSize="lg" fontWeight="800" color="gray.900">
          Venue
        </Text>
        <Text fontSize="sm" color="red.500">
          {extractApiError(sessionVenueQuery.error)}
        </Text>
      </SessionStepShell>
    )
  }

  return (
    <SessionVenueEditor
      key={`${sessionId}:${sessionVenueQuery.data?.venueUniqueId ?? ""}`}
      sessionId={sessionId}
      initialVenueUniqueId={sessionVenueQuery.data?.venueUniqueId ?? ""}
      venues={venuesQuery.data ?? []}
      refetchVenues={venuesQuery.refetch}
      venuesError={venuesQuery.isError ? extractApiError(venuesQuery.error) : ""}
    />
  )
}

function SessionVenueEditor({
  sessionId,
  initialVenueUniqueId,
  venues,
  refetchVenues,
  venuesError,
}: {
  sessionId: string
  initialVenueUniqueId: string
  venues: OrganizerVenueOption[]
  refetchVenues: () => Promise<unknown>
  venuesError: string
}) {
  const { setPrimaryAction } = useSessionWizardActions()
  const [selectedVenueUniqueId, setSelectedVenueUniqueId] = useState(initialVenueUniqueId)
  const [isOpen, setIsOpen] = useState(false)
  const [venueName, setVenueName] = useState("")
  const [venueNameError, setVenueNameError] = useState("")
  const [venueError, setVenueError] = useState("")

  const saveMutation = useMutation({
    mutationFn: async (payload: { venueUniqueId: string }) => updateSessionWizardVenue(sessionId, payload),
  })

  const createVenueMutation = useMutation({
    mutationFn: createOrganizerVenue,
  })

  useEffect(() => {
    setPrimaryAction(async () => {
      setVenueError("")
      try {
        const result = await saveMutation.mutateAsync({ venueUniqueId: selectedVenueUniqueId })
        setSelectedVenueUniqueId(result.venueUniqueId)
      } catch (saveError: unknown) {
        setVenueError(extractApiError(saveError))
        throw saveError
      }
    })

    return () => setPrimaryAction(null)
  }, [selectedVenueUniqueId, saveMutation, setPrimaryAction])

  async function handleCreateVenue() {
    const trimmedName = venueName.trim()
    if (!trimmedName) {
      setVenueNameError("Venue name is required.")
      return
    }

    setVenueNameError("")
    try {
      const createdVenue = await createVenueMutation.mutateAsync({ name: trimmedName })
      await refetchVenues()
      setSelectedVenueUniqueId(createdVenue.uniqueId)
      setVenueName("")
      setIsOpen(false)
    } catch (createError: unknown) {
      setVenueNameError(extractApiError(createError))
    }
  }

  return (
    <SessionStepShell label="Venue">
      <Text fontSize="lg" fontWeight="800" color="gray.900">
        Venue
      </Text>
      <Stack gap={2} maxW="720px">
        <Flex align="center" justify="space-between" gap={3}>
          <Text fontSize="sm" fontWeight="600" color="navy.700">
            Session venue
          </Text>
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
                onClick={() => setIsOpen(true)}
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
          options={venues.map((venue) => ({
            label: venue.name,
            value: venue.uniqueId,
          }))}
          value={selectedVenueUniqueId}
          onChange={(value) => {
            setSelectedVenueUniqueId(value)
            if (venueError) {
              setVenueError("")
            }
          }}
          placeholder="Select venue"
          disabled={false}
        />
      </Stack>

      {venueError ? (
        <Text fontSize="sm" color="red.500">
          {venueError}
        </Text>
      ) : null}

      {venuesError ? (
        <Text fontSize="sm" color="red.500">
          {venuesError}
        </Text>
      ) : null}

      <Dialog.Root
        open={isOpen}
        onOpenChange={(details) => {
          setIsOpen(details.open)
          if (!details.open) {
            setVenueName("")
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
                    Choose from your saved venues.
                  </Text>
                </Box>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close venue modal" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={6} py={6} overflowY="auto">
              <Stack gap={4}>
                <Stack gap={2}>
                  <Text fontSize="sm" fontWeight="600" color="navy.700">
                    Venue
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Enter a venue name to add it to the list.
                  </Text>
                </Stack>

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
                    autoFocus
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
                    onClick={() => setIsOpen(false)}
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
    </SessionStepShell>
  )
}
