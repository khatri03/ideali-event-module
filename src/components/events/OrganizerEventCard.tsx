import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Badge, Box, Button, CloseButton, Dialog, Flex, Menu, Portal, Stack, Text, useBreakpointValue } from "@chakra-ui/react"
import { CalendarDays, Check, ChevronRight, Copy, Eye, MapPin, MoreHorizontal, PencilLine, Users } from "lucide-react"
import { format } from "date-fns"
import { Link } from "react-router-dom"
import { updateEventWizardSetupState } from "@/api/events"
import type { OrganizerEventListItem } from "@/api/events"
import { APP_ROUTES } from "@/utils/routes"

const SETUP_STATE_LABELS: Record<string, string> = {
  InProgress: "In Progress",
  ReadyForReview: "Ready For Review",
  ReadyForSale: "Ready For Sale",
}

const SETUP_STATE_COLORS: Record<string, "gray" | "orange" | "green"> = {
  InProgress: "gray",
  ReadyForReview: "orange",
  ReadyForSale: "green",
}

function formatSetupState(setupState: string, isCancelled: boolean) {
  if (isCancelled) {
    return "Cancelled"
  }

  return SETUP_STATE_LABELS[setupState] ?? setupState.replace(/([a-z])([A-Z])/g, "$1 $2")
}

function normalizeSetupStateToken(value: string) {
  return value.replace(/[^a-z]/gi, "").toLowerCase()
}

const STATUS_TRANSITIONS = {
  online: {
    label: "Online",
    targetState: "ReadyForSale",
    title: "Set event online?",
    description: "This will confirm the event is ready for sale.",
    tone: "green" as const,
  },
  offline: {
    label: "Offline",
    targetState: "ReadyForReview",
    title: "Set event offline?",
    description: "This will move the event back to the review state.",
    tone: "orange" as const,
  },
}

type StatusTransitionKey = keyof typeof STATUS_TRANSITIONS

interface OrganizerEventCardProps {
  event: OrganizerEventListItem
}

export function OrganizerEventCard({ event }: OrganizerEventCardProps) {
  const queryClient = useQueryClient()
  const [isStatusPanelOpen, setIsStatusPanelOpen] = useState(false)
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false)
  const [pendingStatusAction, setPendingStatusAction] = useState<StatusTransitionKey | null>(null)
  const [isCopyToastVisible, setIsCopyToastVisible] = useState(false)
  const statusMenuPlacement = useBreakpointValue({ base: "bottom-start", sm: "right-start" }) ?? "right-start"
  const totalTickets = event.totalAvailableTickets + event.ticketsSold
  const soldPct = totalTickets > 0 ? Math.round((event.ticketsSold / totalTickets) * 100) : 0
  const statusLabel = formatSetupState(event.setupState, event.isCancelled)
  const statusColor = event.isCancelled ? "red" : SETUP_STATE_COLORS[event.setupState] ?? "gray"
  const startDate = event.startDate ? format(new Date(event.startDate), "MMM d, yyyy") : "Not set"
  const endDate = event.endDate ? format(new Date(event.endDate), "MMM d, yyyy") : "Not set"
  const normalizedSetupState = normalizeSetupStateToken(event.setupState)
  const canEdit = !event.isCancelled
  const canShowStatusActions =
    normalizedSetupState === "readyforreview" ||
    normalizedSetupState === "readyforsale" ||
    normalizedSetupState === "readytoreview"
  const isOnline = normalizedSetupState === "readyforsale"
  const isOffline = normalizedSetupState === "readyforreview" || normalizedSetupState === "readytoreview"
  const canViewRegistration = isOnline
  const pendingTransition = pendingStatusAction ? STATUS_TRANSITIONS[pendingStatusAction] : null
  const registrationUrl = new URL(APP_ROUTES.eventRegister(event.uniqueId), window.location.origin).toString()

  const statusMutation = useMutation({
    mutationFn: (setupState: string) => updateEventWizardSetupState(event.uniqueId, setupState),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events"] })
      setIsStatusConfirmOpen(false)
      setPendingStatusAction(null)
    },
  })

  function openStatusConfirmation(action: StatusTransitionKey) {
    setIsStatusPanelOpen(false)
    setPendingStatusAction(action)
    setIsStatusConfirmOpen(true)
  }

  function closeStatusConfirmation() {
    setIsStatusPanelOpen(false)
    setIsStatusConfirmOpen(false)
    setPendingStatusAction(null)
  }

  useEffect(() => {
    if (!isCopyToastVisible) {
      return
    }

    const timer = window.setTimeout(() => {
      setIsCopyToastVisible(false)
    }, 2200)

    return () => window.clearTimeout(timer)
  }, [isCopyToastVisible])

  async function handleCopyRegistrationUrl() {
    await navigator.clipboard.writeText(registrationUrl)
    setIsCopyToastVisible(true)
  }

  async function confirmStatusChange() {
    if (!pendingTransition) {
      return
    }

    await statusMutation.mutateAsync(pendingTransition.targetState)
  }

  return (
    <Box
      bg="card.bg"
      borderRadius="20px"
      overflow="hidden"
      boxShadow="card"
      border="1px solid"
      borderColor="border.subtle"
      transition="all 0.2s ease"
    >
      <Box
        h="8px"
        style={{ background: `linear-gradient(90deg, ${event.themeColor ?? "#7551FF"}, ${event.themeColor ?? "#7551FF"}aa)` }}
      />
      <Box p={5}>
        <Flex justify="space-between" align="flex-start" gap={3} mb={3}>
          <Badge
            colorPalette={statusColor}
            variant="subtle"
            borderRadius="full"
            px={3}
            py={1}
            fontSize="10px"
            fontWeight="800"
            textTransform="uppercase"
            letterSpacing="0.08em"
          >
            {statusLabel}
          </Badge>

          <Menu.Root
            positioning={{ placement: "bottom-end" }}
            onOpenChange={(details) => {
              if (!details.open) {
                setIsStatusPanelOpen(false)
              }
            }}
          >
            <Menu.Trigger asChild>
              <Box
                as="button"
                type="button"
                aria-label="Event actions"
                disabled={!canEdit && !canShowStatusActions}
                w="9"
                h="9"
                minW="9"
                minH="9"
                display="inline-flex"
                alignItems="center"
                justifyContent="center"
                border="1px solid"
                borderColor="border.subtle"
                borderRadius="full"
                bg="white"
                color="gray.500"
                p={0}
                _hover={{ bg: "gray.50", _dark: { bg: "navy.700" }, color: "brand.500" }}
                _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
              >
                <MoreHorizontal size={14} />
              </Box>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content
                  minW="14rem"
                  borderRadius="16px"
                  border="1px solid"
                  borderColor="gray.200"
                  boxShadow="0 16px 40px rgba(15, 23, 42, 0.12)"
                  p={1.5}
                  bg="white"
                  _dark={{ bg: "navy.800", borderColor: "whiteAlpha.200" }}
                >
                  {canEdit ? (
                    <Menu.Item value="edit" asChild>
                      <Box
                        as={Link}
                        to={APP_ROUTES.eventWizard.edit(event.uniqueId)}
                        borderRadius="10px"
                        fontSize="sm"
                        fontWeight="600"
                        color="gray.700"
                        cursor="pointer"
                        _dark={{ color: "gray.200" }}
                        _hover={{ bg: "gray.50", _dark: { bg: "whiteAlpha.100" } }}
                        px={3}
                        py={2}
                        gap={2.5}
                        display="flex"
                        alignItems="center"
                      >
                        <PencilLine size={14} />
                        Edit
                      </Box>
                    </Menu.Item>
                  ) : null}

                  {canViewRegistration ? (
                    <Menu.Item value="view" asChild>
                      <Box
                        as={Link}
                        to={APP_ROUTES.eventRegister(event.uniqueId)}
                        target="_blank"
                        rel="noreferrer"
                        borderRadius="10px"
                        fontSize="sm"
                        fontWeight="600"
                        color="gray.700"
                        cursor="pointer"
                        _dark={{ color: "gray.200" }}
                        _hover={{ bg: "gray.50", _dark: { bg: "whiteAlpha.100" } }}
                        px={3}
                        py={2}
                        gap={2.5}
                        display="flex"
                        alignItems="center"
                      >
                        <Eye size={14} />
                        View
                      </Box>
                    </Menu.Item>
                  ) : null}

                  {canEdit && canShowStatusActions ? <Menu.Separator borderColor="gray.100" _dark={{ borderColor: "whiteAlpha.100" }} mx={1} my={1} /> : null}

                  {canShowStatusActions ? (
                    <Menu.Root
                      open={isStatusPanelOpen}
                      onOpenChange={(details) => setIsStatusPanelOpen(details.open)}
                      positioning={{ placement: statusMenuPlacement, gutter: 8 }}
                    >
                      <Menu.Trigger asChild>
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          w="full"
                          borderRadius="10px"
                          fontSize="sm"
                          fontWeight="600"
                          color="gray.700"
                          _dark={{ color: "gray.200" }}
                          _hover={{ bg: "gray.50", _dark: { bg: "whiteAlpha.100" } }}
                          px={3}
                          py={2}
                          cursor="pointer"
                        >
                          <Text as="span">Status</Text>
                          <ChevronRight size={14} />
                        </Box>
                      </Menu.Trigger>
                      <Portal>
                        <Menu.Positioner>
                          <Menu.Content
                            minW={{ base: "12rem", sm: "11rem" }}
                            borderRadius="16px"
                            border="1px solid"
                            borderColor="gray.200"
                            boxShadow="0 16px 40px rgba(15, 23, 42, 0.12)"
                            p={1.5}
                            bg="white"
                            _dark={{ bg: "navy.800", borderColor: "whiteAlpha.200" }}
                          >
                            <Menu.Item
                              value="status-online"
                              borderRadius="10px"
                              fontSize="sm"
                              fontWeight="600"
                              color="gray.700"
                              _dark={{ color: "gray.200" }}
                              _hover={{ bg: "gray.50", _dark: { bg: "whiteAlpha.100" } }}
                              px={3}
                              py={2}
                              gap={2.5}
                              disabled={!isOnline && !isOffline}
                              onClick={() => openStatusConfirmation("online")}
                            >
                              <Text as="span" flex="1" textAlign="left">
                                Online
                              </Text>
                              {isOnline ? <Check size={14} /> : null}
                            </Menu.Item>
                            <Menu.Item
                              value="status-offline"
                              borderRadius="10px"
                              fontSize="sm"
                              fontWeight="600"
                              color="gray.700"
                              _dark={{ color: "gray.200" }}
                              _hover={{ bg: "gray.50", _dark: { bg: "whiteAlpha.100" } }}
                              px={3}
                              py={2}
                              gap={2.5}
                              disabled={!isOnline && !isOffline}
                              onClick={() => openStatusConfirmation("offline")}
                            >
                              <Text as="span" flex="1" textAlign="left">
                                Offline
                              </Text>
                              {isOffline ? <Check size={14} /> : null}
                            </Menu.Item>
                          </Menu.Content>
                        </Menu.Positioner>
                      </Portal>
                    </Menu.Root>
                  ) : null}
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        </Flex>

        <Dialog.Root
          open={isStatusConfirmOpen}
          onOpenChange={(details) => {
            if (details.open) {
              setIsStatusConfirmOpen(true)
              return
            }

            closeStatusConfirmation()
          }}
          size="sm"
        >
          <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
          <Dialog.Positioner>
            <Dialog.Content
              bg="white"
              borderRadius="24px"
              maxW={{ base: "100vw", md: "480px" }}
              m={{ base: 0, md: "auto" }}
              overflow="hidden"
            >
              <Box px={5} pt={5} pb={4} borderBottom="1px solid" borderColor="gray.200">
                <Flex align="flex-start" justify="space-between" gap={4}>
                  <Box>
                    <Text fontSize="xl" fontWeight="900" color="gray.900" lineHeight="1.05">
                      {pendingTransition?.title ?? "Confirm status change"}
                    </Text>
                    <Text mt={1.5} fontSize="sm" color="gray.600">
                      {pendingTransition?.description ?? "Please confirm this event status update."}
                    </Text>
                  </Box>

                  <Dialog.CloseTrigger asChild>
                    <CloseButton aria-label="Close status confirmation" />
                  </Dialog.CloseTrigger>
                </Flex>
              </Box>

              <Dialog.Body px={5} py={4}>
                <Stack gap={4}>
                  <Box border="1px solid" borderColor="gray.200" bg="gray.50" borderRadius="18px" px={4} py={3}>
                    <Text fontSize="xs" fontWeight="900" color="gray.500" letterSpacing="0.18em" textTransform="uppercase">
                      Selected action
                    </Text>
                    <Badge
                      mt={1.5}
                      variant="subtle"
                      colorPalette={pendingTransition?.tone ?? "gray"}
                      borderRadius="999px"
                      px={3}
                      py={0.75}
                    >
                      <Text as="span" fontSize="xs" fontWeight="800">
                        {pendingTransition?.label ?? "Update"}
                      </Text>
                    </Badge>
                  </Box>

                  <Text fontSize="sm" color="gray.700" lineHeight="1.55">
                    The backend will set SetupState to <Text as="span" fontWeight="800">{pendingTransition?.targetState ?? "the selected state"}</Text>.
                  </Text>
                </Stack>
              </Dialog.Body>

              <Flex
                px={5}
                pb={4}
                pt={3}
                borderTop="1px solid"
                borderColor="gray.200"
                align="center"
                justify="flex-end"
                gap={2.5}
                flexWrap="wrap"
              >
                <Button
                  variant="outline"
                  colorPalette="gray"
                  borderRadius="14px"
                  h="38px"
                  px={4.5}
                  minW={{ base: "full", md: "104px" }}
                  onClick={closeStatusConfirmation}
                  disabled={statusMutation.isPending}
                >
                  Cancel
                </Button>

                <Button
                  borderRadius="14px"
                  h="38px"
                  px={4.5}
                  minW={{ base: "full", md: "122px" }}
                  color="white"
                  style={{
                    background:
                      pendingTransition?.tone === "green"
                        ? "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)"
                        : "linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)",
                  }}
                  loading={statusMutation.isPending}
                  loadingText="Updating"
                  onClick={confirmStatusChange}
                >
                  Confirm
                </Button>
              </Flex>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>

        <Portal>
          <Box
            position="fixed"
            top={4}
            left="50%"
            transform={isCopyToastVisible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(-12px)"}
            opacity={isCopyToastVisible ? 1 : 0}
            pointerEvents="none"
            transition="all 0.2s ease"
            zIndex="toast"
          >
            <Box
              bg="gray.900"
              color="white"
              px={4}
              py={3}
              borderRadius="999px"
              boxShadow="0 18px 40px rgba(15, 23, 42, 0.24)"
              border="1px solid"
              borderColor="whiteAlpha.200"
            >
              <Text fontSize="sm" fontWeight="600">
                Registration URL copied to clipboard
              </Text>
            </Box>
          </Box>
        </Portal>

        <Flex align="flex-start" justify="space-between" gap={3} mb={4}>
          <Flex align="center" gap={2} minW={0}>
            <Text
              fontSize="md"
              fontWeight="700"
              color="text.primary"
              lineHeight={1.3}
              lineClamp={2}
            >
              {event.name}
            </Text>

            <Box
              as="button"
              type="button"
              aria-label="Copy registration URL"
              title="Copy registration URL"
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
              w="7"
              h="7"
              minW="7"
              minH="7"
              borderRadius="full"
              border="1px solid"
              borderColor="border.subtle"
              bg="white"
              color="gray.500"
              cursor="pointer"
              flexShrink={0}
              transition="all 0.15s ease"
              _hover={{ bg: "gray.50", color: "brand.500", _dark: { bg: "navy.700" } }}
              _active={{ transform: "scale(0.96)" }}
              onClick={handleCopyRegistrationUrl}
            >
              <Copy size={12} />
            </Box>
          </Flex>
        </Flex>

        <Flex direction={{ base: "column", sm: "row" }} align={{ base: "stretch", sm: "center" }} justify="space-between" gap={3} mb={4}>
          <Flex align="center" gap={2} minW={0}>
            <Box color="text.secondary" flexShrink={0}>
              <CalendarDays size={13} />
            </Box>
            <Text fontSize="xs" color="text.secondary" fontWeight="500" whiteSpace={{ base: "normal", sm: "nowrap" }}>
              {startDate} to {endDate}
            </Text>
          </Flex>

          <Flex align="center" gap={2} justify={{ base: "flex-start", sm: "flex-end" }} minW={0}>
            <Box color="text.secondary" flexShrink={0}>
              <MapPin size={13} />
            </Box>
            <Text fontSize="xs" color="text.secondary" fontWeight="500" lineClamp={1} textAlign={{ base: "left", sm: "right" }}>
              {event.venueName ?? "Venue not mapped yet"}
            </Text>
          </Flex>
        </Flex>

        <Box mb={4}>
          <Flex direction={{ base: "column", sm: "row" }} justify="space-between" align={{ base: "flex-start", sm: "center" }} gap={1} mb={1}>
            <Flex align="center" gap={1.5} minW={0}>
              <Box color="text.secondary">
                <Users size={12} />
              </Box>
              <Text fontSize="xs" color="text.secondary" fontWeight="500" lineClamp={1}>
                {event.ticketsSold.toLocaleString()} / {totalTickets.toLocaleString()} tickets sold
              </Text>
            </Flex>
            <Text fontSize="xs" fontWeight="700" style={{ color: event.themeColor ?? "#7551FF" }} alignSelf={{ base: "flex-end", sm: "auto" }}>
              {soldPct}%
            </Text>
          </Flex>

          <Box bg="gray.100" _dark={{ bg: "navy.700" }} borderRadius="full" h="5px" overflow="hidden">
            <Box
              h="full"
              borderRadius="full"
              style={{
                width: `${Math.min(soldPct, 100)}%`,
                background: `linear-gradient(90deg, ${event.themeColor ?? "#7551FF"}, ${event.themeColor ?? "#7551FF"}cc)`,
              }}
              transition="width 0.4s ease"
            />
          </Box>
        </Box>

      </Box>
    </Box>
  )
}
