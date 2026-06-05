import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Flex,
  Input,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react"
import { PencilLine, Plus, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { SessionUtcDateTimeField } from "./SessionUtcDateTimeField"
import {
  createSessionWizardTicketPricePeriod,
  deleteSessionWizardTicketPricePeriod,
  fetchSessionWizardBooking,
  updateSessionWizardTicketPricePeriod,
  type SessionWizardTicket,
  type SessionWizardTicketPricePeriod,
} from "@/api/sessions"
import { extractApiError } from "@/utils/errors"

interface SessionTicketPricePeriodsSectionProps {
  sessionId: string
  ticket: SessionWizardTicket | null
}

export interface SessionTicketPricePeriodsSectionHandle {
  persistDrafts: (ticketUniqueId: string) => Promise<void>
  resetDrafts: () => void
}

function formatMoneyInput(value: string) {
  const cleaned = value.replace(/,/g, "").replace(/[^\d.]/g, "")

  if (!cleaned) {
    return ""
  }

  const dotIndex = cleaned.indexOf(".")
  if (dotIndex === -1) {
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  const integerPart = cleaned.slice(0, dotIndex).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  const decimalPart = cleaned
    .slice(dotIndex + 1)
    .replace(/\./g, "")

  return `${integerPart || "0"}.${decimalPart}`
}

function parseMoneyInput(value: string) {
  const normalized = value.replace(/,/g, "").trim()
  if (!normalized) {
    return null
  }

  const parsed = Number(normalized.startsWith(".") ? `0${normalized}` : normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function formatMoneyDisplay(value: string) {
  const parsed = parseMoneyInput(value)
  if (parsed === null) {
    return value || "0"
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: parsed % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(parsed)
}

function toDateValue(value: string | null) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDateTime(value: string) {
  const parsed = toDateValue(value)
  return parsed ? format(parsed, "dd-MMM-yyyy hh:mm aa") : "—"
}

function toTicketPricePeriodPayload(
  amount: string,
  startDateTime: Date | null,
  endDateTime: Date | null,
) {
  return {
    amount: parseMoneyInput(amount) ?? 0,
    startDateTime: startDateTime ? startDateTime.toISOString() : "",
    endDateTime: endDateTime ? endDateTime.toISOString() : "",
  }
}

function isTimepickerInteraction(target: EventTarget | null) {
  return target instanceof HTMLElement && !!target.closest(".tp-ui, .tp-ui-modal, .tp-ui-popover, .tp-ui-wrapper")
}

function getTimepickerPersistentElements() {
  return [
    document.querySelector(".tp-ui-modal"),
    document.querySelector(".tp-ui-popover"),
    document.querySelector(".tp-ui-wrapper"),
    document.querySelector(".tp-ui"),
  ].filter((element): element is Element => element instanceof Element)
}

export const SessionTicketPricePeriodsSection = forwardRef<
  SessionTicketPricePeriodsSectionHandle,
  SessionTicketPricePeriodsSectionProps
>(function SessionTicketPricePeriodsSection({ sessionId, ticket }, ref) {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editingPricePeriodId, setEditingPricePeriodId] = useState<string | null>(null)
  const [pricePeriodToDelete, setPricePeriodToDelete] = useState<{ uniqueId: string; amount: string } | null>(null)
  const [amount, setAmount] = useState("")
  const [startDateTime, setStartDateTime] = useState<Date | null>(null)
  const [endDateTime, setEndDateTime] = useState<Date | null>(null)
  const [amountError, setAmountError] = useState("")
  const [startDateTimeError, setStartDateTimeError] = useState("")
  const [endDateTimeError, setEndDateTimeError] = useState("")
  const [formError, setFormError] = useState("")
  const [ticketIdOverride, setTicketIdOverride] = useState<string | null>(ticket?.uniqueId ?? null)
  const [pricePeriods, setPricePeriods] = useState<SessionWizardTicketPricePeriod[]>(ticket?.pricePeriods ?? [])
  const [isDraftMode, setIsDraftMode] = useState(!ticket?.uniqueId)
  const amountInputRef = useRef<HTMLInputElement>(null)

  const effectiveTicketId = ticket?.uniqueId ?? ticketIdOverride
  const bookingQuery = queryClient.getQueryData(["sessions", { sessionId, step: "booking" }]) as
    | { bookingStartDate?: string | null; bookingEndDate?: string | null }
    | undefined
  const bookingWindowQuery = useQuery({
    queryKey: ["sessions", { sessionId, step: "booking-window" }],
    queryFn: () => fetchSessionWizardBooking(sessionId),
    enabled: !!sessionId,
    retry: false,
    initialData: bookingQuery
      ? {
          bookingStartDate: bookingQuery.bookingStartDate ?? null,
          bookingEndDate: bookingQuery.bookingEndDate ?? null,
        }
      : undefined,
  })

  const sortedPricePeriods = useMemo(
    () =>
      [...pricePeriods].sort((left, right) => {
        return left.startDateTime.localeCompare(right.startDateTime)
      }),
    [pricePeriods],
  )

  useEffect(() => {
    if (!ticket?.uniqueId) {
      return
    }

    setTicketIdOverride(ticket.uniqueId)
    setPricePeriods(ticket.pricePeriods ?? [])
    setIsDraftMode(false)
  }, [ticket?.uniqueId, ticket?.pricePeriods])

  const createMutation = useMutation({
    mutationFn: (payload: { amount: number; startDateTime: string; endDateTime: string }) =>
      createSessionWizardTicketPricePeriod(sessionId, effectiveTicketId ?? "", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions", { sessionId, step: "ticket" }] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { pricePeriodUniqueId: string; amount: number; startDateTime: string; endDateTime: string }) =>
      updateSessionWizardTicketPricePeriod(sessionId, effectiveTicketId ?? "", payload.pricePeriodUniqueId, {
        amount: payload.amount,
        startDateTime: payload.startDateTime,
        endDateTime: payload.endDateTime,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions", { sessionId, step: "ticket" }] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (pricePeriodUniqueId: string) =>
      deleteSessionWizardTicketPricePeriod(sessionId, effectiveTicketId ?? "", pricePeriodUniqueId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions", { sessionId, step: "ticket" }] })
    },
  })

  useImperativeHandle(ref, () => ({
    async persistDrafts(ticketUniqueId: string) {
      setTicketIdOverride(ticketUniqueId)
      setIsDraftMode(false)

      if (pricePeriods.length === 0) {
        return
      }

      const persistedRows: SessionWizardTicketPricePeriod[] = []
      for (const period of pricePeriods) {
        const savedPeriod = await createSessionWizardTicketPricePeriod(sessionId, ticketUniqueId, {
          amount: parseMoneyInput(period.amount) ?? 0,
          startDateTime: period.startDateTime,
          endDateTime: period.endDateTime,
        })
        persistedRows.push(savedPeriod)
      }

      setPricePeriods(persistedRows)
      await queryClient.invalidateQueries({ queryKey: ["sessions", { sessionId, step: "ticket" }] })
    },
    resetDrafts() {
      setTicketIdOverride(ticket?.uniqueId ?? null)
      setPricePeriods(ticket?.pricePeriods ?? [])
      setIsDraftMode(!ticket?.uniqueId)
      setEditingPricePeriodId(null)
      setAmount("")
      setStartDateTime(null)
      setEndDateTime(null)
      setAmountError("")
      setStartDateTimeError("")
      setEndDateTimeError("")
      setFormError("")
      createMutation.reset()
      updateMutation.reset()
    },
  }), [createMutation, pricePeriods, queryClient, sessionId, ticket?.pricePeriods, ticket?.uniqueId, updateMutation])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      amountInputRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [isOpen])

  function resetForm() {
    setEditingPricePeriodId(null)
    setAmount("")
    setStartDateTime(null)
    setEndDateTime(null)
    setAmountError("")
    setStartDateTimeError("")
    setEndDateTimeError("")
    setFormError("")
    createMutation.reset()
    updateMutation.reset()
  }

  function openNewDialog() {
    resetForm()
    setIsDraftMode(!effectiveTicketId)
    setIsOpen(true)
  }

  function openEditDialog(pricePeriod: SessionWizardTicketPricePeriod) {
    setEditingPricePeriodId(pricePeriod.uniqueId)
    setAmount(formatMoneyInput(pricePeriod.amount))
    setStartDateTime(toDateValue(pricePeriod.startDateTime))
    setEndDateTime(toDateValue(pricePeriod.endDateTime))
    setAmountError("")
    setStartDateTimeError("")
    setEndDateTimeError("")
    setFormError("")
    createMutation.reset()
    updateMutation.reset()
    setIsOpen(true)
  }

  async function handleSave(closeAfterSave: boolean) {
    const parsedAmount = parseMoneyInput(amount)

    let hasError = false
    if (parsedAmount === null || parsedAmount <= 0) {
      setAmountError("Amount is required.")
      hasError = true
    } else {
      setAmountError("")
    }

    if (!startDateTime) {
      setStartDateTimeError("Start date/time is required.")
      hasError = true
    } else {
      setStartDateTimeError("")
    }

    if (!endDateTime) {
      setEndDateTimeError("End date/time is required.")
      hasError = true
    } else {
      setEndDateTimeError("")
    }

    if (!startDateTime || !endDateTime) {
      setFormError("")
      if (hasError) {
        return
      }
    }

    if (hasError) {
      setFormError("")
      return
    }

    if (startDateTime && endDateTime && endDateTime <= startDateTime) {
      setFormError("End date/time must be after the start date/time.")
      return
    }

    if (isDraftMode || !effectiveTicketId) {
      const resolvedAmount = parsedAmount ?? 0
      const resolvedStartDateTime = startDateTime as Date
      const resolvedEndDateTime = endDateTime as Date
      const nextPeriod = {
        uniqueId: editingPricePeriodId ?? (window.crypto?.randomUUID?.() ?? `${Date.now()}`),
        amount: formatMoneyInput(resolvedAmount.toString()),
        startDateTime: resolvedStartDateTime.toISOString(),
        endDateTime: resolvedEndDateTime.toISOString(),
        currentStatus: "Scheduled",
      } satisfies SessionWizardTicketPricePeriod

      setPricePeriods((current) => {
        const index = current.findIndex((item) => item.uniqueId === editingPricePeriodId)
        if (index >= 0) {
          const next = [...current]
          next[index] = nextPeriod
          return next
        }

        return [...current, nextPeriod]
      })

      if (closeAfterSave) {
        setIsOpen(false)
        resetForm()
        return
      }

      resetForm()
      return
    }

    if (hasError || !effectiveTicketId) {
      return
    }

    const payload = toTicketPricePeriodPayload(amount, startDateTime, endDateTime)

    try {
      if (editingPricePeriodId) {
        await updateMutation.mutateAsync({
          pricePeriodUniqueId: editingPricePeriodId,
          ...payload,
        })
      } else {
        const createdPeriod = await createMutation.mutateAsync(payload)
        setPricePeriods((current) => [...current.filter((item) => item.uniqueId !== createdPeriod.uniqueId), createdPeriod])
      }
    } catch {
      return
    }

    if (closeAfterSave) {
      setIsOpen(false)
      resetForm()
      return
    }

    resetForm()
  }

  function handleDelete() {
    if (!pricePeriodToDelete) {
      return
    }

    if (isDraftMode || !effectiveTicketId) {
      setPricePeriods((current) => current.filter((item) => item.uniqueId !== pricePeriodToDelete.uniqueId))
      setIsDeleteOpen(false)
      setPricePeriodToDelete(null)
      return
    }

    deleteMutation.mutate(pricePeriodToDelete.uniqueId, {
      onSuccess: () => {
        setPricePeriods((current) => current.filter((item) => item.uniqueId !== pricePeriodToDelete.uniqueId))
        setIsDeleteOpen(false)
        setPricePeriodToDelete(null)
      },
    })
  }

  return (
    <Box
      minH="full"
      border="1px solid"
      borderColor="gray.300"
      borderRadius="20px"
      bg="white"
      overflow="hidden"
    >
      <Flex align="center" justify="space-between" gap={3} px={5} py={4} borderBottom="1px solid" borderColor="gray.200">
        <Box>
          <Text fontSize="md" fontWeight="800" color="gray.900">
            Tenure Based Pricing
          </Text>
          <Text fontSize="sm" color="gray.600">
            Add discounted pricing windows for this ticket.
          </Text>
        </Box>

        <Button
          variant="outline"
          aria-label="Add tenure based pricing"
          title="Add tenure based pricing"
          borderRadius="999px"
          h="44px"
          w="44px"
          minW="44px"
          p={0}
          onClick={openNewDialog}
        >
          <Plus size={18} />
        </Button>
      </Flex>

      <Box overflowX="auto" maxH="calc(90vh - 260px)" overflowY="auto">
        <Table.Root variant="line" size="sm" borderColor="gray.300">
          <Table.ColumnGroup>
            <Table.Column htmlWidth="22%" />
            <Table.Column htmlWidth="26%" />
            <Table.Column htmlWidth="26%" />
            <Table.Column htmlWidth="26%" />
          </Table.ColumnGroup>
          <Table.Header>
            <Table.Row bg="gray.50" borderColor="gray.300">
              <Table.ColumnHeader px={5} py={3} borderColor="gray.300" fontSize="xs" fontWeight="700">
                Amount
              </Table.ColumnHeader>
              <Table.ColumnHeader px={5} py={3} borderColor="gray.300" fontSize="xs" fontWeight="700">
                Start Date/Time
              </Table.ColumnHeader>
              <Table.ColumnHeader px={5} py={3} borderColor="gray.300" fontSize="xs" fontWeight="700">
                End Date/Time
              </Table.ColumnHeader>
              <Table.ColumnHeader px={4} py={3} borderColor="gray.300" textAlign="right" fontSize="xs" fontWeight="700">
                Action
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {sortedPricePeriods.length === 0 ? (
              <Table.Row borderColor="gray.300">
                <Table.Cell colSpan={4} px={5} py={8} borderColor="gray.300">
                  <Text fontSize="sm" color="gray.600">
                    No tenure based pricing added yet. Add rows now and save them with the ticket.
                  </Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              sortedPricePeriods.map((pricePeriod) => (
                <Table.Row key={pricePeriod.uniqueId} borderColor="gray.300">
                  <Table.Cell px={5} py={4} borderColor="gray.300">
                    <Text fontSize="sm" fontWeight="600" color="gray.900">
                      {formatMoneyDisplay(pricePeriod.amount)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell px={5} py={4} borderColor="gray.300">
                    <Text fontSize="sm" color="gray.900">
                      {formatDateTime(pricePeriod.startDateTime)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell px={5} py={4} borderColor="gray.300">
                    <Text fontSize="sm" color="gray.900">
                      {formatDateTime(pricePeriod.endDateTime)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell px={4} py={4} borderColor="gray.300">
                    <Flex justify="flex-end" gap={2}>
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Edit tenure pricing ${pricePeriod.amount}`}
                        borderRadius="full"
                        h="36px"
                        w="36px"
                        minW="36px"
                        p={0}
                        onClick={() => openEditDialog(pricePeriod)}
                      >
                        <PencilLine size={15} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        colorPalette="red"
                        aria-label={`Delete tenure pricing ${pricePeriod.amount}`}
                        borderRadius="full"
                        h="36px"
                        w="36px"
                        minW="36px"
                        p={0}
                        onClick={() => {
                          setPricePeriodToDelete({ uniqueId: pricePeriod.uniqueId, amount: pricePeriod.amount })
                          setIsDeleteOpen(true)
                        }}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Root>
      </Box>

      <Dialog.Root
        open={isOpen}
        onOpenChange={(details) => {
          setIsOpen(details.open)
          if (!details.open) {
            resetForm()
          }
        }}
        onInteractOutside={(event) => {
          if (isTimepickerInteraction(event.target) || isTimepickerInteraction(event.detail.target)) {
            event.preventDefault()
          }
        }}
        persistentElements={[
          () => getTimepickerPersistentElements()[0] ?? null,
          () => getTimepickerPersistentElements()[1] ?? null,
          () => getTimepickerPersistentElements()[2] ?? null,
          () => getTimepickerPersistentElements()[3] ?? null,
        ]}
        size="lg"
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            maxW={{ base: "100vw", md: "720px" }}
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
                    {editingPricePeriodId ? "Edit tenure pricing" : "Add tenure pricing"}
                  </Text>
                </Box>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close tenure pricing modal" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={6} py={6} overflowY="auto">
              <Stack gap={4}>
                <Box>
                  <Flex
                    align={{ base: "flex-start", md: "center" }}
                    direction={{ base: "column", md: "row" }}
                    justify="space-between"
                    gap={2}
                  >
                    <Text fontSize="xs" fontWeight="700" color="gray.600" textTransform="uppercase" letterSpacing="0.08em">
                      Booking Window
                    </Text>
                    <Text fontSize="sm" fontWeight="600" color="gray.900" textAlign={{ base: "left", md: "right" }}>
                      {bookingWindowQuery.data?.bookingStartDate
                        ? formatDateTime(bookingWindowQuery.data.bookingStartDate)
                        : "—"}{" "}
                      to{" "}
                      {bookingWindowQuery.data?.bookingEndDate
                        ? formatDateTime(bookingWindowQuery.data.bookingEndDate)
                        : "—"}
                    </Text>
                  </Flex>
                  <Text fontSize="xs" color="gray.600" mt={1}>
                    Use this window to define tenure based pricing.
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
                    Amount <Text as="span" color="red.500">*</Text>
                  </Text>
                  <Input
                    ref={amountInputRef}
                    value={amount}
                    onChange={(event) => {
                      setAmount(formatMoneyInput(event.target.value))
                      if (amountError) {
                        setAmountError("")
                      }
                    }}
                    placeholder="Discounted price"
                    border="1px solid"
                    borderColor="secondaryGray.100"
                    borderRadius="14px"
                    h="44px"
                    px={4}
                    w="full"
                    inputMode="decimal"
                    _focusVisible={{
                      borderColor: "brand.400",
                      boxShadow: "0 0 0 3px rgba(117, 81, 255, 0.15)",
                      outline: "none",
                    }}
                  />
                  {amountError ? (
                    <Text mt={2} fontSize="sm" color="red.500">
                      {amountError}
                    </Text>
                  ) : null}
                </Box>

                <Stack gap={5} maxW="760px">
                  <Box>
                    <Text fontSize="sm" fontWeight="700" color="gray.900" mb={2}>
                      From <Text as="span" color="red.500">*</Text>
                    </Text>
                    <Box bg="secondaryGray.300" borderRadius="16px" p={5}>
                    <SessionUtcDateTimeField
                      value={startDateTime}
                      error={startDateTimeError}
                      onChange={(nextStart) => {
                        setStartDateTime(nextStart)
                        if (endDateTime && nextStart && endDateTime <= nextStart) {
                          setEndDateTime(null)
                        }
                        if (startDateTimeError) {
                          setStartDateTimeError("")
                        }
                        if (formError) {
                          setFormError("")
                        }
                      }}
                    />
                    </Box>
                  </Box>

                  <Box>
                    <Text fontSize="sm" fontWeight="700" color="gray.900" mb={2}>
                      To <Text as="span" color="red.500">*</Text>
                    </Text>
                    <Box bg="secondaryGray.300" borderRadius="16px" p={5}>
                    <SessionUtcDateTimeField
                      value={endDateTime}
                      minDate={startDateTime ?? undefined}
                      error={endDateTimeError}
                      onChange={(nextEnd) => {
                        setEndDateTime(nextEnd)
                        if (endDateTimeError) {
                          setEndDateTimeError("")
                        }
                        if (formError) {
                          setFormError("")
                        }
                      }}
                    />
                    </Box>
                  </Box>
                </Stack>

                {formError ? (
                  <Text fontSize="sm" color="red.500">
                    {formError}
                  </Text>
                ) : null}
              </Stack>
            </Dialog.Body>

            <Box px={6} py={4} borderTop="1px solid" borderColor="gray.200" bg="gray.50">
              <Stack
                direction={{ base: "column", md: "row" }}
                gap={4}
                align={{ base: "stretch", md: "center" }}
                justify="space-between"
              >
                <Button
                  variant="outline"
                  colorPalette="gray"
                  borderRadius="12px"
                  borderColor="gray.300"
                  bg="white"
                  _hover={{ bg: "gray.50", borderColor: "gray.400" }}
                  w={{ base: "full", md: "auto" }}
                  minW={{ base: "full", md: "120px" }}
                  fontWeight="700"
                  onClick={() => {
                    setIsOpen(false)
                    resetForm()
                  }}
                >
                  Close
                </Button>

                <Flex gap={3} wrap="wrap" justify="flex-end" w={{ base: "full", md: "auto" }}>
                  <Button
                    variant="outline"
                    borderRadius="12px"
                    minW={{ base: "full", md: "170px" }}
                    onClick={() => {
                      void handleSave(false)
                    }}
                    loading={createMutation.isPending || updateMutation.isPending}
                    loadingText={editingPricePeriodId ? "Updating..." : "Saving..."}
                  >
                    Save &amp; Continue
                  </Button>
                  <Button
                    colorPalette="brand"
                    borderRadius="12px"
                    minW={{ base: "full", md: "170px" }}
                    onClick={() => {
                      void handleSave(true)
                    }}
                    loading={createMutation.isPending || updateMutation.isPending}
                    loadingText={editingPricePeriodId ? "Updating..." : "Saving..."}
                  >
                    Save &amp; Close
                  </Button>
                </Flex>
              </Stack>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <Dialog.Root
        open={isDeleteOpen}
        onOpenChange={(details) => {
          setIsDeleteOpen(details.open)
          if (!details.open) {
            setPricePeriodToDelete(null)
          }
        }}
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            maxW={{ base: "100vw", md: "460px" }}
            m={{ base: 0, md: "auto" }}
            overflow="hidden"
          >
            <Box px={6} pt={6} pb={4} borderBottom="1px solid" borderColor="gray.200">
              <Text fontSize="lg" fontWeight="800" color="gray.900">
                Delete tenure pricing?
              </Text>
            </Box>

            <Dialog.Body px={6} py={6}>
              <Stack gap={3}>
                <Text fontSize="sm" color="gray.700">
                  This will remove the tenure pricing row from the ticket.
                </Text>
                {deleteMutation.isError ? (
                  <Text fontSize="sm" color="red.500">
                    {extractApiError(deleteMutation.error)}
                  </Text>
                ) : null}
              </Stack>
            </Dialog.Body>

            <Box px={6} py={4} borderTop="1px solid" borderColor="gray.200" bg="gray.50">
              <Stack direction={{ base: "column", md: "row" }} gap={3} justify="space-between">
                <Button
                  variant="outline"
                  colorPalette="gray"
                  borderRadius="12px"
                  borderColor="gray.300"
                  bg="white"
                  _hover={{ bg: "gray.50", borderColor: "gray.400" }}
                  w={{ base: "full", md: "auto" }}
                  minW={{ base: "full", md: "140px" }}
                  order={{ base: 2, md: 1 }}
                  onClick={() => {
                    setIsDeleteOpen(false)
                    setPricePeriodToDelete(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  colorPalette="red"
                  borderRadius="12px"
                  w={{ base: "full", md: "auto" }}
                  minW={{ base: "full", md: "140px" }}
                  order={{ base: 1, md: 2 }}
                  loading={deleteMutation.isPending}
                  loadingText="Deleting..."
                  onClick={() => {
                    void handleDelete()
                  }}
                >
                  Delete
                </Button>
              </Stack>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  )
})
