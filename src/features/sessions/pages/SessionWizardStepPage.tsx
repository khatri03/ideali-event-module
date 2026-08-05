import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
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
  Table,
  Text,
  Tooltip,
} from "@chakra-ui/react"
import { Calendar, PencilLine, Plus, Trash2 } from "lucide-react"
import { useParams } from "react-router-dom"
import { format, parseISO } from "date-fns"
import { Timepicker } from "timepicker-ui-react"
import type { ConfirmEventData } from "timepicker-ui"
import { EventDescriptionEditor } from "@/features/events"
import {
  SessionBannerStep,
  SessionETicketingStep,
  SessionGenreStep,
  SessionMembershipAccessStep,
  SessionSeatSelectionStep,
  SessionTicketStep,
} from "../components"
import {
  createOrganizerVenue,
  fetchOrganizerEvents,
  fetchOrganizerVenues,
  type OrganizerEventOption,
  type OrganizerVenueOption,
} from "@/api/organizer"
import {
  createSessionWizardSchedule,
  deleteSessionWizardSchedule,
  fetchSessionWizardDateTime,
  fetchSessionWizardDescription,
  fetchSessionWizardBooking,
  fetchSessionWizardDuration,
  fetchSessionWizardEvent,
  fetchSessionWizardName,
  fetchSessionWizardSchedule,
  fetchSessionWizardVenue,
  updateSessionWizardSchedule,
  updateSessionWizardDescription,
  updateSessionWizardDateTime,
  updateSessionWizardBooking,
  updateSessionWizardDuration,
  updateSessionWizardEvent,
  updateSessionWizardName,
  updateSessionWizardVenue,
} from "@/api/sessions"
import { StyledSelect } from "@/components/common/StyledSelect"
import { extractApiError } from "@/utils/errors"
import { getSessionWizardStepNumber, useSessionWizardNavigation } from "../hooks/useSessionWizard"
import { useSessionWizardActions } from "../hooks/useSessionWizardActions"
import { SessionReviewStep } from "../components"

export function SessionWizardStepPage() {
  const { activeStep } = useSessionWizardNavigation()
  const { sessionId } = useParams<{ sessionId?: string }>()

  if (!sessionId) {
    return <SessionStepPlaceholder label={activeStep?.label ?? "Session step"} />
  }

  if (activeStep?.slug === "description") {
    return <SessionDescriptionStep sessionId={sessionId} />
  }

  if (activeStep?.slug === "genre") {
    return <SessionGenreStep sessionId={sessionId} />
  }

  if (activeStep?.slug === "banner") {
    return <SessionBannerStep sessionId={sessionId} />
  }

  if (activeStep?.slug === "event") {
    return <SessionEventStep sessionId={sessionId} />
  }

  if (activeStep?.slug === "venue") {
    return <SessionVenueStep sessionId={sessionId} />
  }

  if (activeStep?.slug === "membership-access") {
    return <SessionMembershipAccessStep sessionId={sessionId} />
  }

  if (activeStep?.slug === "seat-selection") {
    return <SessionSeatSelectionStep sessionId={sessionId} />
  }

  if (activeStep?.slug === "dates-time") {
    return <SessionDatesTimeStep sessionId={sessionId} />
  }

  if (activeStep?.slug === "booking") {
    return <SessionBookingStep sessionId={sessionId} />
  }

  if (activeStep?.slug === "start-end") {
    return <SessionDurationStep sessionId={sessionId} />
  }

  if (activeStep?.slug === "schedule") {
    return <SessionScheduleStep sessionId={sessionId} />
  }

  if (activeStep?.slug === "ticket") {
    return <SessionTicketStep sessionId={sessionId} />
  }

  if (activeStep?.slug === "e-ticketing") {
    return <SessionETicketingStep sessionId={sessionId} />
  }

  if (activeStep?.slug === "review") {
    return <SessionReviewStep sessionId={sessionId} />
  }

  if (activeStep?.slug === "name" || !activeStep) {
    return <SessionNameStep sessionId={sessionId} />
  }

  return <SessionStepPlaceholder label={activeStep.label} />
}

function SessionStepShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={4}>
      <Badge borderRadius="999px" px={3} py={1} colorPalette="green" variant="subtle" alignSelf="flex-start">
        {label}
      </Badge>
      {children}
    </Stack>
  )
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

function SessionStepPlaceholder({ label }: { label: string }) {
  return (
    <SessionStepShell label={label}>
      <Text fontSize="lg" fontWeight="800" color="gray.900">
        {label}
      </Text>
      <Text fontSize="sm" color="gray.600">
        This step is scaffolded for now.
      </Text>
    </SessionStepShell>
  )
}

interface WizardProgressState {
  stepNo?: number
}

function updateWizardProgressCache(
  queryClient: ReturnType<typeof useQueryClient>,
  sessionId: string,
  stepNo: number,
) {
  queryClient.setQueryData(["sessions", "wizard-progress", sessionId], (current: WizardProgressState | undefined) => ({
    stepNo: Math.max(current?.stepNo ?? 0, stepNo),
  }))
}

async function invalidateSessionReviewQueries(queryClient: ReturnType<typeof useQueryClient>, sessionId: string) {
  await queryClient.invalidateQueries({ queryKey: ["sessions", "review", sessionId] })
}

function SessionScheduleStep({ sessionId }: { sessionId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [scheduleName, setScheduleName] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [scheduleNameError, setScheduleNameError] = useState("")
  const [scheduleTimeError, setScheduleTimeError] = useState("")
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [scheduleToDelete, setScheduleToDelete] = useState<{ uniqueId: string; name: string } | null>(null)
  const scheduleNameInputRef = useRef<HTMLInputElement>(null)
  const scheduleTimeInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const durationQuery = useQuery({
    queryKey: ["sessions", { sessionId, step: "start-end" }],
    queryFn: () => fetchSessionWizardDuration(sessionId),
    enabled: !!sessionId,
    retry: false,
  })
  const schedulesQuery = useQuery({
    queryKey: ["sessions", { sessionId, step: "schedule" }],
    queryFn: () => fetchSessionWizardSchedule(sessionId),
    enabled: !!sessionId,
    retry: false,
  })
  const sortedSchedules = useMemo(
    () =>
      [...(schedulesQuery.data ?? [])].sort((left, right) => {
        const timeCompare = left.scheduleTime.localeCompare(right.scheduleTime)
        if (timeCompare !== 0) {
          return timeCompare
        }

        return left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
      }),
    [schedulesQuery.data],
  )
  const createScheduleMutation = useMutation({
    mutationFn: (payload: { name: string; scheduleTime: string }) => createSessionWizardSchedule(sessionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions", { sessionId, step: "schedule" }] })
      await invalidateSessionReviewQueries(queryClient, sessionId)
    },
  })
  const updateScheduleMutation = useMutation({
    mutationFn: (payload: { scheduleUniqueId: string; name: string; scheduleTime: string }) =>
      updateSessionWizardSchedule(sessionId, payload.scheduleUniqueId, {
        name: payload.name,
        scheduleTime: payload.scheduleTime,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions", { sessionId, step: "schedule" }] })
      await invalidateSessionReviewQueries(queryClient, sessionId)
    },
  })
  const deleteScheduleMutation = useMutation({
    mutationFn: (scheduleUniqueId: string) => deleteSessionWizardSchedule(sessionId, scheduleUniqueId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions", { sessionId, step: "schedule" }] })
      await invalidateSessionReviewQueries(queryClient, sessionId)
    },
  })
  const scheduleActionError = createScheduleMutation.error ?? updateScheduleMutation.error
  const deleteActionError = deleteScheduleMutation.error

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      scheduleNameInputRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [isOpen])

  function resetScheduleForm() {
    setScheduleName("")
    setScheduleTime("")
    setScheduleNameError("")
    setScheduleTimeError("")
    setEditingScheduleId(null)
    createScheduleMutation.reset()
    updateScheduleMutation.reset()
  }

  async function handleUpsertSchedule(closeAfterSave: boolean) {
    const trimmedName = scheduleName.trim()

    let hasError = false

    if (!trimmedName) {
      setScheduleNameError("Name is required.")
      hasError = true
    } else {
      setScheduleNameError("")
    }

    if (!scheduleTime) {
      setScheduleTimeError("Time is required.")
      hasError = true
    } else {
      setScheduleTimeError("")
    }

    if (hasError) {
      return
    }

    try {
      if (editingScheduleId) {
        await updateScheduleMutation.mutateAsync({
          scheduleUniqueId: editingScheduleId,
          name: trimmedName,
          scheduleTime,
        })
      } else {
        await createScheduleMutation.mutateAsync({
          name: trimmedName,
          scheduleTime,
        })
      }
    } catch {
      return
    }

    if (closeAfterSave) {
      setIsOpen(false)
      resetScheduleForm()
      return
    }

    resetScheduleForm()
  }

  function handleDeleteSchedule() {
    if (!scheduleToDelete) {
      return
    }

    deleteScheduleMutation.mutate(scheduleToDelete.uniqueId, {
      onSuccess: () => {
        setIsDeleteOpen(false)
        setScheduleToDelete(null)
      },
    })
  }

  function handleScheduleTimeConfirm(data: ConfirmEventData) {
    if (!data.hour || !data.minutes) {
      return
    }

    const time24h = data.type
      ? to24hFromConfirm(data.hour, data.minutes, data.type)
      : `${data.hour.padStart(2, "0")}:${data.minutes.padStart(2, "0")}`

    setScheduleTime(time24h)
    if (scheduleTimeError) {
      setScheduleTimeError("")
    }
  }

  const sessionStartsLabel = durationQuery.data?.startDate
    ? format(parseISO(durationQuery.data.startDate), "dd-MMM-yyyy hh:mm aa")
    : "Not set"
  const sessionEndsLabel = durationQuery.data?.endDate
    ? format(parseISO(durationQuery.data.endDate), "dd-MMM-yyyy hh:mm aa")
    : "Not set"
  const sessionDateTimeRange = `${sessionStartsLabel} to ${sessionEndsLabel}`

  return (
    <SessionStepShell label="Schedule">
      <Flex justify="flex-end">
        <Tooltip.Root openDelay={300} closeDelay={100}>
          <Tooltip.Trigger asChild>
            <Button
              variant="outline"
              aria-label="Add schedule"
              borderRadius="999px"
              h="44px"
              w="44px"
              minW="44px"
              p={0}
              onClick={() => {
                resetScheduleForm()
                setIsOpen(true)
              }}
            >
              <Plus size={18} />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Positioner>
            <Tooltip.Content>Add schedule</Tooltip.Content>
          </Tooltip.Positioner>
        </Tooltip.Root>
      </Flex>

      <Flex align={{ base: "flex-start", md: "center" }} gap={3} wrap="wrap">
        <Text fontSize="lg" fontWeight="800" color="gray.900">
          Schedule
        </Text>
        <Text fontSize="sm" fontWeight="600" color="gray.700" cursor="default" title="Star/end date time">
          {sessionDateTimeRange}
        </Text>
      </Flex>

      <Box overflowX="auto" borderRadius="20px" border="1px solid" borderColor="gray.300" bg="app.bg">
        <Table.Root variant="line" size="sm" borderColor="gray.300">
          <Table.ColumnGroup>
            <Table.Column htmlWidth="60%" />
            <Table.Column htmlWidth="20%" />
            <Table.Column htmlWidth="20%" />
          </Table.ColumnGroup>
          <Table.Header>
            <Table.Row bg="app.bg" borderColor="gray.300">
              <Table.ColumnHeader px={6} py={3} borderColor="gray.300" fontSize="xs" fontWeight="700" color="text.secondary" textTransform="uppercase" letterSpacing="0.05em">
                Name
              </Table.ColumnHeader>
              <Table.ColumnHeader px={6} py={3} borderColor="gray.300" fontSize="xs" fontWeight="700" color="text.secondary" textTransform="uppercase" letterSpacing="0.05em">
                Time
              </Table.ColumnHeader>
              <Table.ColumnHeader px={4} py={3} borderColor="gray.300" textAlign="right" fontSize="xs" fontWeight="700" color="text.secondary" textTransform="uppercase" letterSpacing="0.05em">
                Action
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {sortedSchedules.length > 0 ? (
              sortedSchedules.map((schedule) => (
                <Table.Row
                  key={schedule.uniqueId}
                  _hover={{ bg: "app.bg" }}
                  transition="background 0.15s"
                  borderColor="gray.300"
                >
                  <Table.Cell px={6} py={4} borderColor="gray.300">
                    <Text fontSize="sm" fontWeight="600" color="text.primary" lineClamp={1}>
                      {schedule.name}
                    </Text>
                  </Table.Cell>
                  <Table.Cell px={6} py={4} borderColor="gray.300">
                    <Text fontSize="sm" color="text.primary">
                      {to12hDisplay(schedule.scheduleTime)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell px={4} py={4} borderColor="gray.300">
                    <Flex justify="flex-end" gap={2}>
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Edit ${schedule.name}`}
                        borderRadius="full"
                        h="36px"
                        w="36px"
                        minW="36px"
                        p={0}
                        onClick={() => {
                          setEditingScheduleId(schedule.uniqueId)
                          setScheduleName(schedule.name)
                          setScheduleTime(schedule.scheduleTime)
                          setScheduleNameError("")
                          setScheduleTimeError("")
                          createScheduleMutation.reset()
                          updateScheduleMutation.reset()
                          setIsOpen(true)
                        }}
                      >
                        <PencilLine size={15} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        colorPalette="red"
                        aria-label={`Delete ${schedule.name}`}
                        borderRadius="full"
                        h="36px"
                        w="36px"
                        minW="36px"
                        p={0}
                        onClick={() => {
                          deleteScheduleMutation.reset()
                          setScheduleToDelete({ uniqueId: schedule.uniqueId, name: schedule.name })
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
                <Table.Cell px={6} py={6} colSpan={3} borderColor="gray.300">
                  {schedulesQuery.isLoading ? (
                    <Skeleton h="20px" w="220px" borderRadius="8px" />
                  ) : (
                    <Text fontSize="sm" color="text.secondary">
                      No schedule items added yet.
                    </Text>
                  )}
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      </Box>

      {schedulesQuery.isError ? (
        <Text fontSize="sm" color="red.500">
          {extractApiError(schedulesQuery.error)}
        </Text>
      ) : null}

      <Dialog.Root
        open={isOpen}
        onOpenChange={(details) => {
          setIsOpen(details.open)
          if (!details.open) {
            resetScheduleForm()
          }
        }}
        onInteractOutside={(event) => {
          if (isTimepickerInteraction(event.target) || isTimepickerInteraction(event.detail.target)) {
            event.preventDefault()
          }
        }}
        persistentElements={[() => getTimepickerPersistentElements()[0] ?? null, () => getTimepickerPersistentElements()[1] ?? null, () => getTimepickerPersistentElements()[2] ?? null, () => getTimepickerPersistentElements()[3] ?? null]}
        size="lg"
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            maxW={{ base: "100vw", md: "560px" }}
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
                    {editingScheduleId ? "Edit schedule" : "Add schedule"}
                  </Text>
                </Box>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close schedule modal" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={6} py={6} overflowY="auto">
              <Stack gap={4}>
                  <Text fontSize="sm" fontWeight="600" color="gray.700" cursor="default" title="Star/end date time">
                  {sessionDateTimeRange}
                </Text>

                <SimpleGrid columns={{ base: 1, md: 12 }} gap={4}>
                  <Box gridColumn={{ base: "span 1", md: "span 8" }}>
                    <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
                      Name
                    </Text>
                    <Input
                      ref={scheduleNameInputRef}
                      value={scheduleName}
                      onChange={(event) => {
                        setScheduleName(event.target.value)
                        if (scheduleNameError) {
                          setScheduleNameError("")
                        }
                      }}
                      placeholder="Schedule item name"
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
                    {scheduleNameError ? (
                      <Text mt={2} fontSize="sm" color="red.500">
                        {scheduleNameError}
                      </Text>
                    ) : null}
                  </Box>

                  <Box gridColumn={{ base: "span 1", md: "span 4" }}>
                    <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
                      Time
                    </Text>
                    <Timepicker
                      ref={scheduleTimeInputRef}
                      value={scheduleTime ? to12hDisplay(scheduleTime) : undefined}
                      options={{ clock: { type: "12h", autoSwitchToMinutes: true } }}
                      onConfirm={handleScheduleTimeConfirm}
                      onFocus={() => {
                        scheduleTimeInputRef.current?.click()
                      }}
                      placeholder="Select time"
                      style={{
                        border: "1px solid #E0E5F2",
                        borderRadius: "14px",
                        height: "44px",
                        padding: "0 16px",
                        width: "100%",
                        fontSize: "14px",
                        fontFamily: "'DM Sans', sans-serif",
                        cursor: "pointer",
                        background: "transparent",
                        outline: "none",
                        color: scheduleTime ? "#1B254B" : "#8F9BBA",
                      }}
                    />
                    {scheduleTimeError ? (
                      <Text mt={2} fontSize="sm" color="red.500">
                        {scheduleTimeError}
                      </Text>
                    ) : null}
                  </Box>
                </SimpleGrid>

                {scheduleActionError ? (
                  <Text fontSize="sm" color="red.500">
                    {extractApiError(scheduleActionError)}
                  </Text>
                ) : null}

                <Flex
                  pt={5}
                  borderTop="1px solid"
                  borderColor="gray.200"
                  align="center"
                  justify="space-between"
                  gap={3}
                  flexWrap="wrap"
                >
                  <Button
                    variant="outline"
                    colorPalette="gray"
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    minW={{ base: "full", md: "140px" }}
                    _hover={{ bg: "gray.50", borderColor: "gray.300" }}
                    onClick={() => {
                      setIsOpen(false)
                    }}
                  >
                    Close
                  </Button>

                  <Flex gap={3} flexWrap="wrap" ml="auto">
                    <Button
                      variant="outline"
                      borderRadius="14px"
                      h="44px"
                      px={6}
                      minW={{ base: "full", md: "160px" }}
                      onClick={() => handleUpsertSchedule(false)}
                      disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                      loading={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                    >
                      {editingScheduleId ? "Update & Continue" : "Add & Continue"}
                    </Button>

                    <Button
                      borderRadius="14px"
                      h="44px"
                      px={6}
                      minW={{ base: "full", md: "160px" }}
                      onClick={() => handleUpsertSchedule(true)}
                      color="white"
                      style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                      disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                      loading={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                    >
                      {editingScheduleId ? "Update & Close" : "Add & Close"}
                    </Button>
                  </Flex>
                </Flex>
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <Dialog.Root
        open={isDeleteOpen}
        onOpenChange={(details) => {
          setIsDeleteOpen(details.open)
          if (!details.open) {
            setScheduleToDelete(null)
            deleteScheduleMutation.reset()
          }
        }}
        size="sm"
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            maxW={{ base: "100vw", md: "420px" }}
            m={{ base: 0, md: "auto" }}
            overflow="hidden"
          >
            <Box px={6} pt={6} pb={4} borderBottom="1px solid" borderColor="gray.200">
              <Flex align="flex-start" justify="space-between" gap={4}>
                <Box>
                  <Text fontSize="lg" fontWeight="800" color="gray.900">
                    Delete schedule
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    This action cannot be undone.
                  </Text>
                </Box>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close delete schedule dialog" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={6} py={6}>
              <Stack gap={5}>
                <Text fontSize="sm" color="gray.700">
                  Are you sure you want to delete
                  {" "}
                  <Text as="span" fontWeight="700" color="gray.900">
                    {scheduleToDelete?.name ?? "this schedule"}
                  </Text>
                  ?
                </Text>

                {deleteActionError ? (
                  <Text fontSize="sm" color="red.500">
                    {extractApiError(deleteActionError)}
                  </Text>
                ) : null}

                <Flex justify="flex-end" gap={3} flexWrap="wrap">
                  <Button
                    variant="outline"
                    colorPalette="gray"
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    minW={{ base: "full", md: "120px" }}
                    onClick={() => setIsDeleteOpen(false)}
                    disabled={deleteScheduleMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    minW={{ base: "full", md: "120px" }}
                    colorPalette="red"
                    onClick={handleDeleteSchedule}
                    disabled={deleteScheduleMutation.isPending}
                    loading={deleteScheduleMutation.isPending}
                  >
                    Delete
                  </Button>
                </Flex>
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </SessionStepShell>
  )
}

function LoadingState({ label }: { label: string }) {
  return (
    <Stack gap={4}>
      <Skeleton h="18px" w="120px" />
      <Skeleton h="52px" w="full" maxW="560px" borderRadius="12px" />
      <Skeleton h="18px" w="320px" />
      <Text fontSize="sm" color="gray.500">
        {label}
      </Text>
    </Stack>
  )
}

function toDateTimeInputValue(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function toBookingDateString(value: Date | null) {
  if (!value) {
    return null
  }

  return format(value, "yyyy-MM-dd'T'HH:mm:ss")
}

function toDateInputValue(value: Date | null) {
  if (!value) {
    return ""
  }

  return format(value, "yyyy-MM-dd")
}

function toTimeInputValue(value: Date | null) {
  if (!value) {
    return ""
  }

  return format(value, "HH:mm")
}

function to24hFromConfirm(hour: string, minutes: string, type: string): string {
  let h = parseInt(hour, 10)
  const m = minutes.padStart(2, "0")
  if (type === "AM" && h === 12) h = 0
  if (type === "PM" && h !== 12) h += 12
  return `${String(h).padStart(2, "0")}:${m}`
}

function to12hDisplay(time24h: string): string {
  const [hStr, mStr] = time24h.split(":")
  let h = parseInt(hStr, 10)
  const ampm = h >= 12 ? "PM" : "AM"
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${String(h).padStart(2, "0")}:${mStr} ${ampm}`
}

function SessionNameStep({ sessionId }: { sessionId: string }) {
  return <SessionNameEditor sessionId={sessionId} />
}

function SessionNameEditor({ sessionId }: { sessionId: string }) {
  const { setPrimaryAction } = useSessionWizardActions()
  const queryClient = useQueryClient()
  const [error, setError] = useState("")
  const [draftName, setDraftName] = useState<string | null>(null)
  const [loadedName, setLoadedName] = useState("")
  const [loadError, setLoadError] = useState("")
  const displayedName = draftName ?? loadedName
  const isLoading = !loadedName && !loadError

  useEffect(() => {
    let isActive = true

    fetchSessionWizardName(sessionId)
      .then((result) => {
        if (!isActive) {
          return
        }

        setLoadedName(result.name)
      })
      .catch((fetchError: unknown) => {
        if (!isActive) {
          return
        }

        setLoadError(extractApiError(fetchError))
      })

    return () => {
      isActive = false
    }
  }, [sessionId])

  useEffect(() => {
    setPrimaryAction(async () => {
      const trimmedName = displayedName.trim()
      if (!trimmedName) {
        setError("Session name is required.")
        throw new Error("Session name is required.")
      }

      setError("")
      try {
        const stepNo = getSessionWizardStepNumber("name")
        const result = await updateSessionWizardName(sessionId, { name: trimmedName }, stepNo)
        setDraftName(result.name)
        updateWizardProgressCache(queryClient, sessionId, stepNo)
        await invalidateSessionReviewQueries(queryClient, sessionId)
      } catch (saveError: unknown) {
        setError(extractApiError(saveError))
        throw saveError
      }
    })

    return () => setPrimaryAction(null)
  }, [displayedName, queryClient, sessionId, setPrimaryAction])

  if (isLoading) {
    return <LoadingState label="Loading the session name..." />
  }

  if (loadError) {
    return (
      <SessionStepShell label="Name">
        <Text fontSize="lg" fontWeight="800" color="gray.900">
          Name
        </Text>
        <Text fontSize="sm" color="red.500">
          {loadError}
        </Text>
      </SessionStepShell>
    )
  }

  return (
    <SessionStepShell label="Name">
      <Text fontSize="lg" fontWeight="800" color="gray.900">
        Name *
      </Text>
      <Box>
        <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
          Session name
        </Text>
        <Input
          value={displayedName}
          onChange={(event) => {
            setDraftName(event.target.value)
            if (error) {
              setError("")
            }
          }}
          placeholder="Keynote, workshop, networking..."
          border="1px solid"
          borderColor="secondaryGray.100"
          borderRadius="14px"
          h="44px"
          px={4}
          w="full"
          maxW="560px"
          autoFocus
          _focusVisible={{
            borderColor: "brand.400",
            boxShadow: "0 0 0 3px rgba(117, 81, 255, 0.15)",
            outline: "none",
          }}
        />
        {error ? (
          <Text mt={2} fontSize="sm" color="red.500">
            {error}
          </Text>
        ) : null}
      </Box>
      <Text fontSize="sm" color="text.secondary">
        Keep it short and specific so the session is easy to recognize.
      </Text>
    </SessionStepShell>
  )
}

function SessionDescriptionStep({ sessionId }: { sessionId: string }) {
  const query = useQuery({
    queryKey: ["sessions", { sessionId, step: "description" }],
    queryFn: () => fetchSessionWizardDescription(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  if (query.isLoading) {
    return <LoadingState label="Loading the session description..." />
  }

  if (query.isError) {
    return (
      <SessionStepShell label="Description">
        <Text fontSize="lg" fontWeight="800" color="gray.900">
          Description
        </Text>
        <Text fontSize="sm" color="red.500">
          {extractApiError(query.error)}
        </Text>
      </SessionStepShell>
    )
  }

  return (
    <SessionDescriptionEditor
      key={`${sessionId}:${query.data?.description ?? ""}`}
      sessionId={sessionId}
      initialDescription={query.data?.description ?? ""}
    />
  )
}

function SessionDescriptionEditor({ sessionId, initialDescription }: { sessionId: string; initialDescription: string }) {
  const { setPrimaryAction } = useSessionWizardActions()
  const queryClient = useQueryClient()
  const [description, setDescription] = useState(initialDescription)
  const [error, setError] = useState("")

  useEffect(() => {
    setPrimaryAction(async () => {
      setError("")
      try {
        const stepNo = getSessionWizardStepNumber("description")
        const result = await updateSessionWizardDescription(sessionId, {
          description: description.trim() ? description.trim() : null,
        }, stepNo)
        setDescription(result.description ?? "")
        updateWizardProgressCache(queryClient, sessionId, stepNo)
        await invalidateSessionReviewQueries(queryClient, sessionId)
      } catch (saveError: unknown) {
        setError(extractApiError(saveError))
        throw saveError
      }
    })

    return () => setPrimaryAction(null)
  }, [description, queryClient, sessionId, setPrimaryAction])

  return (
    <SessionStepShell label="Description">
      <Text fontSize="lg" fontWeight="800" color="gray.900">
        Description
      </Text>
      <Box maxW="720px">
        <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
          Session description
        </Text>
        <EventDescriptionEditor
          value={description}
          onChange={(value) => {
            setDescription(value)
            if (error) {
              setError("")
            }
          }}
        />
        {error ? (
          <Text mt={2} fontSize="sm" color="red.500">
            {error}
          </Text>
        ) : null}
      </Box>
      <Text fontSize="sm" color="text.secondary">
        Optional. Keep it helpful and focused.
      </Text>
    </SessionStepShell>
  )
}

function SessionEventStep({ sessionId }: { sessionId: string }) {
  const sessionEventQuery = useQuery({
    queryKey: ["sessions", { sessionId, step: "event" }],
    queryFn: () => fetchSessionWizardEvent(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  const eventsQuery = useQuery({
    queryKey: ["events", { scope: "organizer", step: "list" }],
    queryFn: fetchOrganizerEvents,
    retry: false,
  })

  if (sessionEventQuery.isLoading || eventsQuery.isLoading) {
    return <LoadingState label="Loading the session event..." />
  }

  if (sessionEventQuery.isError) {
    return (
      <SessionStepShell label="Event">
        <Text fontSize="lg" fontWeight="800" color="gray.900">
          Event
        </Text>
        <Text fontSize="sm" color="red.500">
          {extractApiError(sessionEventQuery.error)}
        </Text>
      </SessionStepShell>
    )
  }

  if (eventsQuery.isError) {
    return (
      <SessionStepShell label="Event">
        <Text fontSize="lg" fontWeight="800" color="gray.900">
          Event
        </Text>
        <Text fontSize="sm" color="red.500">
          {extractApiError(eventsQuery.error)}
        </Text>
      </SessionStepShell>
    )
  }

  return (
    <SessionEventEditor
      key={`${sessionId}:${sessionEventQuery.data?.eventUniqueId ?? ""}`}
      sessionId={sessionId}
      initialEventUniqueId={sessionEventQuery.data?.eventUniqueId ?? ""}
      events={eventsQuery.data ?? []}
    />
  )
}

function SessionEventEditor({
  sessionId,
  initialEventUniqueId,
  events,
}: {
  sessionId: string
  initialEventUniqueId: string
  events: OrganizerEventOption[]
}) {
  const { setPrimaryAction } = useSessionWizardActions()
  const queryClient = useQueryClient()
  const [selectedEventUniqueId, setSelectedEventUniqueId] = useState(initialEventUniqueId)
  const [eventError, setEventError] = useState("")

  useEffect(() => {
    setPrimaryAction(async () => {
      if (!selectedEventUniqueId) {
        setEventError("Event is required.")
        throw new Error("Event is required.")
      }

      setEventError("")
      try {
        const stepNo = getSessionWizardStepNumber("event")
        const result = await updateSessionWizardEvent(sessionId, { eventUniqueId: selectedEventUniqueId }, stepNo)
        queryClient.setQueryData(["sessions", { sessionId, step: "event" }], { ...result, stepNo })
        updateWizardProgressCache(queryClient, sessionId, stepNo)
        await invalidateSessionReviewQueries(queryClient, sessionId)
        setSelectedEventUniqueId(result.eventUniqueId)
      } catch (saveError: unknown) {
        setEventError(extractApiError(saveError))
        throw saveError
      }
    })

    return () => setPrimaryAction(null)
  }, [queryClient, selectedEventUniqueId, sessionId, setPrimaryAction])

  return (
    <SessionStepShell label="Event">
      <Text fontSize="lg" fontWeight="800" color="gray.900">
        Event *
      </Text>
      <Stack gap={2} maxW="720px">
        <Text fontSize="sm" fontWeight="600" color="navy.700">
          Session event
        </Text>

        <StyledSelect
          options={events.map((event) => ({
            label: event.name,
            value: event.uniqueId,
          }))}
          value={selectedEventUniqueId}
          onChange={(value) => {
            setSelectedEventUniqueId(value)
            if (eventError) {
              setEventError("")
            }
          }}
          placeholder="Select event"
          disabled={false}
        />
      </Stack>

      {eventError ? (
        <Text fontSize="sm" color="red.500">
          {eventError}
        </Text>
      ) : null}

      {events.length === 0 ? (
        <Text fontSize="sm" color="gray.600">
          No events found for the current organizer.
        </Text>
      ) : null}

      <Text fontSize="sm" color="text.secondary">
        Pick the event this session belongs to.
      </Text>
    </SessionStepShell>
  )
}

function SessionVenueStep({ sessionId }: { sessionId: string }) {
  const sessionVenueQuery = useQuery({
    queryKey: ["sessions", { sessionId, step: "venue" }],
    queryFn: () => fetchSessionWizardVenue(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  const venuesQuery = useQuery({
    queryKey: ["venues", { scope: "organizer" }],
    queryFn: fetchOrganizerVenues,
    retry: false,
  })

  if (sessionVenueQuery.isLoading || venuesQuery.isLoading) {
    return <LoadingState label="Loading the session venue..." />
  }

  if (sessionVenueQuery.isError) {
    return (
      <SessionStepShell label="Venue">
        <Text fontSize="lg" fontWeight="800" color="gray.900">
          Venue
        </Text>
        <Text fontSize="sm" color="red.500">
          {extractApiError(sessionVenueQuery.error)}
        </Text>
      </SessionStepShell>
    )
  }

  return (
    <SessionVenueEditor
      key={`${sessionId}:${sessionVenueQuery.data?.venueUniqueId ?? ""}`}
      sessionId={sessionId}
      initialVenueUniqueId={sessionVenueQuery.data?.venueUniqueId ?? ""}
      venues={venuesQuery.data ?? []}
      refetchVenues={venuesQuery.refetch}
      venuesError={venuesQuery.isError ? extractApiError(venuesQuery.error) : ""}
    />
  )
}

function SessionDatesTimeStep({ sessionId }: { sessionId: string }) {
  const dateTimeQuery = useQuery({
    queryKey: ["sessions", { sessionId, step: "dates-time" }],
    queryFn: () => fetchSessionWizardDateTime(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  if (dateTimeQuery.isLoading) {
    return <LoadingState label="Loading the dates and time..." />
  }

  if (dateTimeQuery.isError) {
    return (
      <SessionStepShell label="Dates & Time">
        <Text fontSize="lg" fontWeight="800" color="gray.900">
          Dates & Time
        </Text>
        <Text fontSize="sm" color="red.500">
          {extractApiError(dateTimeQuery.error)}
        </Text>
      </SessionStepShell>
    )
  }

  return (
    <SessionDatesTimeEditor
      sessionId={sessionId}
      initialBookingStartDate={dateTimeQuery.data?.bookingStartDate ?? null}
      initialBookingEndDate={dateTimeQuery.data?.bookingEndDate ?? null}
      initialStartDate={dateTimeQuery.data?.startDate ?? null}
      initialEndDate={dateTimeQuery.data?.endDate ?? null}
      initialStepNo={dateTimeQuery.data?.stepNo ?? getSessionWizardStepNumber("dates-time")}
    />
  )
}

function SessionDatesTimeEditor({
  sessionId,
  initialBookingStartDate,
  initialBookingEndDate,
  initialStartDate,
  initialEndDate,
  initialStepNo,
}: {
  sessionId: string
  initialBookingStartDate: string | null
  initialBookingEndDate: string | null
  initialStartDate: string | null
  initialEndDate: string | null
  initialStepNo: number
}) {
  const { setPrimaryAction, setPrimaryActionReady } = useSessionWizardActions()
  const queryClient = useQueryClient()
  const [bookingStartDate, setBookingStartDate] = useState<Date | null>(toDateTimeInputValue(initialBookingStartDate))
  const [bookingEndDate, setBookingEndDate] = useState<Date | null>(toDateTimeInputValue(initialBookingEndDate))
  const [sessionStartDate, setSessionStartDate] = useState<Date | null>(toDateTimeInputValue(initialStartDate))
  const [sessionEndDate, setSessionEndDate] = useState<Date | null>(toDateTimeInputValue(initialEndDate))
  const [bookingError, setBookingError] = useState("")
  const [sessionError, setSessionError] = useState("")

  useEffect(() => {
    setPrimaryAction(async () => {
      const missingBookingFields = [
        !bookingStartDate ? "Booking start date/time is required." : null,
        !bookingEndDate ? "Booking end date/time is required." : null,
      ].filter(Boolean)
      const missingSessionFields = [
        !sessionStartDate ? "Session start date/time is required." : null,
        !sessionEndDate ? "Session end date/time is required." : null,
      ].filter(Boolean)

      if (bookingStartDate && bookingEndDate && bookingEndDate <= bookingStartDate) {
        setBookingError("Booking end date/time must be after the start date/time.")
        throw new Error("Booking end date/time must be after the start date/time.")
      }

      if (sessionStartDate && sessionEndDate && sessionEndDate <= sessionStartDate) {
        setSessionError("Session end date/time must be after the start date/time.")
        throw new Error("Session end date/time must be after the start date/time.")
      }

      const bookingMessage = missingBookingFields.join(" ")
      const sessionMessage = missingSessionFields.join(" ")

      setBookingError(bookingMessage)
      setSessionError(sessionMessage)

      if (bookingMessage || sessionMessage) {
        throw new Error([bookingMessage, sessionMessage].filter(Boolean).join(" "))
      }

      setBookingError("")
      setSessionError("")

      try {
        setPrimaryActionReady(false)
        const result = await updateSessionWizardDateTime(
          sessionId,
          {
            bookingStartDate: toBookingDateString(bookingStartDate),
            bookingEndDate: toBookingDateString(bookingEndDate),
            startDate: toBookingDateString(sessionStartDate),
            endDate: toBookingDateString(sessionEndDate),
          },
          getSessionWizardStepNumber("dates-time"),
        )

        setBookingStartDate(toDateTimeInputValue(result.bookingStartDate))
        setBookingEndDate(toDateTimeInputValue(result.bookingEndDate))
        setSessionStartDate(toDateTimeInputValue(result.startDate))
        setSessionEndDate(toDateTimeInputValue(result.endDate))
        updateWizardProgressCache(queryClient, sessionId, result.stepNo || initialStepNo || getSessionWizardStepNumber("dates-time"))
        await invalidateSessionReviewQueries(queryClient, sessionId)
      } catch (saveError: unknown) {
        const message = extractApiError(saveError)
        if (message.toLowerCase().includes("booking")) {
          setBookingError(message)
        } else if (message.toLowerCase().includes("session")) {
          setSessionError(message)
        }
        throw saveError
      } finally {
        setPrimaryActionReady(true)
      }
    })

    setPrimaryActionReady(true)

    return () => {
      setPrimaryAction(null)
      setPrimaryActionReady(true)
    }
  }, [bookingEndDate, bookingStartDate, initialStepNo, queryClient, sessionEndDate, sessionId, sessionStartDate, setPrimaryAction, setPrimaryActionReady])

  return (
    <SessionStepShell label="Dates & Time">
      <Stack gap={2}>
        <Text fontSize="lg" fontWeight="800" color="gray.900">
          Dates & Time
        </Text>
        <Text fontSize="sm" color="text.secondary">
          Choose when booking opens and closes, then define the session start and end times. UTC Date/Time recommended.
        </Text>
      </Stack>

      <Stack gap={6} maxW="760px">
        <Stack gap={3}>
          <Box>
            <Text fontSize="sm" fontWeight="700" color="gray.900">
              Booking Window <Text as="span" color="red.500">*</Text>
            </Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              When registrations open and close for the session.
            </Text>
          </Box>
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={5}>
            <Stack gap={3}>
              <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
                Start
              </Text>
              <Box bg="secondaryGray.300" borderRadius="16px" p={5}>
                <BookingDateTimeField
                  key={`booking-start-${bookingStartDate?.toISOString() ?? "empty"}`}
                  value={bookingStartDate}
                  error={bookingError.includes("Booking start date/time is required.") ? "Booking start date/time is required." : ""}
                  onChange={(nextStart) => {
                    setBookingStartDate(nextStart)
                    if (bookingEndDate && nextStart && bookingEndDate <= nextStart) {
                      setBookingEndDate(null)
                    }
                    if (bookingError) setBookingError("")
                  }}
                />
              </Box>
            </Stack>

            <Stack gap={3}>
              <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
                End
              </Text>
              <Box bg="secondaryGray.300" borderRadius="16px" p={5}>
                <BookingDateTimeField
                  key={`booking-end-${bookingEndDate?.toISOString() ?? "empty"}-${bookingStartDate?.toISOString() ?? "nostart"}`}
                  value={bookingEndDate}
                  minDate={bookingStartDate ?? undefined}
                  error={bookingError.includes("Booking end date/time is required.") ? "Booking end date/time is required." : ""}
                  onChange={(value) => {
                    setBookingEndDate(value)
                    if (bookingError) setBookingError("")
                  }}
                />
              </Box>
            </Stack>
          </SimpleGrid>

          {bookingError ? (
            <Text fontSize="sm" color="red.500" maxW="760px">
              {bookingError}
            </Text>
          ) : null}
        </Stack>

        <Stack gap={3}>
          <Box>
            <Text fontSize="sm" fontWeight="700" color="gray.900">
              Session Date/Time <Text as="span" color="red.500">*</Text>
            </Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              When the session itself begins and ends.
            </Text>
          </Box>
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={5}>
            <Stack gap={3}>
              <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
                Start
              </Text>
              <Box bg="secondaryGray.300" borderRadius="16px" p={5}>
                <BookingDateTimeField
                  key={`session-start-${sessionStartDate?.toISOString() ?? "empty"}`}
                  value={sessionStartDate}
                  error={sessionError.includes("Session start date/time is required.") ? "Session start date/time is required." : ""}
                  onChange={(nextStart) => {
                    setSessionStartDate(nextStart)
                    if (sessionEndDate && nextStart && sessionEndDate <= nextStart) {
                      setSessionEndDate(null)
                    }
                    if (sessionError) setSessionError("")
                  }}
                />
              </Box>
            </Stack>

            <Stack gap={3}>
              <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
                End
              </Text>
              <Box bg="secondaryGray.300" borderRadius="16px" p={5}>
                <BookingDateTimeField
                  key={`session-end-${sessionEndDate?.toISOString() ?? "empty"}-${sessionStartDate?.toISOString() ?? "nostart"}`}
                  value={sessionEndDate}
                  minDate={sessionStartDate ?? undefined}
                  error={sessionError.includes("Session end date/time is required.") ? "Session end date/time is required." : ""}
                  onChange={(value) => {
                    setSessionEndDate(value)
                    if (sessionError) setSessionError("")
                  }}
                />
              </Box>
            </Stack>
          </SimpleGrid>

          {sessionError ? (
            <Text fontSize="sm" color="red.500" maxW="760px">
              {sessionError}
            </Text>
          ) : null}
        </Stack>
      </Stack>

      <Text fontSize="sm" color="text.secondary">
        Choose when booking opens and closes, and when the session runs. UTC Date/Time recommended.
      </Text>
    </SessionStepShell>
  )
}

function SessionBookingStep({ sessionId }: { sessionId: string }) {
  const bookingQuery = useQuery({
    queryKey: ["sessions", { sessionId, step: "booking" }],
    queryFn: () => fetchSessionWizardBooking(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  if (bookingQuery.isLoading) {
    return <LoadingState label="Loading the booking window..." />
  }

  if (bookingQuery.isError) {
    return (
      <SessionStepShell label="Booking Window">
        <Text fontSize="lg" fontWeight="800" color="gray.900">
          Booking Window
        </Text>
        <Text fontSize="sm" color="red.500">
          {extractApiError(bookingQuery.error)}
        </Text>
      </SessionStepShell>
    )
  }

  return (
    <SessionBookingEditor
      key={`${sessionId}:${bookingQuery.data?.bookingStartDate ?? ""}:${bookingQuery.data?.bookingEndDate ?? ""}`}
      sessionId={sessionId}
      initialBookingStartDate={bookingQuery.data?.bookingStartDate ?? null}
      initialBookingEndDate={bookingQuery.data?.bookingEndDate ?? null}
    />
  )
}

function SessionDurationStep({ sessionId }: { sessionId: string }) {
  const durationQuery = useQuery({
    queryKey: ["sessions", { sessionId, step: "start-end" }],
    queryFn: () => fetchSessionWizardDuration(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  if (durationQuery.isLoading) {
    return <LoadingState label="Loading the session date/time..." />
  }

  if (durationQuery.isError) {
    return (
      <SessionStepShell label="Session Date/Time">
        <Text fontSize="lg" fontWeight="800" color="gray.900">
          Session Date/Time
        </Text>
        <Text fontSize="sm" color="red.500">
          {extractApiError(durationQuery.error)}
        </Text>
      </SessionStepShell>
    )
  }

  return (
    <SessionDurationEditor
      key={`${sessionId}:${durationQuery.data?.startDate ?? ""}:${durationQuery.data?.endDate ?? ""}`}
      sessionId={sessionId}
      initialStartDate={durationQuery.data?.startDate ?? null}
      initialEndDate={durationQuery.data?.endDate ?? null}
    />
  )
}

function SessionBookingEditor({
  sessionId,
  initialBookingStartDate,
  initialBookingEndDate,
}: {
  sessionId: string
  initialBookingStartDate: string | null
  initialBookingEndDate: string | null
}) {
  const { setPrimaryAction } = useSessionWizardActions()
  const queryClient = useQueryClient()
  const [bookingStartDate, setBookingStartDate] = useState<Date | null>(toDateTimeInputValue(initialBookingStartDate))
  const [bookingEndDate, setBookingEndDate] = useState<Date | null>(toDateTimeInputValue(initialBookingEndDate))
  const [error, setError] = useState("")

  useEffect(() => {
    setPrimaryAction(async () => {
      if (!bookingStartDate || !bookingEndDate) {
        const missingFields = [
          !bookingStartDate ? "Booking start date/time is required." : null,
          !bookingEndDate ? "Booking end date/time is required." : null,
        ].filter(Boolean)
        const message = missingFields.join(" ")
        setError(message)
        throw new Error(message)
      }

      if (bookingEndDate <= bookingStartDate) {
        setError("Booking end date/time must be after the start date/time.")
        throw new Error("Booking end date/time must be after the start date/time.")
      }

      setError("")
      try {
        const stepNo = getSessionWizardStepNumber("booking")
        const result = await updateSessionWizardBooking(
          sessionId,
          {
            bookingStartDate: toBookingDateString(bookingStartDate),
            bookingEndDate: toBookingDateString(bookingEndDate),
          },
          stepNo,
        )
        setBookingStartDate(toDateTimeInputValue(result.bookingStartDate))
        setBookingEndDate(toDateTimeInputValue(result.bookingEndDate))
        updateWizardProgressCache(queryClient, sessionId, stepNo)
        await invalidateSessionReviewQueries(queryClient, sessionId)
      } catch (saveError: unknown) {
        setError(extractApiError(saveError))
        throw saveError
      }
    })

    return () => setPrimaryAction(null)
  }, [bookingEndDate, bookingStartDate, queryClient, sessionId, setPrimaryAction])

  return (
    <SessionStepShell label="Booking Window">
      <Text fontSize="lg" fontWeight="800" color="gray.900">
        Booking Window
      </Text>

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={5} maxW="760px">
        <Stack gap={3}>
          <Text fontSize="sm" fontWeight="700" color="gray.900">
            Booking Opens <Text as="span" color="red.500">*</Text>
          </Text>
          <Box bg="secondaryGray.300" borderRadius="16px" p={5}>
            <BookingDateTimeField
              key={`booking-start-${bookingStartDate?.toISOString() ?? "empty"}`}
              value={bookingStartDate}
              error={error.includes("Booking start date/time is required.") ? "Booking start date/time is required." : ""}
              onChange={(nextStart) => {
                setBookingStartDate(nextStart)
                if (bookingEndDate && nextStart && bookingEndDate <= nextStart) {
                  setBookingEndDate(null)
                }
                if (error) setError("")
              }}
            />
          </Box>
        </Stack>

        <Stack gap={3}>
          <Text fontSize="sm" fontWeight="700" color="gray.900">
            Booking Closes <Text as="span" color="red.500">*</Text>
          </Text>
          <Box bg="secondaryGray.300" borderRadius="16px" p={5}>
            <BookingDateTimeField
              key={`booking-end-${bookingEndDate?.toISOString() ?? "empty"}-${bookingStartDate?.toISOString() ?? "nostart"}`}
              value={bookingEndDate}
              minDate={bookingStartDate ?? undefined}
              error={error.includes("Booking end date/time is required.") ? "Booking end date/time is required." : ""}
              onChange={(value) => {
                setBookingEndDate(value)
                if (error) setError("")
              }}
            />
          </Box>
        </Stack>
      </SimpleGrid>

      {error ? (
        <Text fontSize="sm" color="red.500" maxW="760px">
          {error}
        </Text>
      ) : null}

      <Text fontSize="sm" color="text.secondary">
        Choose when booking opens and closes for this session. UTC Date/Time recommended.
      </Text>
    </SessionStepShell>
  )
}

function SessionDurationEditor({
  sessionId,
  initialStartDate,
  initialEndDate,
}: {
  sessionId: string
  initialStartDate: string | null
  initialEndDate: string | null
}) {
  const { setPrimaryAction } = useSessionWizardActions()
  const queryClient = useQueryClient()
  const [sessionStartDate, setSessionStartDate] = useState<Date | null>(toDateTimeInputValue(initialStartDate))
  const [sessionEndDate, setSessionEndDate] = useState<Date | null>(toDateTimeInputValue(initialEndDate))
  const [error, setError] = useState("")

  useEffect(() => {
    setPrimaryAction(async () => {
      if (!sessionStartDate || !sessionEndDate) {
        const missingFields = [
          !sessionStartDate ? "Session start date/time is required." : null,
          !sessionEndDate ? "Session end date/time is required." : null,
        ].filter(Boolean)
        const message = missingFields.join(" ")
        setError(message)
        throw new Error(message)
      }

      if (sessionEndDate <= sessionStartDate) {
        setError("Session end date/time must be after the start date/time.")
        throw new Error("Session end date/time must be after the start date/time.")
      }

      setError("")
      try {
        const stepNo = getSessionWizardStepNumber("start-end")
        const result = await updateSessionWizardDuration(
          sessionId,
          {
            startDate: toBookingDateString(sessionStartDate),
            endDate: toBookingDateString(sessionEndDate),
          },
          stepNo,
        )
        setSessionStartDate(toDateTimeInputValue(result.startDate))
        setSessionEndDate(toDateTimeInputValue(result.endDate))
        updateWizardProgressCache(queryClient, sessionId, stepNo)
        await invalidateSessionReviewQueries(queryClient, sessionId)
      } catch (saveError: unknown) {
        setError(extractApiError(saveError))
        throw saveError
      }
    })

    return () => setPrimaryAction(null)
  }, [queryClient, sessionEndDate, sessionId, sessionStartDate, setPrimaryAction])

  return (
    <SessionStepShell label="Session Date/Time">
      <Text fontSize="lg" fontWeight="800" color="gray.900">
        Session Date/Time
      </Text>

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={5} maxW="760px">
        <Stack gap={3}>
          <Text fontSize="sm" fontWeight="700" color="gray.900">
            Session Starts <Text as="span" color="red.500">*</Text>
          </Text>
          <Box bg="secondaryGray.300" borderRadius="16px" p={5}>
            <BookingDateTimeField
              key={`session-start-${sessionStartDate?.toISOString() ?? "empty"}`}
              value={sessionStartDate}
              error={error.includes("Session start date/time is required.") ? "Session start date/time is required." : ""}
              onChange={(nextStart) => {
                setSessionStartDate(nextStart)
                if (sessionEndDate && nextStart && sessionEndDate <= nextStart) {
                  setSessionEndDate(null)
                }
                if (error) setError("")
              }}
            />
          </Box>
        </Stack>

        <Stack gap={3}>
          <Text fontSize="sm" fontWeight="700" color="gray.900">
            Session Ends <Text as="span" color="red.500">*</Text>
          </Text>
          <Box bg="secondaryGray.300" borderRadius="16px" p={5}>
            <BookingDateTimeField
              key={`session-end-${sessionEndDate?.toISOString() ?? "empty"}-${sessionStartDate?.toISOString() ?? "nostart"}`}
              value={sessionEndDate}
              minDate={sessionStartDate ?? undefined}
              error={error.includes("Session end date/time is required.") ? "Session end date/time is required." : ""}
              onChange={(value) => {
                setSessionEndDate(value)
                if (error) setError("")
              }}
            />
          </Box>
        </Stack>
      </SimpleGrid>

      {error ? (
        <Text fontSize="sm" color="red.500" maxW="760px">
          {error}
        </Text>
      ) : null}

      <Text fontSize="sm" color="text.secondary">
        Choose when this session starts and ends. UTC Date/Time recommended.
      </Text>
    </SessionStepShell>
  )
}

function BookingDateTimeField({
  value,
  minDate,
  error,
  onChange,
}: {
  value: Date | null
  minDate?: Date
  error?: string
  onChange: (value: Date | null) => void
}) {
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(value))
  const [selectedTime, setSelectedTime] = useState(toTimeInputValue(value))
  const dateInputRef = useRef<HTMLInputElement>(null)
  const minDateValue = minDate ? toDateInputValue(minDate) : undefined
  const minTimeValue = minDateValue && selectedDate === minDateValue ? toTimeInputValue(minDate ?? null) : ""
  const displayDate = selectedDate ? format(parseISO(selectedDate), "dd-MMM-yyyy") : ""

  function handleDateClick() {
    dateInputRef.current?.showPicker?.()
  }

  function handleTimeConfirm(data: ConfirmEventData) {
    if (!data.hour || !data.minutes) return

    const time24h = data.type
      ? to24hFromConfirm(data.hour, data.minutes, data.type)
      : `${data.hour.padStart(2, "0")}:${data.minutes.padStart(2, "0")}`

    setSelectedTime(time24h)

    if (!selectedDate) {
      onChange(null)
      return
    }

    if (minTimeValue && selectedDate === minDateValue && time24h < minTimeValue) {
      onChange(null)
      return
    }

    const next = new Date(`${selectedDate}T${time24h}:00`)
    onChange(Number.isNaN(next.getTime()) ? null : next)
  }

  return (
    <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
      <Box>
        <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
          Date
        </Text>
          <Box position="relative">
            <Flex
              align="center"
              justify="space-between"
              border="1px solid"
              borderColor="secondaryGray.100"
              borderRadius="14px"
            h="44px"
            px={4}
            cursor="pointer"
            _hover={{ borderColor: "brand.400" }}
            onClick={handleDateClick}
          >
            <Text fontSize="sm" color={displayDate ? "navy.700" : "secondaryGray.500"}>
              {displayDate || "DD-MMM-YYYY"}
            </Text>
            <Calendar size={16} color="#8F9BBA" />
          </Flex>
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            min={minDateValue}
            onChange={(event) => {
              const dateStr = event.target.value
              setSelectedDate(dateStr)

              if (!dateStr) {
                onChange(null)
                return
              }

              if (selectedTime) {
                const next = new Date(`${dateStr}T${selectedTime}:00`)
                onChange(Number.isNaN(next.getTime()) ? null : next)
                return
              }

              onChange(null)
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "1px",
              height: "1px",
              opacity: 0,
              pointerEvents: "none",
            }}
          />
        </Box>
        {error ? (
          <Text mt={2} fontSize="sm" color="red.500">
            {error}
          </Text>
        ) : null}
      </Box>

      <Box>
        <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
          Time
        </Text>
        <Timepicker
          value={selectedTime ? to12hDisplay(selectedTime) : undefined}
          options={{ clock: { type: "12h", autoSwitchToMinutes: true } }}
          onConfirm={handleTimeConfirm}
          disabled={!selectedDate}
          placeholder="Select time"
          style={{
            border: "1px solid #E0E5F2",
            borderRadius: "14px",
            height: "44px",
            padding: "0 16px",
            width: "100%",
            fontSize: "14px",
            fontFamily: "'DM Sans', sans-serif",
            cursor: selectedDate ? "pointer" : "not-allowed",
            background: "transparent",
            outline: "none",
            color: selectedDate ? "#1B254B" : "#8F9BBA",
          }}
        />
      </Box>
    </SimpleGrid>
  )
}

function SessionVenueEditor({
  sessionId,
  initialVenueUniqueId,
  venues,
  refetchVenues,
  venuesError,
}: {
  sessionId: string
  initialVenueUniqueId: string
  venues: OrganizerVenueOption[]
  refetchVenues: () => Promise<unknown>
  venuesError: string
}) {
  const { setPrimaryAction } = useSessionWizardActions()
  const queryClient = useQueryClient()
  const [selectedVenueUniqueId, setSelectedVenueUniqueId] = useState(initialVenueUniqueId)
  const [isOpen, setIsOpen] = useState(false)
  const [venueName, setVenueName] = useState("")
  const [venueNameError, setVenueNameError] = useState("")
  const [venueError, setVenueError] = useState("")

  const createVenueMutation = useMutation({
    mutationFn: createOrganizerVenue,
  })

  useEffect(() => {
    setPrimaryAction(async () => {
      setVenueError("")
      try {
        const stepNo = getSessionWizardStepNumber("venue")
        const result = await updateSessionWizardVenue(sessionId, { venueUniqueId: selectedVenueUniqueId }, stepNo)
        queryClient.setQueryData(["sessions", { sessionId, step: "venue" }], {
          venueUniqueId: result.venueUniqueId,
        })
        updateWizardProgressCache(queryClient, sessionId, stepNo)
        setSelectedVenueUniqueId(result.venueUniqueId)
        await queryClient.invalidateQueries({ queryKey: ["sessions", { sessionId, step: "seat-selection" }] })
        await invalidateSessionReviewQueries(queryClient, sessionId)
      } catch (saveError: unknown) {
        setVenueError(extractApiError(saveError))
        throw saveError
      }
    })

    return () => setPrimaryAction(null)
  }, [queryClient, selectedVenueUniqueId, sessionId, setPrimaryAction])

  async function handleCreateVenue() {
    const trimmedName = venueName.trim()
    if (!trimmedName) {
      setVenueNameError("Venue name is required.")
      return
    }

    setVenueNameError("")
    try {
      const createdVenue = await createVenueMutation.mutateAsync({ name: trimmedName })
      await refetchVenues()
      setSelectedVenueUniqueId(createdVenue.uniqueId)
      setVenueName("")
      setIsOpen(false)
    } catch (createError: unknown) {
      setVenueNameError(extractApiError(createError))
    }
  }

  return (
    <SessionStepShell label="Venue">
      <Text fontSize="lg" fontWeight="800" color="gray.900">
        Venue
      </Text>
      <Stack gap={2} maxW="720px">
        <Flex align="center" justify="space-between" gap={3}>
          <Text fontSize="sm" fontWeight="600" color="navy.700">
            Session venue
          </Text>
          <Tooltip.Root openDelay={300} closeDelay={100}>
            <Tooltip.Trigger asChild>
              <Button
                variant="outline"
                aria-label="Add venue"
                borderRadius="999px"
                h="44px"
                w="44px"
                minW="44px"
                p={0}
                onClick={() => setIsOpen(true)}
              >
                <Plus size={18} />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content>Quick add venue</Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>
        </Flex>

        <StyledSelect
          options={venues.map((venue) => ({
            label: venue.name,
            value: venue.uniqueId,
          }))}
          value={selectedVenueUniqueId}
          onChange={(value) => {
            setSelectedVenueUniqueId(value)
            if (venueError) {
              setVenueError("")
            }
          }}
          placeholder="Select venue"
          disabled={false}
        />
      </Stack>

      {venueError ? (
        <Text fontSize="sm" color="red.500">
          {venueError}
        </Text>
      ) : null}

      {venuesError ? (
        <Text fontSize="sm" color="red.500">
          {venuesError}
        </Text>
      ) : null}

      <Dialog.Root
        open={isOpen}
        onOpenChange={(details) => {
          setIsOpen(details.open)
          if (!details.open) {
            setVenueName("")
            setVenueNameError("")
          }
        }}
        size="lg"
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            maxW={{ base: "100vw", md: "560px" }}
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
                    Add venue
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Choose from your saved venues.
                  </Text>
                </Box>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close venue modal" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={6} py={6} overflowY="auto">
              <Stack gap={4}>
                <Stack gap={2}>
                  <Text fontSize="sm" fontWeight="600" color="navy.700">
                    Venue
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Enter a venue name to add it to the list.
                  </Text>
                </Stack>

                <Box>
                  <Text fontSize="sm" fontWeight="600" color="navy.700" mb={2}>
                    Venue name
                  </Text>
                  <Input
                    value={venueName}
                    onChange={(event) => {
                      setVenueName(event.target.value)
                      if (venueNameError) {
                        setVenueNameError("")
                      }
                    }}
                    placeholder="Main hall, rooftop, venue name..."
                    border="1px solid"
                    borderColor="secondaryGray.100"
                    borderRadius="14px"
                    h="44px"
                    px={4}
                    w="full"
                    autoFocus
                    _focusVisible={{
                      borderColor: "brand.400",
                      boxShadow: "0 0 0 3px rgba(117, 81, 255, 0.15)",
                      outline: "none",
                    }}
                  />
                  {venueNameError ? (
                    <Text mt={2} fontSize="sm" color="red.500">
                      {venueNameError}
                    </Text>
                  ) : null}
                </Box>

                <Flex
                  pt={5}
                  borderTop="1px solid"
                  borderColor="gray.200"
                  align="center"
                  justify="space-between"
                  gap={3}
                  flexWrap="wrap"
                >
                  <Button
                    variant="outline"
                    colorPalette="gray"
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    minW={{ base: "full", md: "140px" }}
                    _hover={{ bg: "gray.50", borderColor: "gray.300" }}
                    onClick={() => setIsOpen(false)}
                  >
                    Close
                  </Button>

                  <Button
                    borderRadius="14px"
                    h="44px"
                    px={6}
                    minW={{ base: "full", md: "140px" }}
                    onClick={handleCreateVenue}
                    color="white"
                    style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
                    loading={createVenueMutation.isPending}
                  >
                    Save
                  </Button>
                </Flex>
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </SessionStepShell>
  )
}
