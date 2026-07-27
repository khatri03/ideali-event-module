import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  Input,
  SkeletonText,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react"
import { ArrowLeft, RefreshCw, Search } from "lucide-react"
import { useDebounce } from "@/hooks/useDebounce"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import type { AlertDelivery, AlertEmailEvent } from "@/api/alerts"
import { useAlert, useAlertRecipients } from "../hooks/useAlerts"
import { useResendAlert } from "../hooks/useAlertMutations"
import {
  PRIORITY_COLOR,
  STATUS_COLOR,
  channelLabel,
  formatDateTime,
} from "../constants"
import { ConfirmAlertDialog } from "./ConfirmAlertDialog"
import { AlertMessageViewer } from "./AlertMessageViewer"

const DELIVERY_COLOR: Record<string, string> = {
  Sent: "green",
  Failed: "red",
  Skipped: "gray",
  Pending: "blue",
}

/**
 * "Delivered" is deliberately excluded: it fires for nearly every successful send, and `Status: Sent`
 * already implies it, so surfacing it as its own badge would just be noise next to the delivery badge.
 */
const EVENT_COLOR: Record<string, string> = {
  Opened: "cyan",
  Clicked: "purple",
  Bounced: "red",
  Blocked: "orange",
  Spam: "red",
  Unsubscribed: "orange",
}

interface AlertDetailViewProps {
  uniqueId: string
}

interface ChannelDelivery {
  channel: string
  status: string
  attemptCount: number
  latestEvent: AlertEmailEvent | null
  eventHistory: AlertEmailEvent[]
  failureReason: string | null
}

/**
 * Collapses the raw attempt log to one row per channel: a resend appends a fresh attempt, so a recipient
 * can hold several "Instant: Sent" rows. We show the latest status plus an attempt count rather than a
 * chip per attempt, which reads as an accidental duplicate.
 */
function collapseDeliveries(deliveries: AlertDelivery[]): ChannelDelivery[] {
  const byChannel = new Map<string, AlertDelivery[]>()
  for (const delivery of deliveries) {
    const attempts = byChannel.get(delivery.channel) ?? []
    attempts.push(delivery)
    byChannel.set(delivery.channel, attempts)
  }

  return Array.from(byChannel.entries()).map(([channel, attempts]) => {
    const latest = attempts.reduce((current, next) => (next.attemptNo > current.attemptNo ? next : current))

    const eventHistory = attempts
      .flatMap((attempt) => attempt.emailEvents)
      .sort((a, b) => b.occurredAtUtc.localeCompare(a.occurredAtUtc))

    const latestEvent = eventHistory.find((event) => event.eventType in EVENT_COLOR) ?? null

    return {
      channel,
      status: latest.status,
      attemptCount: attempts.length,
      latestEvent,
      eventHistory,
      failureReason: latest.failureReason,
    }
  })
}

export function AlertDetailView({ uniqueId }: AlertDetailViewProps) {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const [confirmResend, setConfirmResend] = useState(false)
  const debouncedSearch = useDebounce(searchTerm, 300)

  const detailQuery = useAlert(uniqueId)
  const recipientsQuery = useAlertRecipients(uniqueId, debouncedSearch, page, 25)
  const resendMutation = useResendAlert()

  const detail = detailQuery.data
  const recipientPage = recipientsQuery.data
  const recipients = recipientPage?.items ?? []
  const totalPages = recipientPage?.totalPages ?? 0

  if (detailQuery.isError) {
    return (
      <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
        <Text fontSize="sm" fontWeight="700" color="red.700">
          {extractApiError(detailQuery.error)}
        </Text>
      </Box>
    )
  }

  async function handleResend() {
    await resendMutation.mutateAsync(uniqueId)
    setConfirmResend(false)
  }

  return (
    <Stack gap={5}>
      <Flex align="center" justify="space-between" gap={3} flexWrap="wrap">
        <Button
          variant="outline"
          borderRadius="14px"
          minH="11"
          px={4}
          cursor="pointer"
          onClick={() => navigate(APP_ROUTES.memberAlerts.list)}
        >
          <ArrowLeft size={16} />
          Back to alerts
        </Button>
        <Button
          borderRadius="14px"
          minH="11"
          px={5}
          color="white"
          cursor="pointer"
          onClick={() => setConfirmResend(true)}
          style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
        >
          <RefreshCw size={15} />
          Resend
        </Button>
      </Flex>

      <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" boxShadow="card" p={{ base: 4, md: 6 }}>
        {detailQuery.isLoading && !detail ? (
          <SkeletonText noOfLines={4} />
        ) : (
          <Stack gap={4}>
            <Heading fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" color="gray.900">
              {detail?.title}
            </Heading>
            <Flex gap={2} flexWrap="wrap">
              {detail ? <Badge colorPalette={PRIORITY_COLOR[detail.priority]}>{detail.priority}</Badge> : null}
              {detail ? <Badge colorPalette={STATUS_COLOR[detail.status] ?? "gray"}>{detail.status}</Badge> : null}
              {detail ? <Badge variant="surface" colorPalette="gray">{channelLabel(detail.channels)}</Badge> : null}
            </Flex>
            <AlertMessageViewer value={detail?.body ?? ""} />
            <Flex gap={6} flexWrap="wrap" pt={2}>
              <Box>
                <Text fontSize="xs" color="text.secondary">Recipients</Text>
                <Text fontSize="sm" fontWeight="700">{detail?.recipientCount ?? 0}</Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="text.secondary">Read</Text>
                <Text fontSize="sm" fontWeight="700">{detail?.readCount ?? 0}</Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="text.secondary">Failed</Text>
                <Text fontSize="sm" fontWeight="700">{detail?.failedCount ?? 0}</Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="text.secondary">Sent</Text>
                <Text fontSize="sm" fontWeight="700">{formatDateTime(detail?.sentAtUtc ?? null)}</Text>
              </Box>
            </Flex>
          </Stack>
        )}
      </Box>

      <Box borderRadius="16px" border="1px solid" borderColor="border.subtle" overflow="hidden" bg="card.bg">
        <Flex px={4} py={3} align="center" justify="space-between" gap={3} borderBottom="1px solid" borderColor="border.subtle" direction={{ base: "column", md: "row" }}>
          <Text fontSize="sm" fontWeight="700">Recipients</Text>
          <Flex position="relative" align="center" w={{ base: "full", md: "280px" }}>
            <Box position="absolute" left={3} color="gray.400" pointerEvents="none" display="flex">
              <Search size={15} />
            </Box>
            <Input
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value)
                setPage(1)
              }}
              placeholder="Search recipients"
              minH="10"
              borderRadius="12px"
              pl={9}
              pr={3}
              fontSize="sm"
            />
          </Flex>
        </Flex>

        {recipientsQuery.isLoading && !recipientPage ? (
          <Box px={4} py={4}>
            <SkeletonText noOfLines={5} />
          </Box>
        ) : (
          <Box overflowX="auto">
            <Table.Root variant="line" size="sm">
              <Table.Header>
                <Table.Row bg="app.bg">
                  <Table.ColumnHeader px={4} py={3}>Recipient</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>Email</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>Read</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>Delivery</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {recipients.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={4} py={10}>
                      <Text fontSize="sm" color="text.secondary" textAlign="center">No recipients match.</Text>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  recipients.map((recipient) => (
                    <Table.Row key={recipient.uniqueId} _hover={{ bg: "app.bg" }}>
                      <Table.Cell px={4} py={3}>
                        <Text fontSize="sm" fontWeight="600" lineClamp={1}>{recipient.name}</Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        <Text fontSize="sm" color="text.secondary" lineClamp={1}>{recipient.email ?? "—"}</Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        {recipient.isRead ? (
                          <Badge colorPalette="green">Read</Badge>
                        ) : (
                          <Badge colorPalette="gray">Unread</Badge>
                        )}
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        <Flex gap={1} flexWrap="wrap">
                          {recipient.deliveries.length === 0 ? (
                            <Text fontSize="sm" color="text.secondary">—</Text>
                          ) : (
                            collapseDeliveries(recipient.deliveries).map((delivery) => (
                              <Flex key={delivery.channel} gap={1} flexWrap="wrap">
                                <Badge
                                  colorPalette={DELIVERY_COLOR[delivery.status] ?? "gray"}
                                  variant="surface"
                                  title={delivery.failureReason ?? undefined}
                                >
                                  {delivery.channel}: {delivery.status}
                                  {delivery.attemptCount > 1 ? ` ×${delivery.attemptCount}` : ""}
                                </Badge>
                                {delivery.latestEvent ? (
                                  <Badge
                                    colorPalette={EVENT_COLOR[delivery.latestEvent.eventType] ?? "gray"}
                                    variant="surface"
                                    title={delivery.eventHistory
                                      .map((event) => `${event.eventType} — ${formatDateTime(event.occurredAtUtc)}`)
                                      .join("\n")}
                                  >
                                    {delivery.latestEvent.eventType}
                                  </Badge>
                                ) : null}
                              </Flex>
                            ))
                          )}
                        </Flex>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table.Root>
          </Box>
        )}

        <Flex px={4} py={3} align="center" justify="flex-end" gap={3} borderTop="1px solid" borderColor="border.subtle">
          <Text fontSize="xs" color="text.secondary">Page {recipientPage?.page ?? page} of {Math.max(totalPages, 1)}</Text>
          <Button size="sm" variant="outline" borderRadius="10px" disabled={page <= 1} cursor={page <= 1 ? "not-allowed" : "pointer"} onClick={() => setPage((current) => Math.max(1, current - 1))}>Prev</Button>
          <Button size="sm" variant="outline" borderRadius="10px" disabled={page >= totalPages} cursor={page >= totalPages ? "not-allowed" : "pointer"} onClick={() => setPage((current) => current + 1)}>Next</Button>
        </Flex>
      </Box>

      {confirmResend ? (
        <ConfirmAlertDialog
          title="Resend alert?"
          message={`"${detail?.title ?? "This alert"}" will be sent again to all recipients.`}
          confirmLabel="Resend"
          tone="brand"
          isLoading={resendMutation.isPending}
          onConfirm={handleResend}
          onClose={() => setConfirmResend(false)}
        />
      ) : null}
    </Stack>
  )
}
