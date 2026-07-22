import { useState } from "react"
import {
  Badge,
  Box,
  Button,
  Flex,
  SkeletonText,
  Stack,
  Text,
} from "@chakra-ui/react"
import { CheckCheck, Inbox } from "lucide-react"
import { extractApiError } from "@/utils/errors"
import type { InboxAlert } from "@/api/alerts"
import { useInbox } from "../hooks/useAlerts"
import { useMarkAlertRead } from "../hooks/useAlertMutations"
import { PRIORITY_COLOR, formatDateTime } from "../constants"

export function AlertInbox() {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [page, setPage] = useState(1)

  const inboxQuery = useInbox(unreadOnly, page, 25)
  const markReadMutation = useMarkAlertRead()

  const inboxPage = inboxQuery.data
  const alerts = inboxPage?.items ?? []
  const totalPages = inboxPage?.totalPages ?? 0

  function handleOpen(alert: InboxAlert) {
    if (!alert.isRead) {
      markReadMutation.mutate(alert.uniqueId)
    }
  }

  return (
    <Stack gap={5} maxW="820px" mx="auto" w="full">
      <Flex align="center" justify="space-between" gap={3} flexWrap="wrap">
        <Box>
          <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" color="gray.900">
            Notifications
          </Text>
          <Text fontSize="sm" color="text.secondary">
            Alerts sent to you appear here.
          </Text>
        </Box>
        <Flex gap={2}>
          <Button
            size="sm"
            variant={unreadOnly ? "solid" : "outline"}
            borderRadius="12px"
            cursor="pointer"
            onClick={() => {
              setUnreadOnly((current) => !current)
              setPage(1)
            }}
          >
            {unreadOnly ? "Showing unread" : "All"}
          </Button>
        </Flex>
      </Flex>

      {inboxQuery.isError ? (
        <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
          <Text fontSize="sm" fontWeight="700" color="red.700">{extractApiError(inboxQuery.error)}</Text>
        </Box>
      ) : null}

      {inboxQuery.isLoading && !inboxPage ? (
        <Box p={4} borderRadius="16px" border="1px solid" borderColor="border.subtle" bg="card.bg">
          <SkeletonText noOfLines={6} />
        </Box>
      ) : alerts.length === 0 ? (
        <Flex direction="column" align="center" justify="center" py={16} gap={3} color="text.secondary" borderRadius="16px" border="1px solid" borderColor="border.subtle" bg="card.bg">
          <Inbox size={32} />
          <Text fontSize="sm">{unreadOnly ? "No unread notifications." : "No notifications yet."}</Text>
        </Flex>
      ) : (
        <Stack gap={3}>
          {alerts.map((alert) => (
            <Box
              key={alert.uniqueId}
              borderRadius="16px"
              border="1px solid"
              borderColor={alert.isRead ? "border.subtle" : "brand.200"}
              bg={alert.isRead ? "card.bg" : "brand.50"}
              boxShadow="card"
              p={{ base: 4, md: 5 }}
              cursor={alert.isRead ? "default" : "pointer"}
              onClick={() => handleOpen(alert)}
            >
              <Flex justify="space-between" align="flex-start" gap={3}>
                <Flex align="center" gap={2} flexWrap="wrap">
                  {!alert.isRead ? <Box w="8px" h="8px" borderRadius="full" bg="brand.500" /> : null}
                  <Text fontSize="md" fontWeight="700" color="gray.900">{alert.title}</Text>
                  <Badge colorPalette={PRIORITY_COLOR[alert.priority]}>{alert.priority}</Badge>
                </Flex>
                <Text fontSize="xs" color="text.secondary" flexShrink={0}>{formatDateTime(alert.sentAtUtc)}</Text>
              </Flex>
              <Text fontSize="sm" color="gray.700" mt={2} whiteSpace="pre-wrap">{alert.body}</Text>
              <Flex justify="space-between" align="center" mt={3}>
                <Text fontSize="xs" color="text.secondary">From {alert.sentBy}</Text>
                {alert.isRead ? (
                  <Flex align="center" gap={1} color="green.600">
                    <CheckCheck size={14} />
                    <Text fontSize="xs">Read</Text>
                  </Flex>
                ) : (
                  <Button size="xs" variant="plain" color="brand.600" cursor="pointer" onClick={(event) => { event.stopPropagation(); markReadMutation.mutate(alert.uniqueId) }}>
                    Mark as read
                  </Button>
                )}
              </Flex>
            </Box>
          ))}

          <Flex align="center" justify="flex-end" gap={3} pt={2}>
            <Text fontSize="xs" color="text.secondary">Page {inboxPage?.page ?? page} of {Math.max(totalPages, 1)}</Text>
            <Button size="sm" variant="outline" borderRadius="10px" disabled={page <= 1} cursor={page <= 1 ? "not-allowed" : "pointer"} onClick={() => setPage((current) => Math.max(1, current - 1))}>Prev</Button>
            <Button size="sm" variant="outline" borderRadius="10px" disabled={page >= totalPages} cursor={page >= totalPages ? "not-allowed" : "pointer"} onClick={() => setPage((current) => current + 1)}>Next</Button>
          </Flex>
        </Stack>
      )}
    </Stack>
  )
}
