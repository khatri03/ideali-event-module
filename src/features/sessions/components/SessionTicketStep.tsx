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
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type Modifier } from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ArrowUpDown, GripVertical, PencilLine, Plus, Trash2 } from "lucide-react"
import { extractApiError } from "@/utils/errors"
import { useSessionWizardActions } from "../hooks/useSessionWizardActions"
import {
  createSessionWizardTicket,
  deleteSessionWizardTicket,
  fetchSessionWizardBooking,
  fetchSessionWizardSeatSelection,
  fetchSessionWizardTickets,
  updateSessionWizardTicketDisplayOrder,
  updateSessionWizardTicket,
  updateSessionWizardTicketRemainingVisibility,
  type SessionWizardTicket,
  type SessionWizardTicketDisplayOrderRequest,
} from "@/api/sessions"
import {
  fetchSeatsIoChartCategories,
} from "@/api/seatsio"
import { StyledSelect } from "@/components/common/StyledSelect"
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

function toWallClockDate(value: string | null) {
  if (!value) {
    return null
  }

  const normalized = value.replace(/([zZ]|[+-]\d{2}:?\d{2})$/, "")
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDateTime(value: string) {
  const parsed = toWallClockDate(value)
  if (!parsed) {
    return "—"
  }

  return parsed
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(",", "")
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

const restrictToParentBounds: Modifier = ({ transform, containerNodeRect, draggingNodeRect }) => {
  if (!containerNodeRect || !draggingNodeRect) {
    return transform
  }

  const minX = containerNodeRect.left - draggingNodeRect.left
  const maxX = containerNodeRect.right - draggingNodeRect.right
  const minY = containerNodeRect.top - draggingNodeRect.top
  const maxY = containerNodeRect.bottom - draggingNodeRect.bottom

  return {
    ...transform,
    x: Math.min(Math.max(transform.x, minX), maxX),
    y: Math.min(Math.max(transform.y, minY), maxY),
  }
}

function SortableTicketRow({
  ticket,
}: {
  ticket: SessionWizardTicket
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.uniqueId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const DragIcon = GripVertical

  return (
    <Flex
      ref={setNodeRef}
      style={style}
      align="center"
      justify="space-between"
      gap={4}
      px={4}
      py={3}
      border="1px solid"
      borderColor={isDragging ? "brand.300" : "gray.200"}
      borderRadius="16px"
      bg={isDragging ? "brand.50" : "white"}
      boxShadow={isDragging ? "0 12px 30px rgba(117, 81, 255, 0.12)" : "none"}
      opacity={isDragging ? 0.88 : 1}
    >
      <Box minW={0}>
        <Text fontSize="sm" fontWeight="700" color="gray.900" lineClamp={1}>
          {ticket.name}
        </Text>
        <Text fontSize="xs" color="gray.600" lineClamp={1}>
          {formatMoneyDisplay(ticket.fullPrice)} · {formatCount(ticket.totalQuantity)} tickets
        </Text>
      </Box>

      <Button
        variant="outline"
        colorPalette="gray"
        borderRadius="full"
        h="40px"
        w="40px"
        minW="40px"
        p={0}
        cursor={isDragging ? "grabbing" : "grab"}
        _hover={{ bg: "gray.50" }}
        {...attributes}
        {...listeners}
      >
        <DragIcon size={16} />
      </Button>
    </Flex>
  )
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
  const [showRemainingTickets, setShowRemainingTickets] = useState(false)
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [sortedTicketDraft, setSortedTicketDraft] = useState<SessionWizardTicket[]>([])
  const [ticketNameError, setTicketNameError] = useState("")
  const [ticketTotalTicketsError, setTicketTotalTicketsError] = useState("")
  const [ticketPriceError, setTicketPriceError] = useState("")
  const [minimumPurchaseError, setMinimumPurchaseError] = useState("")
  const [maximumPurchaseError, setMaximumPurchaseError] = useState("")
  const [ticketCategoryId, setTicketCategoryId] = useState("")
  const [ticketCategoryError, setTicketCategoryError] = useState("")
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null)
  const [editingTicket, setEditingTicket] = useState<SessionWizardTicket | null>(null)
  const [ticketEditorInstanceId, setTicketEditorInstanceId] = useState(0)
  const [ticketToDelete, setTicketToDelete] = useState<{ uniqueId: string; name: string } | null>(null)
  const [ticketListError, setTicketListError] = useState("")
  const ticketNameInputRef = useRef<HTMLInputElement>(null)
  const tenurePricingSectionRef = useRef<SessionTicketPricePeriodsSectionHandle>(null)
  const keepDraftTenureOnCloseRef = useRef(false)
  const queryClient = useQueryClient()
  const { setPrimaryAction, setPrimaryActionReady } = useSessionWizardActions()
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

  const seatSelectionQuery = useQuery({
    queryKey: ["sessions", { sessionId, step: "seat-selection" }],
    queryFn: () => fetchSessionWizardSeatSelection(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  const isSeatSelectionEnabled = seatSelectionQuery.data?.offerPickingSeats ?? false
  const selectedChartUniqueId = seatSelectionQuery.data?.seatsIoChartUniqueId ?? null

  const chartCategoriesQuery = useQuery({
    queryKey: ["seatsio", { chartUniqueId: selectedChartUniqueId, step: "categories" }],
    queryFn: () => fetchSeatsIoChartCategories(selectedChartUniqueId ?? ""),
    enabled: Boolean(isSeatSelectionEnabled && selectedChartUniqueId),
    retry: false,
  })

  const ticketsQueryKey = ["sessions", { sessionId, step: "ticket" }]

  const ticketsQuery = useQuery({
    queryKey: ticketsQueryKey,
    queryFn: () => fetchSessionWizardTickets(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  const sortedTickets = useMemo(
    () =>
      [...(ticketsQuery.data ?? [])].sort(
        (left, right) =>
          left.displayOrder - right.displayOrder ||
          left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
      ),
    [ticketsQuery.data],
  )

  const assignedCategoryIds = useMemo(() => {
    const ids = new Set<number>()

    for (const ticket of sortedTickets) {
      if (editingTicketId && ticket.uniqueId === editingTicketId) {
        continue
      }

      if (typeof ticket.seatsIoChartCategoryId === "number") {
        ids.add(ticket.seatsIoChartCategoryId)
      }
    }

    return ids
  }, [editingTicketId, sortedTickets])

  const chartCategoryOptions = useMemo(
    () =>
      (chartCategoriesQuery.data ?? []).map((category) => {
        const categoryId = String(category.id)
        const isAssignedToAnotherTicket = assignedCategoryIds.has(category.id) && categoryId !== ticketCategoryId

        return {
          label: category.name,
          value: categoryId,
          swatchColor: category.color,
          description: isAssignedToAnotherTicket ? "Already assigned to another ticket" : undefined,
        }
      }),
    [assignedCategoryIds, chartCategoriesQuery.data, ticketCategoryId],
  )

  const hasChartCategories = Boolean(chartCategoriesQuery.isSuccess && chartCategoryOptions.length > 0)
  const hasNoChartCategories = Boolean(chartCategoriesQuery.isSuccess && chartCategoryOptions.length === 0)

  const categoryValidityDeps = [chartCategoriesQuery.isSuccess, chartCategoryOptions, ticketCategoryId]
  const [prevCategoryValidityDeps, setPrevCategoryValidityDeps] = useState(categoryValidityDeps)
  const categoryValidityDepsChanged = categoryValidityDeps.some((dep, index) => dep !== prevCategoryValidityDeps[index])
  if (categoryValidityDepsChanged) {
    setPrevCategoryValidityDeps(categoryValidityDeps)

    if (ticketCategoryId && chartCategoriesQuery.isSuccess && !chartCategoryOptions.some((option) => option.value === ticketCategoryId)) {
      setTicketCategoryId("")
    }
  }
  const createTicketMutation = useMutation({
    mutationFn: (payload: {
      name: string
      description: string | null
      seatsIoChartCategoryId: number | null
      totalQuantity: number
      fullPrice: number
      minPurchase: number | null
      maxPurchase: number | null
      isActive: boolean
      showRemainingTickets: boolean
    }) => createSessionWizardTicket(sessionId, payload),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ticketsQueryKey })
    },
  })

  const updateTicketMutation = useMutation({
    mutationFn: (payload: {
      ticketUniqueId: string
      name: string
      description: string | null
      seatsIoChartCategoryId: number | null
      totalQuantity: number
      fullPrice: number
      minPurchase: number | null
      maxPurchase: number | null
      isActive: boolean
      showRemainingTickets: boolean
    }) =>
      updateSessionWizardTicket(sessionId, payload.ticketUniqueId, {
        name: payload.name,
        description: payload.description,
        seatsIoChartCategoryId: payload.seatsIoChartCategoryId,
        totalQuantity: payload.totalQuantity,
        fullPrice: payload.fullPrice,
        minPurchase: payload.minPurchase,
        maxPurchase: payload.maxPurchase,
        isActive: payload.isActive,
        showRemainingTickets: payload.showRemainingTickets,
      }),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ticketsQueryKey })
    },
  })

  const remainingVisibilityMutation = useMutation({
    mutationFn: (payload: { ticketUniqueId: string; showRemainingTickets: boolean }) =>
      updateSessionWizardTicketRemainingVisibility(
        sessionId,
        payload.ticketUniqueId,
        payload.showRemainingTickets,
      ),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ticketsQueryKey })
      const previousTickets = queryClient.getQueryData<SessionWizardTicket[]>(ticketsQueryKey)

      queryClient.setQueryData<SessionWizardTicket[]>(ticketsQueryKey, (current) =>
        current?.map((ticket) =>
          ticket.uniqueId === payload.ticketUniqueId
            ? { ...ticket, showRemainingTickets: payload.showRemainingTickets }
            : ticket,
        ),
      )

      return { previousTickets }
    },
    onError: (_error, _payload, context) => {
      if (context?.previousTickets) {
        queryClient.setQueryData(ticketsQueryKey, context.previousTickets)
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ticketsQueryKey })
    },
  })

  const deleteTicketMutation = useMutation({
    mutationFn: (ticketUniqueId: string) => deleteSessionWizardTicket(sessionId, ticketUniqueId),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ticketsQueryKey })
    },
  })

  const sortTicketsMutation = useMutation({
    mutationFn: (payload: SessionWizardTicketDisplayOrderRequest) =>
      updateSessionWizardTicketDisplayOrder(sessionId, payload),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ticketsQueryKey })
    },
  })

  const ticketActionError = createTicketMutation.error ?? updateTicketMutation.error
  const deleteActionError = deleteTicketMutation.error
  const sortActionError = sortTicketsMutation.error
  const visibleTicketListError = sortedTickets.length === 0 ? ticketListError : ""
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      ticketNameInputRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [isOpen])

  const ticketNameDefaultDeps = [chartCategoriesQuery.data, editingTicketId, ticketCategoryId, ticketName]
  const [prevTicketNameDefaultDeps, setPrevTicketNameDefaultDeps] = useState(ticketNameDefaultDeps)
  const ticketNameDefaultDepsChanged = ticketNameDefaultDeps.some((dep, index) => dep !== prevTicketNameDefaultDeps[index])
  if (ticketNameDefaultDepsChanged) {
    setPrevTicketNameDefaultDeps(ticketNameDefaultDeps)

    if (!editingTicketId && ticketCategoryId && !ticketName.trim()) {
      const selectedCategory = chartCategoriesQuery.data?.find(
        (category) => String(category.id) === ticketCategoryId,
      )

      if (selectedCategory?.name) {
        setTicketName(selectedCategory.name)
      }
    }
  }

  useEffect(() => {
    setPrimaryActionReady(!ticketsQuery.isLoading && !ticketsQuery.isError)
    setPrimaryAction(async () => {
      if (sortedTickets.length === 0) {
        setTicketListError("At least one ticket is required before continuing.")
        throw new Error("At least one ticket is required before continuing.")
      }

      setTicketListError("")
    })

    return () => {
      setPrimaryAction(null)
      setPrimaryActionReady(true)
    }
  }, [setPrimaryAction, setPrimaryActionReady, sortedTickets.length, ticketsQuery.isError, ticketsQuery.isLoading])

  function openSortTicketsDialog() {
    setSortedTicketDraft(sortedTickets)
    setIsSortOpen(true)
  }

  function handleSortDragEnd(event: { active: { id: string }; over: { id: string } | null }) {
    if (!event.over || event.active.id === event.over.id) {
      return
    }

    setSortedTicketDraft((current) => {
      const oldIndex = current.findIndex((item) => item.uniqueId === event.active.id)
      const newIndex = current.findIndex((item) => item.uniqueId === event.over?.id)

      if (oldIndex < 0 || newIndex < 0) {
        return current
      }

      return arrayMove(current, oldIndex, newIndex)
    })
  }

  async function handleSortSave() {
    try {
      await sortTicketsMutation.mutateAsync({
        ticketUniqueIds: sortedTicketDraft.map((ticket) => ticket.uniqueId),
      })
      setIsSortOpen(false)
      setSortedTicketDraft([])
    } catch {
      return
    }
  }

  function closeSortDialog() {
    setIsSortOpen(false)
    setSortedTicketDraft([])
  }

  function resetTicketForm() {
    setTicketName("")
    setTicketDescription("")
    setTicketCategoryId("")
    setTicketTotalTickets("")
    setTicketPrice("")
    setMinimumPurchase("")
    setMaximumPurchase("")
    setIsActive(true)
    setShowRemainingTickets(false)
    setTicketNameError("")
    setTicketCategoryError("")
    setTicketTotalTicketsError("")
    setTicketPriceError("")
    setMinimumPurchaseError("")
    setMaximumPurchaseError("")
    setEditingTicketId(null)
    setEditingTicket(null)
    createTicketMutation.reset()
    updateTicketMutation.reset()
  }

  function resetTicketDraftForNextEntry() {
    keepDraftTenureOnCloseRef.current = false
    tenurePricingSectionRef.current?.resetDrafts()
    resetTicketForm()
    setEditingTicket(null)
    setEditingTicketId(null)
    setTicketEditorInstanceId((current) => current + 1)
  }

  function openNewTicketDialog() {
    resetTicketForm()
    keepDraftTenureOnCloseRef.current = false
    tenurePricingSectionRef.current?.resetDrafts()
    setTicketEditorInstanceId((current) => current + 1)
    setIsOpen(true)
  }

  function openEditTicketDialog(ticket: SessionWizardTicket) {
    setTicketEditorInstanceId((current) => current + 1)
    setEditingTicket(ticket)
    setEditingTicketId(ticket.uniqueId)
    setTicketName(ticket.name)
    setTicketDescription(ticket.description ?? "")
    setTicketCategoryId(ticket.seatsIoChartCategoryId ? String(ticket.seatsIoChartCategoryId) : "")
    setTicketTotalTickets(ticket.totalQuantity?.toString() ?? "")
    setTicketPrice(formatMoneyInput(ticket.fullPrice))
    setMinimumPurchase(ticket.minPurchase?.toString() ?? "")
    setMaximumPurchase(ticket.maxPurchase?.toString() ?? "")
    setIsActive(ticket.isActive)
    setShowRemainingTickets(ticket.showRemainingTickets)
    setTicketNameError("")
    setTicketCategoryError("")
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
    const parsedCategoryId = ticketCategoryId.trim() ? Number.parseInt(ticketCategoryId, 10) : null

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
      const resolvedTotalTickets = parsedTotalTickets

      if (parsedMinimumPurchase !== null && parsedMinimumPurchase >= parsedMaximumPurchase) {
        setMinimumPurchaseError("Must be less than maximum")
        setMaximumPurchaseError("Must be greater than minimum")
        hasError = true
      } else if (parsedMaximumPurchase >= resolvedTotalTickets) {
        setMaximumPurchaseError("Maximum purchase must be less than total tickets.")
        hasError = true
      } else {
        setMinimumPurchaseError("")
        setMaximumPurchaseError("")
      }
    } else {
      setMaximumPurchaseError("")
    }

    if (isSeatSelectionEnabled) {
      if (!parsedCategoryId || !Number.isInteger(parsedCategoryId)) {
        setTicketCategoryError("Category is required.")
        hasError = true
      } else {
        setTicketCategoryError("")
      }
    } else {
      setTicketCategoryError("")
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
      seatsIoChartCategoryId: isSeatSelectionEnabled ? parsedCategoryId : null,
      totalQuantity,
      fullPrice,
      minPurchase: resolvedMinimumPurchase,
      maxPurchase: resolvedMaximumPurchase,
      isActive,
      showRemainingTickets,
    }

    try {
      const savedTicket = editingTicketId
        ? await updateTicketMutation.mutateAsync({
            ticketUniqueId: editingTicketId,
            ...payload,
          })
        : await createTicketMutation.mutateAsync(payload)

      setEditingTicketId(savedTicket.uniqueId)
      setEditingTicket(savedTicket)
      setTicketCategoryId(savedTicket.seatsIoChartCategoryId ? String(savedTicket.seatsIoChartCategoryId) : "")
      await tenurePricingSectionRef.current?.persistDrafts(savedTicket.uniqueId)

      if (closeAfterSave) {
        setIsOpen(false)
        resetTicketDraftForNextEntry()
        return
      }

      resetTicketDraftForNextEntry()
      setIsOpen(true)
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

        <Flex gap={2}>
          {sortedTickets.length > 2 ? (
            <Button
              variant="outline"
              aria-label="Change display order"
              title="Change display order"
              borderRadius="999px"
              h="44px"
              w="44px"
              minW="44px"
              p={0}
              onClick={openSortTicketsDialog}
            >
              <ArrowUpDown size={18} />
            </Button>
          ) : null}
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
      </Flex>

      <Box overflowX="auto" borderRadius="20px" border="1px solid" borderColor="gray.300" bg="app.bg">
        <Table.Root variant="line" size="sm" borderColor="gray.300">
          <Table.ColumnGroup>
            <Table.Column htmlWidth="26%" />
            <Table.Column htmlWidth="14%" />
            <Table.Column htmlWidth="12%" />
            <Table.Column htmlWidth="12%" />
            <Table.Column htmlWidth="10%" />
            <Table.Column htmlWidth="12%" />
            <Table.Column htmlWidth="14%" />
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
                Pricing Window
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
                px={6}
                py={3}
                borderColor="gray.300"
                fontSize="xs"
                fontWeight="700"
                color="text.secondary"
                textTransform="uppercase"
                letterSpacing="0.05em"
              >
                Show Left
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
                  <Table.Cell px={6} py={4} borderColor="gray.300">
                    <Skeleton h="18px" w="60%" />
                  </Table.Cell>
                  <Table.Cell px={6} py={4} borderColor="gray.300">
                    <Skeleton borderRadius="999px" h="24px" w="44px" />
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
              sortedTickets.map((ticket) => {
                const isTogglingRemaining =
                  remainingVisibilityMutation.isPending &&
                  remainingVisibilityMutation.variables?.ticketUniqueId === ticket.uniqueId

                return (
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
                    <Text fontSize="sm" color="text.primary">
                      {ticket.pricePeriods.length > 0 ? "Yes" : "No"}
                    </Text>
                  </Table.Cell>
                  <Table.Cell px={6} py={4} borderColor="gray.300">
                    <Badge colorPalette={ticket.isActive ? "green" : "gray"} variant="subtle">
                      {ticket.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell px={6} py={4} borderColor="gray.300">
                    <Switch.Root
                      checked={ticket.showRemainingTickets}
                      disabled={isTogglingRemaining}
                      onCheckedChange={(details) =>
                        remainingVisibilityMutation.mutate({
                          ticketUniqueId: ticket.uniqueId,
                          showRemainingTickets: Boolean(details.checked),
                        })
                      }
                      colorPalette="brand"
                      aria-label={`Show tickets left for ${ticket.name}`}
                    >
                      <Switch.HiddenInput />
                      <Switch.Control cursor={isTogglingRemaining ? "not-allowed" : "pointer"} />
                    </Switch.Root>
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
                )
              })
            ) : (
              <Table.Row borderColor="gray.300">
                <Table.Cell px={6} py={8} borderColor="gray.300" colSpan={7}>
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

      {remainingVisibilityMutation.error ? (
        <Text fontSize="sm" color="red.500">
          {extractApiError(remainingVisibilityMutation.error)}
        </Text>
      ) : null}

      {visibleTicketListError ? (
        <Text fontSize="sm" color="red.500">
          {visibleTicketListError}
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
                  </Box>

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

                  {isSeatSelectionEnabled ? (
                    <Box>
                      <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
                        Category <Text as="span" color="red.500">*</Text>
                      </Text>
                      <StyledSelect
                        options={chartCategoryOptions}
                        value={ticketCategoryId}
                        onChange={(value) => {
                          setTicketCategoryId(value)
                          if (ticketCategoryError) {
                            setTicketCategoryError("")
                          }
                          if (value && !editingTicketId && !ticketName.trim()) {
                            const selectedCategory = chartCategoriesQuery.data?.find(
                              (category) => String(category.id) === value,
                            )

                            if (selectedCategory?.name) {
                              setTicketName(selectedCategory.name)
                            }
                          }
                        }}
                        placeholder={
                          !selectedChartUniqueId
                            ? "Select chart first"
                            : chartCategoriesQuery.isLoading
                              ? "Loading categories..."
                              : hasChartCategories
                                ? "Select category"
                                : "No Categories Found"
                        }
                        disabled={!selectedChartUniqueId || chartCategoriesQuery.isLoading}
                      />
                      {ticketCategoryError ? (
                        <Text mt={2} fontSize="sm" color="red.500">
                          {ticketCategoryError}
                        </Text>
                      ) : null}
                      {hasNoChartCategories && !chartCategoriesQuery.isLoading ? (
                        <Text mt={2} fontSize="sm" color="gray.600">
                          No categories are mapped to the selected chart yet.
                        </Text>
                      ) : null}
                    </Box>
                  ) : null}

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

                      <Switch.Root
                        mt={3}
                        checked={showRemainingTickets}
                        onCheckedChange={(details) => setShowRemainingTickets(Boolean(details.checked))}
                        colorPalette="brand"
                      >
                        <Switch.HiddenInput />
                        <Switch.Control cursor="pointer" />
                        <Switch.Label>
                          <Text fontSize="sm" fontWeight="600" color="navy.700">
                            Show tickets left on the registration form
                          </Text>
                        </Switch.Label>
                      </Switch.Root>
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
                  <SessionTicketPricePeriodsSection
                    key={ticketEditorInstanceId}
                    ref={tenurePricingSectionRef}
                    sessionId={sessionId}
                    ticket={editingTicket}
                  />
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
                    colorPalette="brand"
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
                    colorPalette="orange"
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
        open={isSortOpen}
        onOpenChange={(details) => {
          setIsSortOpen(details.open)
          if (!details.open) {
            closeSortDialog()
          }
        }}
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            w={{ base: "100vw", md: "820px" }}
            maxW={{ base: "100vw", md: "820px" }}
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
                    Sort tickets
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Drag tickets into the order you want them displayed.
                  </Text>
                </Box>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close sort tickets modal" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={6} py={6} overflowY="auto">
              <Stack gap={4}>
                {sortActionError ? (
                  <Text fontSize="sm" color="red.500">
                    {extractApiError(sortActionError)}
                  </Text>
                ) : null}

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToParentBounds]}
                  onDragEnd={({ active, over }) => handleSortDragEnd({ active: { id: String(active.id) }, over: over ? { id: String(over.id) } : null })}
                >
                  <SortableContext
                    items={sortedTicketDraft.map((ticket) => ticket.uniqueId)}
                    strategy={verticalListSortingStrategy}
                  >
                    <Stack gap={3}>
                      {sortedTicketDraft.length > 0 ? (
                        sortedTicketDraft.map((ticket) => (
                          <SortableTicketRow key={ticket.uniqueId} ticket={ticket} />
                        ))
                      ) : (
                        <Box border="1px solid" borderColor="gray.200" borderRadius="16px" px={4} py={6}>
                          <Text fontSize="sm" color="gray.600">
                            No tickets to sort yet.
                          </Text>
                        </Box>
                      )}
                    </Stack>
                  </SortableContext>
                </DndContext>
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
                  onClick={closeSortDialog}
                >
                  Close
                </Button>

                <Button
                  colorPalette="brand"
                  borderRadius="12px"
                  minW={{ base: "full", md: "170px" }}
                  onClick={() => {
                    void handleSortSave()
                  }}
                  loading={sortTicketsMutation.isPending}
                  loadingText="Saving..."
                  disabled={sortedTicketDraft.length === 0}
                >
                  Save
                </Button>
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

            <Box px={6} py={4} borderTop="1px solid" borderColor="gray.200" bg="gray.50">
              <Stack
                direction={{ base: "column-reverse", md: "row" }}
                gap={3}
                align={{ base: "stretch", md: "center" }}
                justify="flex-end"
              >
                <Button
                  variant="outline"
                  colorPalette="gray"
                  borderRadius="14px"
                  h="44px"
                  px={6}
                  minW={{ base: "full", md: "120px" }}
                  onClick={() => {
                    setIsDeleteOpen(false)
                    setTicketToDelete(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  colorPalette="red"
                  borderRadius="14px"
                  h="44px"
                  px={6}
                  minW={{ base: "full", md: "120px" }}
                  loading={deleteTicketMutation.isPending}
                  loadingText="Deleting..."
                  onClick={() => {
                    void handleDeleteTicket()
                  }}
                >
                  Delete
                </Button>
              </Stack>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Stack>
  )
}
