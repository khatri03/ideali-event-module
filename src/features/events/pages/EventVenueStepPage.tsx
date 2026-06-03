import { useMemo, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Box, Button, CloseButton, Dialog, Flex, Input, Stack, Text } from "@chakra-ui/react"
import { Plus } from "lucide-react"
import { createOrganizerVenue } from "@/api/organizer"
import { StyledSelect } from "@/components/common/StyledSelect"
import { extractApiError } from "@/utils/errors"
import { useOrganizerVenues } from "../hooks/useOrganizerVenues"

export function EventVenueStepPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedVenueId, setSelectedVenueId] = useState("")
  const [venueName, setVenueName] = useState("")
  const [venueNameError, setVenueNameError] = useState("")
  const { venues, isLoading, refetch, isError, error } = useOrganizerVenues()

  const venueOptions = useMemo(() => venues, [venues])

  const createVenueMutation = useMutation({
    mutationFn: createOrganizerVenue,
  })

  async function handleSave() {
    const trimmedName = venueName.trim()
    if (!trimmedName) {
      setVenueNameError("Venue name is required.")
      return
    }

    setVenueNameError("")
    try {
      const createdVenue = await createVenueMutation.mutateAsync({ name: trimmedName })
      await refetch()
      setSelectedVenueId(createdVenue.uniqueId)
      setVenueName("")
      setIsOpen(false)
    } catch (error: unknown) {
      setVenueNameError(extractApiError(error))
    }
  }

  return (
    <Stack h="full" gap={4}>
      <Stack flex="1" gap={4}>
        <Text fontSize="sm" fontWeight="700" color="text.primary">
          Venue
        </Text>
        <Text fontSize="sm" color="text.secondary">
          Select an existing venue from the organizer list.
        </Text>

        <Stack gap={2}>
          <Flex align="center" justify="space-between" gap={3}>
            <Text fontSize="sm" fontWeight="600" color="navy.700">
              Venue <Text as="span" color="red.500" fontWeight="800" aria-hidden="true">*</Text>
            </Text>
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
          </Flex>

          <StyledSelect
            options={venueOptions.map((venue) => ({
              label: venue.name,
              value: venue.uniqueId,
            }))}
            value={selectedVenueId}
            onChange={setSelectedVenueId}
            placeholder={isLoading ? "Loading venues..." : "Select venue"}
            disabled={isLoading || isError}
          />
        </Stack>

        {selectedVenueId ? (
          <Box border="1px solid" borderColor="gray.200" borderRadius="16px" bg="white" px={4} py={3}>
            <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em" mb={1}>
              Selected venue
            </Text>
            <Text fontSize="sm" fontWeight="600" color="gray.800">
              {venueOptions.find((venue) => venue.uniqueId === selectedVenueId)?.name ?? "Selected venue"}
            </Text>
          </Box>
        ) : null}

        {isError ? (
          <Text fontSize="sm" color="red.500">
            {error || "Failed to load venues."}
          </Text>
        ) : null}
      </Stack>

      <Dialog.Root
        open={isOpen}
        onOpenChange={(details) => {
          setIsOpen(details.open)
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
                    Venue <Text as="span" color="red.500" fontWeight="800" aria-hidden="true">*</Text>
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
                      setIsOpen(false)
                    }}
                  >
                    Close
                  </Button>

                  <Button
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    minW={{ base: "full", md: "140px" }}
                    onClick={handleSave}
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
    </Stack>
  )
}
