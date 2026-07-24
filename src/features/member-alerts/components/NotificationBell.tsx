import { Badge, Box, Flex, IconButton, Menu, Portal, SkeletonText, Stack, Text } from "@chakra-ui/react"
import { Bell, Inbox } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { APP_ROUTES } from "@/utils/routes"
import type { AlertPriority, InboxAlert } from "@/api/alerts"
import { useInbox, useUnseenCount } from "../hooks/useAlerts"
import { useMarkAlertRead, useMarkAllSeen } from "../hooks/useAlertMutations"
import { PRIORITY_COLOR, formatDateTime } from "../constants"
import { PriorityPill } from "./PriorityPill"

const FEED_SIZE = 10

/** Urgent and Important get a tinted background (danger / warning); Normal and Low stay neutral. */
function isTinted(priority: AlertPriority) {
  return priority === "Urgent" || priority === "Important"
}

export function NotificationBell() {
  const navigate = useNavigate()
  const unseenQuery = useUnseenCount()
  const feedQuery = useInbox(false, 1, FEED_SIZE)
  const markAllSeen = useMarkAllSeen()
  const markRead = useMarkAlertRead()

  const unseenCount = unseenQuery.data ?? 0
  const alerts = feedQuery.data?.items ?? []
  const bellLabel = unseenCount > 0 ? `Notifications, ${unseenCount} unseen` : "Notifications"

  function handleOpenChange(open: boolean) {
    // Opening the bell acknowledges the badge in bulk; items stay bold until individually opened.
    if (open && unseenCount > 0 && !markAllSeen.isPending) {
      markAllSeen.mutate()
    }
  }

  function handleItemClick(alert: InboxAlert) {
    // Optimistically clear bold; the detail view also marks it read on open.
    if (!alert.isRead) {
      markRead.mutate(alert.uniqueId)
    }
    navigate(APP_ROUTES.alertInboxDetail(alert.uniqueId))
  }

  return (
    <Menu.Root positioning={{ placement: "bottom-end" }} onOpenChange={(event) => handleOpenChange(event.open)}>
      <Menu.Trigger asChild>
        <Box position="relative" display="inline-flex">
          <IconButton
            aria-label={bellLabel}
            variant="ghost"
            size="sm"
            borderRadius="12px"
            color="gray.500"
            cursor="pointer"
            _hover={{ bg: "gray.100", _dark: { bg: "navy.700" }, color: "brand.500" }}
          >
            <Bell size={18} />
          </IconButton>
          {unseenCount > 0 && (
            <Flex
              position="absolute"
              top="0"
              right="0"
              align="center"
              justify="center"
              minW="16px"
              h="16px"
              px="1"
              borderRadius="full"
              bg="red.500"
              border="2px solid"
              borderColor="topbar.bg"
              pointerEvents="none"
            >
              <Text fontSize="9px" fontWeight="800" color="white" lineHeight={1}>
                {unseenCount > 99 ? "99+" : unseenCount}
              </Text>
            </Flex>
          )}
        </Box>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content
            w={{ base: "calc(100vw - 32px)", sm: "360px" }}
            maxW="360px"
            maxH="440px"
            overflowY="auto"
            borderRadius="16px"
            border="1px solid"
            borderColor="gray.200"
            boxShadow="0 16px 40px rgba(15, 23, 42, 0.12)"
            p={1.5}
            bg="white"
            _dark={{ bg: "navy.800", borderColor: "whiteAlpha.200" }}
          >
            <Flex align="center" justify="space-between" px={3} py={2}>
              <Text fontSize="sm" fontWeight="800" color="gray.900" _dark={{ color: "white" }}>
                Notifications
              </Text>
              {unseenCount > 0 && (
                <Badge colorPalette="red" borderRadius="full" fontSize="10px">
                  {unseenCount} new
                </Badge>
              )}
            </Flex>

            <Menu.Separator borderColor="gray.100" _dark={{ borderColor: "whiteAlpha.100" }} mx={1} />

            {feedQuery.isLoading && !feedQuery.data ? (
              <Box p={3}>
                <SkeletonText noOfLines={4} />
              </Box>
            ) : alerts.length === 0 ? (
              <Flex direction="column" align="center" justify="center" py={10} gap={2} color="text.secondary">
                <Inbox size={26} />
                <Text fontSize="sm">No notifications yet.</Text>
              </Flex>
            ) : (
              <Stack gap={1} py={1}>
                {alerts.map((alert) => {
                  const tinted = isTinted(alert.priority)
                  return (
                    <Menu.Item
                      key={alert.uniqueId}
                      value={alert.uniqueId}
                      borderRadius="12px"
                      colorPalette={PRIORITY_COLOR[alert.priority]}
                      bg={tinted ? "colorPalette.50" : "transparent"}
                      _dark={{ bg: tinted ? "colorPalette.950" : "transparent" }}
                      _hover={{ bg: tinted ? "colorPalette.100" : "gray.50", _dark: { bg: "whiteAlpha.100" } }}
                      px={3}
                      py={2.5}
                      cursor="pointer"
                      onClick={() => handleItemClick(alert)}
                    >
                      <Flex direction="column" gap={1} flex={1} minW={0}>
                        <Flex align="center" justify="space-between" gap={2}>
                          <Text fontSize="xs" color="text.secondary">
                            {formatDateTime(alert.sentAtUtc)}
                          </Text>
                          <PriorityPill priority={alert.priority} />
                        </Flex>
                        <Flex align="center" gap={2} minW={0}>
                          {!alert.isRead && <Box w="8px" h="8px" borderRadius="full" bg="brand.500" flexShrink={0} />}
                          <Text
                            fontSize="sm"
                            fontWeight={alert.isRead ? "500" : "800"}
                            color="gray.900"
                            _dark={{ color: "white" }}
                            lineClamp={1}
                            flex={1}
                          >
                            {alert.title}
                          </Text>
                        </Flex>
                      </Flex>
                    </Menu.Item>
                  )
                })}
              </Stack>
            )}

            <Menu.Separator borderColor="gray.100" _dark={{ borderColor: "whiteAlpha.100" }} mx={1} />

            <Menu.Item
              value="view-all"
              borderRadius="10px"
              justifyContent="center"
              fontSize="sm"
              fontWeight="700"
              color="brand.600"
              _dark={{ color: "brand.300" }}
              _hover={{ bg: "gray.50", _dark: { bg: "whiteAlpha.100" } }}
              py={2}
              cursor="pointer"
              onClick={() => navigate(APP_ROUTES.alertInbox)}
            >
              View all
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
