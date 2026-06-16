import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Badge, Box, Button, CloseButton, Dialog, Flex, Grid, Skeleton, Stack, Switch, Text, useBreakpointValue } from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { CheckCircle2, PencilLine, X } from "lucide-react"
import { format, parseISO } from "date-fns"
import {
  type EventSetupStateOption,
  updateEventWizardSetupState,
} from "@/api/events"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import { useEventReviewSummary } from "../hooks/useEventReviewSummary"
import { useEventWizardActions } from "../hooks/useEventWizardActions"

type ReviewStepSlug =
  | "name"
  | "terms-conditions"
  | "theme-color"
  | "payment-account"
  | "time-zone"
  | "venue"
  | "sessions"
  | "date-time"
  | "discount-coupon"
  | "questions"
  | "advanced-settings"

function getBooleanLabel(value: boolean) {
  return value ? "Yes" : "No"
}

function ReviewPill({ label, isSuccess }: { label: string; isSuccess: boolean }) {
  const Icon = isSuccess ? CheckCircle2 : X

  return (
    <Badge
      variant="subtle"
      colorPalette={isSuccess ? "green" : "gray"}
      borderRadius="999px"
      px={3}
      py={1}
    >
      <Flex align="center" gap={1.5}>
        <Icon size={14} />
        <Text as="span" fontSize="xs" fontWeight="800" lineHeight={1}>
          {label}
        </Text>
      </Flex>
    </Badge>
  )
}

function TextPill({ children, colorPalette }: { children: string; colorPalette: "brand" | "gray" | "cyan" }) {
  return (
    <Badge variant="subtle" colorPalette={colorPalette} borderRadius="999px" px={3} py={1}>
      <Text as="span" fontSize="xs" fontWeight="800" lineHeight={1}>
        {children}
      </Text>
    </Badge>
  )
}

function getEventSetupStateTheme(setupState: string, setupStateOptions: EventSetupStateOption[] = []) {
  const selectedState = setupStateOptions.find((option) => option.value === setupState)

  if (!selectedState) {
    return {
      colorPalette: "gray" as const,
      label: setupState ? setupState : "Loading",
    }
  }

  if (!selectedState.isSelectable) {
    return {
      colorPalette: "gray" as const,
      label: selectedState.label,
    }
  }

  if (selectedState.isFinal) {
    return {
      colorPalette: "green" as const,
      label: selectedState.label,
    }
  }

  return {
    colorPalette: "orange" as const,
    label: selectedState.label,
  }
}

function getSessionSetupStateTone(setupState: string) {
  const normalizedSetupState = setupState.replace(/\s+/g, "").toLowerCase()

  switch (normalizedSetupState) {
    case "readyforreview":
      return {
        bg: "orange.100",
        borderColor: "orange.300",
        color: "orange.800",
      }
    case "readyforsale":
      return {
        bg: "green.100",
        borderColor: "green.300",
        color: "green.800",
      }
    case "inprogress":
    default:
      return {
        bg: "gray.100",
        borderColor: "gray.300",
        color: "gray.700",
      }
  }
}

function getSessionSetupStateLabel(setupState: string) {
  const normalizedSetupState = setupState.replace(/\s+/g, "").toLowerCase()

  switch (normalizedSetupState) {
    case "readyforreview":
      return "Ready For Review"
    case "readyforsale":
      return "Ready For Sale"
    case "inprogress":
    default:
      return "In Progress"
  }
}

function SessionLinkPill({
  sessionId,
  sessionName,
  setupState,
}: {
  sessionId: string
  sessionName: string
  setupState: string
}) {
  const tone = getSessionSetupStateTone(setupState)
  const setupStateLabel = getSessionSetupStateLabel(setupState)

  return (
    <Box
      as="button"
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      borderRadius="999px"
      minH="32px"
      px={3}
      py={1.5}
      minW="auto"
      fontSize="xs"
      fontWeight="800"
      whiteSpace="nowrap"
      bg={tone.bg}
      border="1px solid"
      borderColor={tone.borderColor}
      color={tone.color}
      cursor="pointer"
      transition="filter 0.16s ease"
      _hover={{ filter: "brightness(0.98)" }}
      _focusVisible={{
        outline: "none",
        boxShadow: "0 0 0 3px rgba(148, 163, 184, 0.22)",
      }}
      title={`${setupStateLabel}. Click to edit`}
      aria-label={`${setupStateLabel}. Click to edit`}
      onClick={() => window.open(APP_ROUTES.sessionWizard.edit(sessionId), "_blank", "noopener,noreferrer")}
    >
      {sessionName}
    </Box>
  )
}

function ReviewItem({
  label,
  value,
  onEdit,
  editLabel,
  isLoading = false,
}: {
  label: string
  value: ReactNode
  onEdit?: () => void
  editLabel: string
  isLoading?: boolean
}) {
  return (
    <Grid
      templateColumns={{ base: "1fr", md: "220px minmax(0, 1fr) auto" }}
      alignItems={{ base: "start", md: "stretch" }}
      gap={{ base: 3, md: 4 }}
      px={0}
      py={0}
      borderTop="1px solid"
      borderColor="gray.200"
      bg="white"
    >
      <Flex
        h="full"
        minH={{ base: "auto", md: "56px" }}
        align="center"
        bg="gray.50"
        px={{ base: 3, md: 4 }}
        py={{ base: 3, md: 0 }}
        borderRight={{ base: "none", md: "1px solid" }}
        borderRightColor={{ base: "transparent", md: "gray.200" }}
      >
        <Text fontSize="xs" fontWeight="800" color="gray.900" textTransform="none" letterSpacing="-0.01em">
          {label}
        </Text>
      </Flex>

      <Box minW={0} w="full" px={{ base: 3, md: 0 }} py={{ base: 0, md: 3.5 }}>
        {isLoading ? <Skeleton h="18px" w="180px" borderRadius="8px" /> : <Box>{value}</Box>}
      </Box>

      <Flex justify={{ base: "flex-start", md: "flex-end" }} px={{ base: 3, md: 2 }} py={{ base: 0, md: 3 }}>
        {onEdit ? (
          <Button
            variant="outline"
            borderRadius="full"
            h="34px"
            w="34px"
            minW="34px"
            p={0}
            aria-label={editLabel}
            onClick={onEdit}
          >
            <PencilLine size={14} />
          </Button>
        ) : null}
      </Flex>
    </Grid>
  )
}

export function EventReviewStepPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { eventId } = useParams<{ eventId?: string }>()
  const queryClient = useQueryClient()
  const { setPrimaryAction, setPrimaryActionReady } = useEventWizardActions()
  const finishDialogSize = useBreakpointValue<"full" | "sm">({ base: "full", md: "sm" }) ?? "sm"
  const returnUrl = useMemo(() => `${location.pathname}${location.search}`, [location.pathname, location.search])
  const [setupState, setSetupState] = useState("")
  const [finishSetupState, setFinishSetupState] = useState<string | null>(null)
  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false)
  const finishConfirmationDeferredRef = useRef<{ resolve: () => void; reject: (error: Error) => void } | null>(null)

  const reviewSummaryQuery = useEventReviewSummary(eventId)
  const reviewSummary = reviewSummaryQuery.data
  const setupStateOptions = reviewSummary?.setupStateOptions ?? []
  const selectableSetupStates = useMemo(() => setupStateOptions.filter((option) => option.isSelectable), [setupStateOptions])
  const finalSetupState = setupStateOptions.find((option) => option.isFinal)?.value ?? ""
  const setupStateTheme = getEventSetupStateTheme(setupState || reviewSummary?.setupState || "", setupStateOptions)
  const resolvedFinishSetupState =
    finishSetupState ??
    selectableSetupStates.find((option) => option.value === reviewSummary?.setupState)?.value ??
    selectableSetupStates.find((option) => !option.isFinal)?.value ??
    selectableSetupStates.find((option) => option.isFinal)?.value ??
    ""
  const finishSetupStateLabel = setupStateOptions.find((option) => option.value === resolvedFinishSetupState)?.label ?? "Loading"

  const finishMutation = useMutation({
    mutationFn: (setupStateValue: string) => {
      if (!eventId) {
        throw new Error("Event id is required.")
      }

      return updateEventWizardSetupState(eventId, setupStateValue)
    },
    onSuccess: async (data) => {
      setSetupState(data.setupState)
      setFinishSetupState(selectableSetupStates.find((option) => option.value === data.setupState)?.value ?? null)
      if (eventId) {
        await queryClient.invalidateQueries({ queryKey: ["events", "review-summary", eventId] })
        await queryClient.invalidateQueries({ queryKey: ["events", "wizard-progress", eventId] })
      }
    },
    onSettled: () => {
      setPrimaryActionReady(true)
    },
  })

  const openFinishConfirmation = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      finishConfirmationDeferredRef.current = { resolve, reject }
      setIsFinishConfirmOpen(true)
    })
  }, [])

  const closeFinishConfirmation = useCallback(() => {
    const pending = finishConfirmationDeferredRef.current
    finishConfirmationDeferredRef.current = null
    setIsFinishConfirmOpen(false)
    pending?.reject(new Error("Finish cancelled."))
  }, [])

  const handleFinishConfirmed = useCallback(async () => {
    const pending = finishConfirmationDeferredRef.current
    if (!pending) {
      return
    }

    try {
      setPrimaryActionReady(false)
      await finishMutation.mutateAsync(resolvedFinishSetupState)
      finishConfirmationDeferredRef.current = null
      setIsFinishConfirmOpen(false)
      pending.resolve()
    } catch (error) {
      pending.reject(error instanceof Error ? error : new Error("Unable to finish review."))
    }
  }, [finishMutation, resolvedFinishSetupState, setPrimaryActionReady])

  useEffect(() => {
    if (!eventId || !reviewSummary) {
      setPrimaryAction(null)
      setPrimaryActionReady(false)
      return
    }

    setSetupState(reviewSummary.setupState)
    setFinishSetupState(
      setupStateOptions.find((option) => option.value === reviewSummary.setupState)?.value ??
        selectableSetupStates.find((option) => !option.isFinal)?.value ??
        selectableSetupStates.find((option) => option.isFinal)?.value ??
        null,
    )
    setPrimaryAction(async () => {
      await openFinishConfirmation()
    })
    setPrimaryActionReady(true)
    return () => {
      setPrimaryAction(null)
      setPrimaryActionReady(true)
    }
  }, [eventId, openFinishConfirmation, reviewSummary, selectableSetupStates, setPrimaryAction, setPrimaryActionReady, setupStateOptions])

  const selectedVisibilityLabel = reviewSummary?.visibility ?? "Not set"
  const selectedPurchaseTimeLimit = reviewSummary?.purchaseTimeLimit ?? 15
  const selectedPaymentAccountName = reviewSummary?.paymentAccountName ?? "Not selected"
  const selectedPaymentAccountMerchant = reviewSummary?.paymentAccountMerchant ?? ""
  const selectedPaymentAccountCurrency = reviewSummary?.paymentAccountCurrency ?? ""
  const selectedTimeZoneLabel = reviewSummary?.timeZone ?? "Not set"
  const selectedVenue = reviewSummary?.venueName ?? "Not selected"
  const selectedName = reviewSummary?.name ?? ""
  const selectedTermsConditions = reviewSummary?.termsConditions ?? ""
  const selectedThemeColor = reviewSummary?.themeColor ?? "#CBD5E1"
  const selectedSessions = reviewSummary?.sessions ?? []
  const hasQuestions = reviewSummary?.hasQuestions ?? false
  const hasTermsConditions = Boolean(selectedTermsConditions?.trim())
  const hasDiscountCoupons = reviewSummary?.discountsEnabled ?? false
  const selectedStartDate = reviewSummary?.startDate ?? ""
  const selectedEndDate = reviewSummary?.endDate ?? ""
  const selectedBookingStartDate = reviewSummary?.bookingStartDate ?? ""
  const selectedBookingEndDate = reviewSummary?.bookingEndDate ?? ""
  const summaryError = reviewSummaryQuery.error

  function editStep(step: ReviewStepSlug) {
    if (!eventId) {
      return
    }

    navigate(`${APP_ROUTES.eventWizard.editStep(eventId, step)}?returnUrl=${encodeURIComponent(returnUrl)}`)
  }

  const isSummaryLoading = Boolean(eventId) && reviewSummaryQuery.isLoading

  return (
    <Stack gap={5}>
      <Box
        border="1px solid"
        borderColor="gray.200"
        borderRadius="20px"
        overflow="hidden"
        bg="white"
        boxShadow="0 10px 24px rgba(15, 23, 42, 0.045)"
      >
        <Flex
          direction={{ base: "column", md: "row" }}
          align={{ base: "flex-start", md: "center" }}
          justify="space-between"
          gap={4}
          px={{ base: 4, md: 5 }}
          py={{ base: 4, md: 4 }}
          bg="linear-gradient(135deg, rgba(117,81,255,0.08) 0%, rgba(66,42,251,0.04) 100%)"
          borderBottom="1px solid"
          borderColor="gray.200"
        >
          <Box flex="1" minW={0}>
            <Text fontSize={{ base: "sm", md: "md" }} fontWeight="800" color="gray.900">
              Ready For Sale?
            </Text>
            <Text mt={1} fontSize="sm" color="gray.600">
              Decide whether this event should be released for sale or remain in review.
            </Text>
          </Box>

          <Flex align="center" justify={{ base: "flex-start", md: "flex-end" }} flexShrink={0} ml={{ md: "auto" }}>
            <Switch.Root
              checked={resolvedFinishSetupState === finalSetupState}
              disabled={selectableSetupStates.length < 2}
              onCheckedChange={(details) =>
                setFinishSetupState(
                  details.checked ? finalSetupState : selectableSetupStates.find((option) => !option.isFinal)?.value ?? null,
                )
              }
              colorPalette="brand"
              aria-label={setupStateOptions.find((option) => option.isFinal)?.label ?? "Ready For Sale"}
            >
              <Switch.HiddenInput />
              <Box transform="scale(1.12)" transformOrigin="center">
                <Switch.Control />
              </Box>
            </Switch.Root>
          </Flex>
        </Flex>

        <ReviewItem
          label="Current Setup State"
          value={
            <Badge variant="subtle" colorPalette={setupStateTheme.colorPalette} borderRadius="999px" px={3} py={1}>
              <Flex align="center" gap={1.5}>
                <CheckCircle2 size={14} />
                <Text as="span" fontSize="xs" fontWeight="800">
                  {setupStateTheme.label}
                </Text>
              </Flex>
            </Badge>
          }
          editLabel="Setup state"
          isLoading={isSummaryLoading}
        />
        <ReviewItem
          label="Name"
          value={
            <Text fontSize="sm" fontWeight="800" color="gray.900" wordBreak="break-word">
              {selectedName || "Not set"}
            </Text>
          }
          onEdit={() => editStep("name")}
          editLabel="Edit event name"
          isLoading={isSummaryLoading}
        />
        <ReviewItem
          label="Terms & Conditions"
          value={<ReviewPill label={getBooleanLabel(hasTermsConditions)} isSuccess={hasTermsConditions} />}
          onEdit={() => editStep("terms-conditions")}
          editLabel="Edit terms & conditions"
          isLoading={isSummaryLoading}
        />
        <ReviewItem
          label="Theme color"
          value={
            <Flex align="center" gap={3} justify="flex-start">
              <Box
                boxSize="28px"
                borderRadius="full"
                border="1px solid"
                borderColor="gray.300"
                bg={selectedThemeColor}
                flexShrink={0}
              />
            </Flex>
          }
          onEdit={() => editStep("theme-color")}
          editLabel="Edit theme color"
          isLoading={isSummaryLoading}
        />
        <ReviewItem
          label="Payment Account"
          value={
            reviewSummary?.paymentAccountName ? (
              <Stack gap={2} align="flex-start">
                <Text fontSize="sm" fontWeight="800" color="gray.900" wordBreak="break-word">
                  {selectedPaymentAccountName}
                </Text>
                <Flex gap={2} wrap="wrap" justify="flex-start">
                  {selectedPaymentAccountMerchant ? <TextPill colorPalette="cyan">{selectedPaymentAccountMerchant}</TextPill> : null}
                  {selectedPaymentAccountCurrency ? <TextPill colorPalette="gray">{selectedPaymentAccountCurrency}</TextPill> : null}
                </Flex>
              </Stack>
            ) : (
              <Text fontSize="sm" color="gray.600">
                Not selected
              </Text>
            )
          }
          onEdit={() => editStep("payment-account")}
          editLabel="Edit payment account"
          isLoading={isSummaryLoading}
        />
        <ReviewItem
          label="Time zone"
          value={
            <Text fontSize="sm" fontWeight="800" color="gray.900" wordBreak="break-word">
              {selectedTimeZoneLabel}
            </Text>
          }
          onEdit={() => editStep("time-zone")}
          editLabel="Edit time zone"
          isLoading={isSummaryLoading}
        />
        <ReviewItem
          label="Venue"
          value={
            <Text fontSize="sm" fontWeight="800" color="gray.900" wordBreak="break-word">
              {selectedVenue || "Not selected"}
            </Text>
          }
          onEdit={() => editStep("venue")}
          editLabel="Edit venue"
          isLoading={isSummaryLoading}
        />
        <ReviewItem
          label="Sessions"
          value={
            selectedSessions.length > 0 ? (
              <Flex gap={2} wrap="wrap">
                {selectedSessions.map((session, index) => (
                  <SessionLinkPill
                    key={session.uniqueId || `${session.name}-${index}`}
                    sessionId={session.uniqueId}
                    sessionName={session.name || `Session ${index + 1}`}
                    setupState={session.setupState}
                  />
                ))}
              </Flex>
            ) : (
              <Text fontSize="sm" fontWeight="800" color="gray.600">
                No sessions configured
              </Text>
            )
          }
          onEdit={() => editStep("sessions")}
          editLabel="Edit sessions"
          isLoading={isSummaryLoading}
        />
        <ReviewItem
          label="Event Window"
          value={
            <Stack gap={1}>
              <Text fontSize="sm" fontWeight="800" color="gray.900" wordBreak="break-word">
                {selectedStartDate ? format(parseISO(selectedStartDate), "dd-MMM-yyyy hh:mm aa") : "Not set"}
              </Text>
              <Text fontSize="sm" fontWeight="800" color="gray.900" wordBreak="break-word">
                {selectedEndDate ? format(parseISO(selectedEndDate), "dd-MMM-yyyy hh:mm aa") : "Not set"}
              </Text>
            </Stack>
          }
          onEdit={() => editStep("date-time")}
          editLabel="Edit event window"
          isLoading={isSummaryLoading}
        />
        <ReviewItem
          label="Booking Window"
          value={
            <Stack gap={1}>
              <Text fontSize="sm" fontWeight="800" color="gray.900" wordBreak="break-word">
                {selectedBookingStartDate ? format(parseISO(selectedBookingStartDate), "dd-MMM-yyyy hh:mm aa") : "Not set"}
              </Text>
              <Text fontSize="sm" fontWeight="800" color="gray.900" wordBreak="break-word">
                {selectedBookingEndDate ? format(parseISO(selectedBookingEndDate), "dd-MMM-yyyy hh:mm aa") : "Not set"}
              </Text>
            </Stack>
          }
          onEdit={() => editStep("date-time")}
          editLabel="Edit booking window"
          isLoading={isSummaryLoading}
        />
        <ReviewItem
          label="Discount Coupons"
          value={<ReviewPill label={getBooleanLabel(hasDiscountCoupons)} isSuccess={hasDiscountCoupons} />}
          onEdit={() => editStep("discount-coupon")}
          editLabel="Edit discount coupons"
          isLoading={isSummaryLoading}
        />
        <ReviewItem
          label="Questions"
          value={<ReviewPill label={getBooleanLabel(hasQuestions)} isSuccess={hasQuestions} />}
          onEdit={() => editStep("questions")}
          editLabel="Edit questions"
          isLoading={isSummaryLoading}
        />
        <ReviewItem
          label="Advanced Settings"
          value={
            <Stack gap={2} align="flex-start">
              <Text fontSize="sm" fontWeight="800" color="gray.900" wordBreak="break-word">
                {selectedVisibilityLabel}
              </Text>
              <TextPill colorPalette="gray">{`${selectedPurchaseTimeLimit} minute${selectedPurchaseTimeLimit === 1 ? "" : "s"}`}</TextPill>
            </Stack>
          }
          onEdit={() => editStep("advanced-settings")}
          editLabel="Edit advanced settings"
          isLoading={isSummaryLoading}
        />
      </Box>

      <Dialog.Root
        open={isFinishConfirmOpen}
        onOpenChange={(details) => {
          if (details.open) {
            setIsFinishConfirmOpen(true)
            return
          }

          if (finishConfirmationDeferredRef.current) {
            closeFinishConfirmation()
          }
        }}
        size={finishDialogSize}
      >
        <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius={{ base: 0, md: "24px" }}
            maxW={{ base: "100vw", md: "620px" }}
            m={{ base: 0, md: "auto" }}
            overflow="hidden"
            display="flex"
            flexDirection="column"
          >
            <Box px={5} pt={5} pb={4} borderBottom="1px solid" borderColor="gray.200">
              <Flex align="flex-start" justify="space-between" gap={4}>
                <Box>
                  <Text fontSize="xl" fontWeight="900" color="gray.900" lineHeight="1.05">
                    Confirm Finish
                  </Text>
                </Box>

                <Dialog.CloseTrigger asChild>
                  <CloseButton aria-label="Close finish confirmation" />
                </Dialog.CloseTrigger>
              </Flex>
            </Box>

            <Dialog.Body px={5} py={4} flex="0 0 auto">
              <Stack gap={3}>
                <Text fontSize="sm" color="gray.700" lineHeight="1.45">
                  You are about to finish the review and set the event to the selected state.
                </Text>

                <Box border="1px solid" borderColor="gray.200" bg="gray.50" borderRadius="16px" px={4} py={3}>
                  <Text fontSize="xs" fontWeight="900" color="gray.500" letterSpacing="0.18em" textTransform="uppercase">
                    Target State
                  </Text>
                  <Badge
                    mt={1.5}
                    variant="subtle"
                    colorPalette={resolvedFinishSetupState === finalSetupState ? "green" : "orange"}
                    borderRadius="999px"
                    px={3}
                    py={0.75}
                  >
                    <Flex align="center" gap={1.5}>
                      <CheckCircle2 size={14} />
                      <Text as="span" fontSize="xs" fontWeight="800">
                        {finishSetupStateLabel}
                      </Text>
                    </Flex>
                  </Badge>
                </Box>
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
                onClick={() => closeFinishConfirmation()}
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
                    resolvedFinishSetupState === finalSetupState
                      ? "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)"
                      : "linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)",
                }}
                loading={finishMutation.isPending}
                onClick={handleFinishConfirmed}
              >
                Finish
              </Button>
            </Flex>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {summaryError ? (
        <Text fontSize="sm" color="red.500">
          {extractApiError(summaryError)}
        </Text>
      ) : null}

      {finishMutation.isError ? (
        <Text fontSize="sm" color="red.500">
          {extractApiError(finishMutation.error)}
        </Text>
      ) : null}
    </Stack>
  )
}
