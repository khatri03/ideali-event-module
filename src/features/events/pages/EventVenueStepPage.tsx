import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Box, Button, CloseButton, Dialog, Flex, Input, Stack, Text, Tooltip } from "@chakra-ui/react"
import { Plus } from "lucide-react"
import { createOrganizerVenue } from "@/api/organizer"
import { StyledSelect } from "@/components/common/StyledSelect"
import { extractApiError } from "@/utils/errors"
import { useOrganizerVenues } from "../hooks/useOrganizerVenues"
import { useFormContext, useWatch } from "react-hook-form"
import type { EventWizardValues } from "../schemas/eventWizard.schemas"

export function EventVenueStepPage() {
  const { control, setValue } = useFormContext<EventWizardValues>()
  const venueUniqueId = useWatch({ control, name: "venueUniqueId" }) ?? ""
  const [isOpen, setIsOpen] = useState(false)
  const [venueName, setVenueName] = useState("")
  const [venueNameError, setVenueNameError] = useState("")
  const { venues, isLoading, refetch, isError, error } = useOrganizerVenues()

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
      setValue("venueUniqueId", createdVenue.uniqueId, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
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
              Venue
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
            value={venueUniqueId}
            onChange={(value) =>
              setValue("venueUniqueId", value, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              })
            }
            placeholder={isLoading ? "Loading venues..." : "Select venue"}
            disabled={isLoading || isError}
          />
        </Stack>

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
