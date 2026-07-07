import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Badge, Box, Button, CloseButton, Dialog, Flex, Menu, Portal, Stack, Table, Text } from "@chakra-ui/react"
import { CalendarDays, Check, ChevronRight, Copy, MapPin, MoreHorizontal, PencilLine, UserPlus } from "lucide-react"
import { format } from "date-fns"
import { useNavigate } from "react-router-dom"
import { type OrganizerEventListItem, updateEventWizardSetupState } from "@/api/events"
import { toaster } from "@/lib/toaster"
import { APP_ROUTES } from "@/utils/routes"

interface OrganizerEventTableRowProps {
  event: OrganizerEventListItem
}

const ACTION_BUTTON_STYLE = {
  w: "40px",
  h: "40px",
  minW: "40px",
  borderRadius: "999px",
  border: "1px solid",
  borderColor: "border.subtle",
  bg: "white",
  color: "text.primary",
  _hover: { bg: "gray.50", borderColor: "gray.200" },
  _dark: { bg: "navy.800", borderColor: "whiteAlpha.200", _hover: { bg: "whiteAlpha.100" } },
}

const SETUP_STATE_LABELS: Record<string, string> = {
  InProgress: "In Progress",
  ReadyForReview: "Ready For Review",
  ReadyForSale: "Ready For Sale",
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

function normalizeSetupStateToken(value: string) {
  return value.replace(/[^a-z]/gi, "").toLowerCase()
}

function formatSetupState(setupState: string, isCancelled: boolean) {
  if (isCancelled) {
    return "Cancelled"
  }

  return SETUP_STATE_LABELS[setupState] ?? setupState.replace(/([a-z])([A-Z])/g, "$1 $2")
}

function formatEventDate(date: string | null) {
  return date ? format(new Date(date), "MMM d, yyyy") : "Not set"
}

export function OrganizerEventTableRow({ event }: OrganizerEventTableRowProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isStatusPanelOpen, setIsStatusPanelOpen] = useState(false)
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false)
  const [pendingStatusAction, setPendingStatusAction] = useState<StatusTransitionKey | null>(null)
  const normalizedSetupState = normalizeSetupStateToken(event.setupState)
  const canEdit = !event.isCancelled
  const canShowStatusActions =
    normalizedSetupState === "readyforreview" ||
    normalizedSetupState === "readyforsale" ||
    normalizedSetupState === "readytoreview"
  const isOnline = normalizedSetupState === "readyforsale"
  const isOffline = normalizedSetupState === "readyforreview" || normalizedSetupState === "readytoreview"
  const totalTickets = event.totalAvailableTickets + event.ticketsSold
  const soldPct = totalTickets > 0 ? Math.round((event.ticketsSold / totalTickets) * 100) : 0
  const statusColor = event.isCancelled ? "red" : normalizedSetupState === "readyforsale" ? "green" : normalizedSetupState === "readyforreview" ? "orange" : "gray"
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

  function handleOpenRegistration() {
    window.open(registrationUrl, "_blank", "noreferrer")
  }

  async function handleCopyRegistrationUrl() {
    try {
      await navigator.clipboard.writeText(registrationUrl)
      toaster.create({
        title: "Registration URL copied",
        description: "The event registration URL is now on your clipboard.",
        type: "success",
      })
    } catch {
      toaster.create({
        title: "Unable to copy URL",
        description: "Please try again or copy the URL from the browser address bar.",
        type: "error",
      })
    }
  }

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
    if (!isStatusConfirmOpen) {
      return
    }

    const handleEscape = (eventKey: KeyboardEvent) => {
      if (eventKey.key === "Escape") {
        closeStatusConfirmation()
      }
    }

    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [isStatusConfirmOpen])

  async function confirmStatusChange() {
    if (!pendingTransition) {
      return
    }

    await statusMutation.mutateAsync(pendingTransition.targetState)
  }

  return (
    <Table.Row key={event.uniqueId} _hover={{ bg: "app.bg" }} transition="background 0.15s">
      <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4} verticalAlign="top" textAlign="center">
        <Flex justify="center">
          <Menu.Root
            positioning={{ placement: "bottom-start" }}
            onOpenChange={(details) => {
              if (!details.open) {
                setIsStatusPanelOpen(false)
              }
            }}
          >
            <Menu.Trigger asChild>
              <Button
                {...ACTION_BUTTON_STYLE}
                variant="outline"
                aria-label={`Actions for ${event.name}`}
                title="Actions"
              >
                <MoreHorizontal size={18} aria-hidden="true" />
              </Button>
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
                    <Menu.Item
                      value="edit-event"
                      borderRadius="10px"
                      fontSize="sm"
                      fontWeight="600"
                      color="gray.700"
                      _dark={{ color: "gray.200" }}
                      _hover={{ bg: "gray.50", _dark: { bg: "whiteAlpha.100" } }}
                      px={3}
                      py={2}
                      gap={2.5}
                      onClick={() => navigate(APP_ROUTES.eventWizard.edit(event.uniqueId))}
                    >
                      <PencilLine size={14} />
                      <Text as="span" flex="1" textAlign="left">
                        Edit
                      </Text>
                    </Menu.Item>
                  ) : null}

                  <Menu.Item
                    value="copy-registration-url"
                    borderRadius="10px"
                    fontSize="sm"
                    fontWeight="600"
                    color="gray.700"
                    _dark={{ color: "gray.200" }}
                    _hover={{ bg: "gray.50", _dark: { bg: "whiteAlpha.100" } }}
                    px={3}
                    py={2}
                    gap={2.5}
                    onClick={() => void handleCopyRegistrationUrl()}
                  >
                    <Copy size={14} />
                    <Text as="span" flex="1" textAlign="left">
                      Copy URL
                    </Text>
                  </Menu.Item>

                  <Menu.Item
                    value="register-event"
                    borderRadius="10px"
                    fontSize="sm"
                    fontWeight="600"
                    color="gray.700"
                    _dark={{ color: "gray.200" }}
                    _hover={{ bg: "gray.50", _dark: { bg: "whiteAlpha.100" } }}
                    px={3}
                    py={2}
                    gap={2.5}
                    onClick={handleOpenRegistration}
                  >
                    <UserPlus size={14} />
                    <Text as="span" flex="1" textAlign="left">
                      Register
                    </Text>
                  </Menu.Item>

                  {canEdit && canShowStatusActions ? <Menu.Separator borderColor="gray.100" _dark={{ borderColor: "whiteAlpha.100" }} mx={1} my={1} /> : null}

                  {canShowStatusActions ? (
                    <Menu.Root
                      open={isStatusPanelOpen}
                      onOpenChange={(details) => setIsStatusPanelOpen(details.open)}
                      positioning={{ placement: "right-start", gutter: 8 }}
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
      </Table.Cell>
      <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4} verticalAlign="top">
        <Box minW={0}>
          <Text fontWeight="700" color="text.primary" lineClamp={1}>
            {event.name}
          </Text>
        </Box>
      </Table.Cell>
      <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4} verticalAlign="top">
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
          {formatSetupState(event.setupState, event.isCancelled)}
        </Badge>
      </Table.Cell>
      <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4} verticalAlign="top" fontSize="sm" color="text.secondary" whiteSpace="nowrap">
        <Flex align="center" gap={2}>
          <CalendarDays size={14} />
          <Text>
            {formatEventDate(event.startDate)} to {formatEventDate(event.endDate)}
          </Text>
        </Flex>
      </Table.Cell>
      <Table.Cell borderColor="border.subtle" borderRightWidth="1px" px={4} py={4} verticalAlign="top">
        <Flex align="center" gap={2} color="text.primary" fontSize="sm">
          <MapPin size={14} />
          <Text>{event.venueName ?? "Venue not mapped yet"}</Text>
        </Flex>
      </Table.Cell>
      <Table.Cell borderColor="border.subtle" px={4} py={4} verticalAlign="top">
        <Text fontSize="sm" fontWeight="700" color="text.primary">
          {event.ticketsSold.toLocaleString()} / {totalTickets.toLocaleString()}
        </Text>
        <Text fontSize="xs" color="text.secondary">
          {soldPct}% sold
        </Text>
      </Table.Cell>
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
    </Table.Row>
  )
}
