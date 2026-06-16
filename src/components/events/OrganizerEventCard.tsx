import { useState } from "react"
import { Badge, Box, Flex, Menu, Portal, Text } from "@chakra-ui/react"
import { CalendarDays, Check, ChevronRight, MapPin, MoreHorizontal, PencilLine, Users } from "lucide-react"
import { format } from "date-fns"
import { useNavigate } from "react-router-dom"
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

interface OrganizerEventCardProps {
  event: OrganizerEventListItem
}

export function OrganizerEventCard({ event }: OrganizerEventCardProps) {
  const navigate = useNavigate()
  const [isStatusPanelOpen, setIsStatusPanelOpen] = useState(false)
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

  return (
    <Box
      bg="card.bg"
      borderRadius="20px"
      overflow="hidden"
      boxShadow="card"
      border="1px solid"
      borderColor="border.subtle"
      _hover={{ boxShadow: "cardHover", transform: "translateY(-2px)" }}
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
                    <Menu.Item
                      value="edit"
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
                      Edit
                    </Menu.Item>
                  ) : null}

                  {canEdit && canShowStatusActions ? <Menu.Separator borderColor="gray.100" _dark={{ borderColor: "whiteAlpha.100" }} mx={1} my={1} /> : null}

                  {canShowStatusActions ? (
                    <Box
                      position="relative"
                      px={1}
                    >
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
                        onClick={() => setIsStatusPanelOpen((current) => !current)}
                      >
                        <Text as="span">Status</Text>
                        <ChevronRight size={14} />
                      </Box>

                      {isStatusPanelOpen ? (
                        <Box
                          position="absolute"
                          top="0"
                          left="calc(100% + 8px)"
                          minW="12rem"
                          bg="white"
                          _dark={{ bg: "navy.800" }}
                          border="1px solid"
                          borderColor="gray.200"
                          boxShadow="0 16px 40px rgba(15, 23, 42, 0.12)"
                          borderRadius="16px"
                          p={1.5}
                          zIndex={1}
                        >
                          <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                            px={3}
                            py={2}
                            borderRadius="10px"
                            color="gray.700"
                            _dark={{ color: "gray.200" }}
                            _hover={{ bg: "gray.50", _dark: { bg: "whiteAlpha.100" } }}
                          >
                            <Text fontSize="sm" fontWeight="600">
                              Online
                            </Text>
                            {isOnline ? <Check size={14} /> : null}
                          </Box>
                          <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                            px={3}
                            py={2}
                            borderRadius="10px"
                            color="gray.700"
                            _dark={{ color: "gray.200" }}
                            _hover={{ bg: "gray.50", _dark: { bg: "whiteAlpha.100" } }}
                          >
                            <Text fontSize="sm" fontWeight="600">
                              Offline
                            </Text>
                            {isOffline ? <Check size={14} /> : null}
                          </Box>
                        </Box>
                      ) : null}
                    </Box>
                  ) : null}
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        </Flex>

        <Text
          fontSize="md"
          fontWeight="700"
          color="text.primary"
          lineHeight={1.3}
          mb={4}
          lineClamp={2}
        >
          {event.name}
        </Text>

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
