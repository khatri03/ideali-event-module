import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Badge,
  Box,
  Button,
  Flex,
  Input,
  Menu,
  NativeSelect,
  Portal,
  SkeletonText,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react"
import { MoreHorizontal, Plus, RefreshCw, Search, Trash2 } from "lucide-react"
import { useDebounce } from "@/hooks/useDebounce"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import type { AlertFilters, AlertListItem, AlertStatus } from "@/api/alerts"
import { useAlerts } from "../hooks/useAlerts"
import { useDeleteAlert, useResendAlert } from "../hooks/useAlertMutations"
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, PRIORITY_COLOR, STATUS_COLOR, channelLabel, formatDateTime } from "../constants"
import { ConfirmAlertDialog } from "./ConfirmAlertDialog"

const STATUS_FILTER_OPTIONS: { value: AlertStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "Scheduled", label: "Scheduled" },
  { value: "Sent", label: "Sent" },
  { value: "PartiallyFailed", label: "Partially failed" },
  { value: "Failed", label: "Failed" },
]

const DEFAULT_FILTERS: AlertFilters = {
  searchTerm: "",
  status: "",
  sortBy: "sentAtUtc",
  sortOrder: "desc",
}

type PendingAction = { type: "resend" | "delete"; alert: AlertListItem }

export function AlertsManager() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [status, setStatus] = useState<AlertStatus | "">("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const debouncedSearch = useDebounce(searchTerm, 300)

  const resendMutation = useResendAlert()
  const deleteMutation = useDeleteAlert()

  const alertsQuery = useAlerts(
    { ...DEFAULT_FILTERS, searchTerm: debouncedSearch, status },
    page,
    pageSize,
  )

  const alertPage = alertsQuery.data
  const alerts = alertPage?.items ?? []
  const totalPages = alertPage?.totalPages ?? 0

  function handleSearchChange(value: string) {
    setSearchTerm(value)
    setPage(1)
  }

  function handleStatusChange(value: string) {
    setStatus(value as AlertStatus | "")
    setPage(1)
  }

  async function handleConfirm() {
    if (!pending) {
      return
    }
    if (pending.type === "resend") {
      await resendMutation.mutateAsync(pending.alert.uniqueId)
    } else {
      await deleteMutation.mutateAsync(pending.alert.uniqueId)
    }
    setPending(null)
  }

  return (
    <Stack gap={5}>
      <Flex justify="space-between" align="center" gap={3} direction={{ base: "column", md: "row" }}>
        <Box>
          <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" color="gray.900">
            Member Alerts
          </Text>
          <Text fontSize="sm" color="text.secondary">
            Send instant or email alerts to your members.
          </Text>
        </Box>
        <Button
          w={{ base: "full", md: "auto" }}
          minH="11"
          px={6}
          borderRadius="14px"
          fontWeight="700"
          color="white"
          cursor="pointer"
          onClick={() => navigate(APP_ROUTES.memberAlerts.create)}
          style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
        >
          <Plus size={16} />
          New alert
        </Button>
      </Flex>

      <Flex
        gap={3}
        direction={{ base: "column", md: "row" }}
        borderRadius="16px"
        border="1px solid"
        borderColor="border.subtle"
        bg="card.bg"
        p={4}
      >
        <Flex position="relative" align="center" flex={1}>
          <Box position="absolute" left={4} color="gray.400" pointerEvents="none" display="flex">
            <Search size={16} />
          </Box>
          <Input
            value={searchTerm}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search by title"
            minH="11"
            borderRadius="14px"
            pl={10}
            pr={4}
          />
        </Flex>
        <Box w={{ base: "full", md: "220px" }}>
          <NativeSelect.Root>
            <NativeSelect.Field value={status} onChange={(event) => handleStatusChange(event.target.value)} minH="11" borderRadius="14px" ps={4} pe={8}>
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Box>
      </Flex>

      {alertsQuery.isError ? (
        <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
          <Text fontSize="sm" fontWeight="700" color="red.700">
            {extractApiError(alertsQuery.error)}
          </Text>
        </Box>
      ) : null}

      <Box borderRadius="16px" border="1px solid" borderColor="border.subtle" overflow="hidden" bg="card.bg">
        {alertsQuery.isLoading && !alertPage ? (
          <Box px={4} py={4}>
            <SkeletonText noOfLines={6} />
          </Box>
        ) : (
          <Box overflowX="auto">
            <Table.Root variant="line" size="sm">
              <Table.Header>
                <Table.Row bg="app.bg">
                  <Table.ColumnHeader px={4} py={3} textAlign="center" w="70px">Actions</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>Title</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>Priority</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>Channels</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>Status</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3} textAlign="right">Recipients</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3} textAlign="right">Read</Table.ColumnHeader>
                  <Table.ColumnHeader px={4} py={3}>Sent</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {alerts.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={8} py={12}>
                      <Text fontSize="sm" color="text.secondary" textAlign="center">
                        No alerts yet.
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  alerts.map((alert) => (
                    <Table.Row key={alert.uniqueId} _hover={{ bg: "app.bg" }}>
                      <Table.Cell px={4} py={3} textAlign="center">
                        <Menu.Root>
                          <Menu.Trigger asChild>
                            <Button variant="outline" borderRadius="full" h="34px" w="34px" minW="34px" p={0} cursor="pointer" aria-label={`Actions for ${alert.title}`}>
                              <MoreHorizontal size={15} />
                            </Button>
                          </Menu.Trigger>
                          <Portal>
                            <Menu.Positioner>
                              <Menu.Content borderRadius="12px" p={1}>
                                <Menu.Item value="view" onClick={() => navigate(APP_ROUTES.memberAlerts.detail(alert.uniqueId))} cursor="pointer" px={3} py={2} borderRadius="8px">
                                  View detail
                                </Menu.Item>
                                <Menu.Item value="resend" onClick={() => setPending({ type: "resend", alert })} cursor="pointer" px={3} py={2} borderRadius="8px">
                                  <RefreshCw size={14} />
                                  Resend
                                </Menu.Item>
                                <Menu.Item value="delete" onClick={() => setPending({ type: "delete", alert })} color="red.600" cursor="pointer" px={3} py={2} borderRadius="8px">
                                  <Trash2 size={14} />
                                  Delete
                                </Menu.Item>
                              </Menu.Content>
                            </Menu.Positioner>
                          </Portal>
                        </Menu.Root>
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        <Text
                          fontSize="sm"
                          fontWeight="600"
                          color="brand.600"
                          cursor="pointer"
                          lineClamp={1}
                          onClick={() => navigate(APP_ROUTES.memberAlerts.detail(alert.uniqueId))}
                        >
                          {alert.title}
                        </Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        <Badge colorPalette={PRIORITY_COLOR[alert.priority]}>{alert.priority}</Badge>
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        <Text fontSize="sm" color="text.secondary">{channelLabel(alert.channels)}</Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        <Badge colorPalette={STATUS_COLOR[alert.status] ?? "gray"}>{alert.status}</Badge>
                      </Table.Cell>
                      <Table.Cell px={4} py={3} textAlign="right">
                        <Text fontSize="sm" color="text.secondary">{alert.recipientCount}</Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={3} textAlign="right">
                        <Text fontSize="sm" color="text.secondary">{alert.readCount}</Text>
                      </Table.Cell>
                      <Table.Cell px={4} py={3}>
                        <Text fontSize="sm" color="text.secondary">{formatDateTime(alert.sentAtUtc)}</Text>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table.Root>
          </Box>
        )}

        <Flex
          px={4}
          py={3}
          align="center"
          justify="space-between"
          borderTop="1px solid"
          borderColor="border.subtle"
          direction={{ base: "column", sm: "row" }}
          gap={3}
        >
          <Flex align="center" gap={2}>
            <Text fontSize="xs" color="text.secondary">Rows</Text>
            <NativeSelect.Root size="sm" w="80px">
              <NativeSelect.Field
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setPage(1)
                }}
                borderRadius="10px"
                ps={3}
                pe={7}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Flex>

          <Flex align="center" gap={3}>
            <Text fontSize="xs" color="text.secondary">
              Page {alertPage?.page ?? page} of {Math.max(totalPages, 1)}
            </Text>
            <Button size="sm" variant="outline" borderRadius="10px" disabled={page <= 1} cursor={page <= 1 ? "not-allowed" : "pointer"} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Prev
            </Button>
            <Button size="sm" variant="outline" borderRadius="10px" disabled={page >= totalPages} cursor={page >= totalPages ? "not-allowed" : "pointer"} onClick={() => setPage((current) => current + 1)}>
              Next
            </Button>
          </Flex>
        </Flex>
      </Box>

      {pending ? (
        <ConfirmAlertDialog
          title={pending.type === "resend" ? "Resend alert?" : "Delete alert?"}
          message={
            pending.type === "resend"
              ? `"${pending.alert.title}" will be sent again to all ${pending.alert.recipientCount} recipient(s).`
              : `"${pending.alert.title}" will be permanently deleted.`
          }
          confirmLabel={pending.type === "resend" ? "Resend" : "Delete"}
          tone={pending.type === "delete" ? "danger" : "brand"}
          isLoading={resendMutation.isPending || deleteMutation.isPending}
          onConfirm={handleConfirm}
          onClose={() => setPending(null)}
        />
      ) : null}
    </Stack>
  )
}
