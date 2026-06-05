import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Badge,
  Box,
  Button,
  CloseButton,
  Dialog,
  Flex,
  Input,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
} from "@chakra-ui/react"
import { PencilLine, Plus, Trash2 } from "lucide-react"
import { extractApiError } from "@/utils/errors"
import {
  createSessionWizardTicket,
  deleteSessionWizardTicket,
  fetchSessionWizardTickets,
  updateSessionWizardTicket,
  type SessionWizardTicket,
} from "@/api/sessions"
import {
  SessionTicketPricePeriodsSection,
  type SessionTicketPricePeriodsSectionHandle,
} from "./SessionTicketPricePeriodsSection"

interface SessionTicketStepProps {
  sessionId: string
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

  return `$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: parsed % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(parsed)}`
}

function formatCount(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("en-US").format(value)
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

export function SessionTicketStep({ sessionId }: SessionTicketStepProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [ticketName, setTicketName] = useState("")
  const [ticketDescription, setTicketDescription] = useState("")
  const [ticketTotalTickets, setTicketTotalTickets] = useState("")
  const [ticketPrice, setTicketPrice] = useState("")
  const [minimumPurchase, setMinimumPurchase] = useState("")
  const [maximumPurchase, setMaximumPurchase] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [ticketNameError, setTicketNameError] = useState("")
  const [ticketTotalTicketsError, setTicketTotalTicketsError] = useState("")
  const [ticketPriceError, setTicketPriceError] = useState("")
  const [minimumPurchaseError, setMinimumPurchaseError] = useState("")
  const [maximumPurchaseError, setMaximumPurchaseError] = useState("")
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null)
  const [ticketToDelete, setTicketToDelete] = useState<{ uniqueId: string; name: string } | null>(null)
  const ticketNameInputRef = useRef<HTMLInputElement>(null)
  const tenurePricingSectionRef = useRef<SessionTicketPricePeriodsSectionHandle>(null)
  const keepDraftTenureOnCloseRef = useRef(false)
  const queryClient = useQueryClient()

  const ticketsQuery = useQuery({
    queryKey: ["sessions", { sessionId, step: "ticket" }],
    queryFn: () => fetchSessionWizardTickets(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  const sortedTickets = useMemo(
    () => [...(ticketsQuery.data ?? [])].sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" })),
    [ticketsQuery.data],
  )
  const selectedTicket = useMemo(
    () => sortedTickets.find((ticket) => ticket.uniqueId === editingTicketId) ?? null,
    [editingTicketId, sortedTickets],
  )

  const createTicketMutation = useMutation({
    mutationFn: (payload: {
      name: string
      description: string | null
      totalQuantity: number
      fullPrice: number
      minPurchase: number | null
      maxPurchase: number | null
      isActive: boolean
    }) => createSessionWizardTicket(sessionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions", { sessionId, step: "ticket" }] })
    },
  })

  const updateTicketMutation = useMutation({
    mutationFn: (payload: {
      ticketUniqueId: string
      name: string
      description: string | null
      totalQuantity: number
      fullPrice: number
      minPurchase: number | null
      maxPurchase: number | null
      isActive: boolean
    }) =>
      updateSessionWizardTicket(sessionId, payload.ticketUniqueId, {
        name: payload.name,
        description: payload.description,
        totalQuantity: payload.totalQuantity,
        fullPrice: payload.fullPrice,
        minPurchase: payload.minPurchase,
        maxPurchase: payload.maxPurchase,
        isActive: payload.isActive,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions", { sessionId, step: "ticket" }] })
    },
  })

  const deleteTicketMutation = useMutation({
    mutationFn: (ticketUniqueId: string) => deleteSessionWizardTicket(sessionId, ticketUniqueId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions", { sessionId, step: "ticket" }] })
    },
  })

  const ticketActionError = createTicketMutation.error ?? updateTicketMutation.error
  const deleteActionError = deleteTicketMutation.error

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      ticketNameInputRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [isOpen])

  function resetTicketForm() {
    setTicketName("")
    setTicketDescription("")
    setTicketTotalTickets("")
    setTicketPrice("")
    setMinimumPurchase("")
    setMaximumPurchase("")
    setIsActive(true)
    setTicketNameError("")
    setTicketTotalTicketsError("")
    setTicketPriceError("")
    setMinimumPurchaseError("")
    setMaximumPurchaseError("")
    setEditingTicketId(null)
    createTicketMutation.reset()
    updateTicketMutation.reset()
  }

  function openNewTicketDialog() {
    resetTicketForm()
    keepDraftTenureOnCloseRef.current = false
    tenurePricingSectionRef.current?.resetDrafts()
    setIsOpen(true)
  }

  function openEditTicketDialog(ticket: SessionWizardTicket) {
    setEditingTicketId(ticket.uniqueId)
    setTicketName(ticket.name)
    setTicketDescription(ticket.description ?? "")
    setTicketTotalTickets(ticket.totalQuantity?.toString() ?? "")
    setTicketPrice(formatMoneyInput(ticket.fullPrice))
    setMinimumPurchase(ticket.minPurchase?.toString() ?? "")
    setMaximumPurchase(ticket.maxPurchase?.toString() ?? "")
    setIsActive(ticket.isActive)
    setTicketNameError("")
    setTicketTotalTicketsError("")
    setTicketPriceError("")
    setMinimumPurchaseError("")
    setMaximumPurchaseError("")
    createTicketMutation.reset()
    updateTicketMutation.reset()
    setIsOpen(true)
  }

  async function handleUpsertTicket(closeAfterSave: boolean) {
    const trimmedName = ticketName.trim()
    const trimmedDescription = ticketDescription.trim()
    const parsedTotalTickets = Number.parseInt(ticketTotalTickets, 10)
    const parsedPrice = parseMoneyInput(ticketPrice)
    const parsedMinimumPurchase = minimumPurchase.trim() ? Number.parseInt(minimumPurchase, 10) : null
    const parsedMaximumPurchase = maximumPurchase.trim() ? Number.parseInt(maximumPurchase, 10) : null

    let hasError = false

    if (!trimmedName) {
      setTicketNameError("Name is required.")
      hasError = true
    } else {
      setTicketNameError("")
    }

    if (!ticketTotalTickets.trim() || !Number.isInteger(parsedTotalTickets) || parsedTotalTickets <= 0) {
      setTicketTotalTicketsError("Total tickets is required.")
      hasError = true
    } else {
      setTicketTotalTicketsError("")
    }

    if (parsedPrice === null || parsedPrice < 0) {
      setTicketPriceError("Price is required.")
      hasError = true
    } else {
      setTicketPriceError("")
    }

    if (parsedMinimumPurchase !== null && (!Number.isInteger(parsedMinimumPurchase) || parsedMinimumPurchase <= 0)) {
      setMinimumPurchaseError("Minimum purchase must be greater than zero.")
      hasError = true
    } else {
      setMinimumPurchaseError("")
    }

    if (parsedMaximumPurchase !== null && (!Number.isInteger(parsedMaximumPurchase) || parsedMaximumPurchase <= 0)) {
      setMaximumPurchaseError("Maximum purchase must be greater than zero.")
      hasError = true
    } else if (parsedMaximumPurchase !== null) {
      const resolvedMinimum = parsedMinimumPurchase ?? 1
      const resolvedTotalTickets = parsedTotalTickets

      if (parsedMaximumPurchase <= resolvedMinimum) {
        setMaximumPurchaseError("Maximum purchase must be greater than minimum purchase.")
        hasError = true
      } else if (parsedMaximumPurchase >= resolvedTotalTickets) {
        setMaximumPurchaseError("Maximum purchase must be less than total tickets.")
        hasError = true
      } else {
        setMaximumPurchaseError("")
      }
    } else {
      setMaximumPurchaseError("")
    }

    if (hasError) {
      return
    }

    const fullPrice = parsedPrice as number
    const totalQuantity = parsedTotalTickets as number
    const resolvedMinimumPurchase = parsedMinimumPurchase
    const resolvedMaximumPurchase = parsedMaximumPurchase

    const payload = {
      name: trimmedName,
      description: trimmedDescription ? trimmedDescription : null,
      totalQuantity,
      fullPrice,
      minPurchase: resolvedMinimumPurchase,
      maxPurchase: resolvedMaximumPurchase,
      isActive,
    }

    try {
      const savedTicket = editingTicketId
        ? await updateTicketMutation.mutateAsync({
            ticketUniqueId: editingTicketId,
            ...payload,
          })
        : await createTicketMutation.mutateAsync(payload)

      setEditingTicketId(savedTicket.uniqueId)
      await tenurePricingSectionRef.current?.persistDrafts(savedTicket.uniqueId)

      if (closeAfterSave) {
        keepDraftTenureOnCloseRef.current = true
        setIsOpen(false)
        resetTicketForm()
        return
      }

      return
    } catch {
      return
    }
  }

  function handleDeleteTicket() {
    if (!ticketToDelete) {
      return
    }

    deleteTicketMutation.mutate(ticketToDelete.uniqueId, {
      onSuccess: () => {
        setIsDeleteOpen(false)
        setTicketToDelete(null)
      },
    })
  }

  return (
    <Stack gap={4}>
      <Flex align={{ base: "flex-start", md: "center" }} justify="space-between" gap={3} wrap="wrap">
        <Box>
          <Text fontSize="lg" fontWeight="800" color="gray.900">
            Tickets
          </Text>
          <Text fontSize="sm" color="gray.600">
            Manage ticket tiers for this session.
          </Text>
        </Box>

        <Button
          variant="outline"
          aria-label="Add ticket"
          title="Add ticket"
          borderRadius="999px"
          h="44px"
          w="44px"
          minW="44px"
          p={0}
          onClick={openNewTicketDialog}
        >
          <Plus size={18} />
        </Button>
      </Flex>

      <Box overflowX="auto" borderRadius="20px" border="1px solid" borderColor="gray.300" bg="app.bg">
        <Table.Root variant="line" size="sm" borderColor="gray.300">
          <Table.ColumnGroup>
            <Table.Column htmlWidth="36%" />
            <Table.Column htmlWidth="18%" />
            <Table.Column htmlWidth="16%" />
            <Table.Column htmlWidth="14%" />
            <Table.Column htmlWidth="16%" />
          </Table.ColumnGroup>
          <Table.Header>
            <Table.Row bg="app.bg" borderColor="gray.300">
              <Table.ColumnHeader
                px={6}
                py={3}
                borderColor="gray.300"
                fontSize="xs"
                fontWeight="700"
                color="text.secondary"
                textTransform="uppercase"
                letterSpacing="0.05em"
              >
                Name
              </Table.ColumnHeader>
              <Table.ColumnHeader
                px={6}
                py={3}
                borderColor="gray.300"
                fontSize="xs"
                fontWeight="700"
                color="text.secondary"
                textTransform="uppercase"
                letterSpacing="0.05em"
              >
                Price
              </Table.ColumnHeader>
              <Table.ColumnHeader
                px={6}
                py={3}
                borderColor="gray.300"
                fontSize="xs"
                fontWeight="700"
                color="text.secondary"
                textTransform="uppercase"
                letterSpacing="0.05em"
              >
                Total Tickets
              </Table.ColumnHeader>
              <Table.ColumnHeader
                px={6}
                py={3}
                borderColor="gray.300"
                fontSize="xs"
                fontWeight="700"
                color="text.secondary"
                textTransform="uppercase"
                letterSpacing="0.05em"
              >
                Active
              </Table.ColumnHeader>
              <Table.ColumnHeader
                px={4}
                py={3}
                borderColor="gray.300"
                textAlign="right"
                fontSize="xs"
                fontWeight="700"
                color="text.secondary"
                textTransform="uppercase"
                letterSpacing="0.05em"
              >
                Action
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {ticketsQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Table.Row key={`ticket-skeleton-${index}`} borderColor="gray.300">
                  <Table.Cell px={6} py={4} borderColor="gray.300">
                    <Skeleton h="18px" w="80%" />
                  </Table.Cell>
                  <Table.Cell px={6} py={4} borderColor="gray.300">
                    <Skeleton h="18px" w="70%" />
                  </Table.Cell>
                  <Table.Cell px={6} py={4} borderColor="gray.300">
                    <Skeleton h="18px" w="60%" />
                  </Table.Cell>
                  <Table.Cell px={6} py={4} borderColor="gray.300">
                    <Skeleton h="18px" w="50%" />
                  </Table.Cell>
                  <Table.Cell px={4} py={4} borderColor="gray.300">
                    <Flex justify="flex-end" gap={2}>
                      <Skeleton borderRadius="full" h="36px" w="36px" />
                      <Skeleton borderRadius="full" h="36px" w="36px" />
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))
            ) : sortedTickets.length > 0 ? (
              sortedTickets.map((ticket) => (
                <Table.Row key={ticket.uniqueId} _hover={{ bg: "app.bg" }} transition="background 0.15s" borderColor="gray.300">
                  <Table.Cell px={6} py={4} borderColor="gray.300">
                    <Text fontSize="sm" fontWeight="600" color="text.primary" lineClamp={1}>
                      {ticket.name}
                    </Text>
                  </Table.Cell>
                  <Table.Cell px={6} py={4} borderColor="gray.300">
                    <Text fontSize="sm" color="text.primary">
                      {formatMoneyDisplay(ticket.fullPrice)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell px={6} py={4} borderColor="gray.300">
                    <Text fontSize="sm" color="text.primary">
                      {formatCount(ticket.totalQuantity)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell px={6} py={4} borderColor="gray.300">
                    <Badge colorPalette={ticket.isActive ? "green" : "gray"} variant="subtle">
                      {ticket.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell px={4} py={4} borderColor="gray.300">
                    <Flex justify="flex-end" gap={2}>
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Edit ${ticket.name}`}
                        borderRadius="full"
                        h="36px"
                        w="36px"
                        minW="36px"
                        p={0}
                        onClick={() => openEditTicketDialog(ticket)}
                      >
                        <PencilLine size={15} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        colorPalette="red"
                        aria-label={`Delete ${ticket.name}`}
                        borderRadius="full"
                        h="36px"
                        w="36px"
                        minW="36px"
                        p={0}
                        onClick={() => {
                          deleteTicketMutation.reset()
                          setTicketToDelete({ uniqueId: ticket.uniqueId, name: ticket.name })
                          setIsDeleteOpen(true)
                        }}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))
            ) : (
              <Table.Row borderColor="gray.300">
                <Table.Cell px={6} py={8} borderColor="gray.300" colSpan={5}>
                  <Text fontSize="sm" color="gray.600">
                    No tickets added yet.
                  </Text>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      </Box>

      {ticketsQuery.isError ? (
        <Text fontSize="sm" color="red.500">
          {extractApiError(ticketsQuery.error)}
        </Text>
      ) : null}

      {ticketActionError ? (
        <Text fontSize="sm" color="red.500">
          {extractApiError(ticketActionError)}
        </Text>
      ) : null}

      <Dialog.Root
        open={isOpen}
        onOpenChange={(details) => {
          setIsOpen(details.open)
          if (!details.open) {
            if (!keepDraftTenureOnCloseRef.current) {
              tenurePricingSectionRef.current?.resetDrafts()
            }
            keepDraftTenureOnCloseRef.current = false
            resetTicketForm()
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
            w={{ base: "100vw", md: "95vw", xl: "1400px" }}
            maxW={{ base: "100vw", md: "95vw", xl: "1400px" }}
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
                    {editingTicketId ? "Edit ticket" : "Add ticket"}
                  </Text>
                </Box>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close ticket modal" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={{ base: 6, md: 8 }} py={6} overflowY="auto">
              <SimpleGrid
                columns={{ base: 1, lg: 2 }}
                gap={6}
                alignItems="start"
              >
                <Stack gap={4} pr={{ base: 0, lg: 6 }} borderRight={{ base: "none", lg: "2px solid" }} borderColor={{ base: "transparent", lg: "gray.200" }}>
                  <Box>
                    <Flex align="center" justify="space-between" gap={4} wrap="wrap" mb={2}>
                      <Text fontSize="sm" fontWeight="600" color="navy.700">
                        Name <Text as="span" color="red.500">*</Text>
                      </Text>

                      <Switch.Root
                        checked={isActive}
                        onCheckedChange={(details) => setIsActive(Boolean(details.checked))}
                        colorPalette="brand"
                      >
                        <Switch.HiddenInput />
                        <Switch.Control />
                        <Switch.Label>
                          <Text fontSize="sm" fontWeight="600" color="navy.700">
                            Active
                          </Text>
                        </Switch.Label>
                      </Switch.Root>
                    </Flex>

                    <Input
                      ref={ticketNameInputRef}
                      value={ticketName}
                      onChange={(event) => {
                        setTicketName(event.target.value)
                        if (ticketNameError) {
                          setTicketNameError("")
                        }
                      }}
                      placeholder="Ticket name"
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
                    {ticketNameError ? (
                      <Text mt={2} fontSize="sm" color="red.500">
                        {ticketNameError}
                      </Text>
                    ) : null}
                  </Box>

                  <Box>
                    <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
                      Description
                    </Text>
                    <Textarea
                      value={ticketDescription}
                      onChange={(event) => {
                        setTicketDescription(event.target.value)
                      }}
                      placeholder="Optional description"
                      resize="none"
                      border="1px solid"
                      borderColor="secondaryGray.100"
                      borderRadius="14px"
                      minH="100px"
                      px={4}
                      py={3}
                      w="full"
                      _focusVisible={{
                        borderColor: "brand.400",
                        boxShadow: "0 0 0 3px rgba(117, 81, 255, 0.15)",
                        outline: "none",
                      }}
                    />
                  </Box>

                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    <Box>
                      <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
                        Total Tickets <Text as="span" color="red.500">*</Text>
                      </Text>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={ticketTotalTickets}
                        onChange={(event) => {
                          setTicketTotalTickets(event.target.value.replace(/[^\d]/g, ""))
                          if (ticketTotalTicketsError) {
                            setTicketTotalTicketsError("")
                          }
                        }}
                        placeholder="Total ticket count"
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
                      {ticketTotalTicketsError ? (
                        <Text mt={2} fontSize="sm" color="red.500">
                          {ticketTotalTicketsError}
                        </Text>
                      ) : null}
                    </Box>

                    <Box>
                      <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
                        Price ($) <Text as="span" color="red.500">*</Text>
                      </Text>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={ticketPrice}
                        onChange={(event) => {
                          setTicketPrice(formatMoneyInput(event.target.value))
                          if (ticketPriceError) {
                            setTicketPriceError("")
                          }
                        }}
                        placeholder="0"
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
                      {ticketPriceError ? (
                        <Text mt={2} fontSize="sm" color="red.500">
                          {ticketPriceError}
                        </Text>
                      ) : null}
                    </Box>

                    <Box>
                      <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
                        Minimum Purchase
                      </Text>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={minimumPurchase}
                        onChange={(event) => {
                          setMinimumPurchase(event.target.value.replace(/[^\d]/g, ""))
                          if (minimumPurchaseError) {
                            setMinimumPurchaseError("")
                          }
                        }}
                        placeholder="Optional"
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
                      {minimumPurchaseError ? (
                        <Text mt={2} fontSize="sm" color="red.500">
                          {minimumPurchaseError}
                        </Text>
                      ) : null}
                    </Box>

                    <Box>
                      <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
                        Maximum Purchase
                      </Text>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={maximumPurchase}
                        onChange={(event) => {
                          setMaximumPurchase(event.target.value.replace(/[^\d]/g, ""))
                          if (maximumPurchaseError) {
                            setMaximumPurchaseError("")
                          }
                        }}
                        placeholder="Optional"
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
                      {maximumPurchaseError ? (
                        <Text mt={2} fontSize="sm" color="red.500">
                          {maximumPurchaseError}
                        </Text>
                      ) : null}
                    </Box>
                  </SimpleGrid>
                </Stack>

                <Box pl={{ base: 0, lg: 2 }}>
                  <SessionTicketPricePeriodsSection ref={tenurePricingSectionRef} sessionId={sessionId} ticket={selectedTicket} />
                </Box>
              </SimpleGrid>
            </Dialog.Body>

            <Box px={6} py={4} borderTop="1px solid" borderColor="gray.200" bg="gray.50">
              <Stack direction={{ base: "column", md: "row" }} gap={4} align={{ base: "stretch", md: "center" }} justify="space-between">
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
                    resetTicketForm()
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
                      void handleUpsertTicket(false)
                    }}
                    loading={createTicketMutation.isPending || updateTicketMutation.isPending}
                    loadingText={editingTicketId ? "Updating..." : "Saving..."}
                  >
                    Save &amp; Continue
                  </Button>
                  <Button
                    colorPalette="brand"
                    borderRadius="12px"
                    minW={{ base: "full", md: "170px" }}
                    onClick={() => {
                      void handleUpsertTicket(true)
                    }}
                    loading={createTicketMutation.isPending || updateTicketMutation.isPending}
                    loadingText={editingTicketId ? "Updating..." : "Saving..."}
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
            setTicketToDelete(null)
            deleteTicketMutation.reset()
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
                Delete ticket?
              </Text>
            </Box>

            <Dialog.Body px={6} py={6}>
              <Stack gap={3}>
                <Text fontSize="sm" color="gray.700">
                  This will remove <Text as="span" fontWeight="700">{ticketToDelete?.name}</Text> from the session.
                </Text>
                {deleteActionError ? (
                  <Text fontSize="sm" color="red.500">
                    {extractApiError(deleteActionError)}
                  </Text>
                ) : null}
              </Stack>
            </Dialog.Body>

            <Box px={6} py={4} borderTop="1px solid" borderColor="gray.200">
              <Flex justify="flex-end" gap={3}>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsDeleteOpen(false)
                    setTicketToDelete(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  colorPalette="red"
                  loading={deleteTicketMutation.isPending}
                  loadingText="Deleting..."
                  onClick={() => {
                    void handleDeleteTicket()
                  }}
                >
                  Delete
                </Button>
              </Flex>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Stack>
  )
}
