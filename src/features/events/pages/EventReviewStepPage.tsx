import type { ReactNode } from "react"
import { useMemo } from "react"
import { Badge, Box, Button, Flex, Grid, Skeleton, Stack, Text } from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { useWatch } from "react-hook-form"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { CheckCircle2, PencilLine, X } from "lucide-react"
import { format, parseISO } from "date-fns"
import {
  fetchEventWizardAdvancedSettings,
  fetchEventWizardDateTime,
  fetchEventWizardName,
  fetchEventWizardPaymentAccount,
  fetchEventWizardQuestions,
  fetchEventWizardSessions,
  fetchEventWizardThemeColor,
  fetchEventWizardTimeZone,
  fetchEventWizardTimeZones,
  fetchEventWizardTermsConditions,
  fetchEventWizardVenue,
  fetchEventWizardVisibilityOptions,
} from "@/api/events"
import { fetchOrganizerVenues } from "@/api/organizer"
import { fetchOrganizerPaymentAccountSelectionItems } from "@/api/paymentAccounts"
import { extractApiError } from "@/utils/errors"
import { APP_ROUTES } from "@/utils/routes"
import { defaultEventWizardValues, type EventWizardValues } from "../schemas/eventWizard.schemas"
import { useEventDiscountCoupons } from "../hooks/useEventDiscountCoupons"

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
  const values = useWatch({ defaultValue: defaultEventWizardValues }) as EventWizardValues
  const returnUrl = useMemo(() => `${location.pathname}${location.search}`, [location.pathname, location.search])

  const nameQuery = useQuery({
    queryKey: ["events", "review", eventId, "name"],
    queryFn: () => {
      if (!eventId) {
        throw new Error("Event id is required.")
      }

      return fetchEventWizardName(eventId)
    },
    enabled: Boolean(eventId),
    retry: false,
  })
  const termsConditionsQuery = useQuery({
    queryKey: ["events", "review", eventId, "terms-conditions"],
    queryFn: () => {
      if (!eventId) {
        throw new Error("Event id is required.")
      }

      return fetchEventWizardTermsConditions(eventId)
    },
    enabled: Boolean(eventId),
    retry: false,
  })
  const themeColorQuery = useQuery({
    queryKey: ["events", "review", eventId, "theme-color"],
    queryFn: () => {
      if (!eventId) {
        throw new Error("Event id is required.")
      }

      return fetchEventWizardThemeColor(eventId)
    },
    enabled: Boolean(eventId),
    retry: false,
  })
  const paymentAccountQuery = useQuery({
    queryKey: ["events", "review", eventId, "payment-account"],
    queryFn: () => {
      if (!eventId) {
        throw new Error("Event id is required.")
      }

      return fetchEventWizardPaymentAccount(eventId)
    },
    enabled: Boolean(eventId),
    retry: false,
  })
  const advancedSettingsQuery = useQuery({
    queryKey: ["events", "review", eventId, "advanced-settings"],
    queryFn: () => {
      if (!eventId) {
        throw new Error("Event id is required.")
      }

      return fetchEventWizardAdvancedSettings(eventId)
    },
    enabled: Boolean(eventId),
    retry: false,
  })
  const dateTimeQuery = useQuery({
    queryKey: ["events", "review", eventId, "date-time"],
    queryFn: () => {
      if (!eventId) {
        throw new Error("Event id is required.")
      }

      return fetchEventWizardDateTime(eventId)
    },
    enabled: Boolean(eventId),
    retry: false,
  })
  const timeZoneQuery = useQuery({
    queryKey: ["events", "review", eventId, "time-zone"],
    queryFn: () => {
      if (!eventId) {
        throw new Error("Event id is required.")
      }

      return fetchEventWizardTimeZone(eventId)
    },
    enabled: Boolean(eventId),
    retry: false,
  })
  const venueQuery = useQuery({
    queryKey: ["events", "review", eventId, "venue"],
    queryFn: () => {
      if (!eventId) {
        throw new Error("Event id is required.")
      }

      return fetchEventWizardVenue(eventId)
    },
    enabled: Boolean(eventId),
    retry: false,
  })
  const sessionsQuery = useQuery({
    queryKey: ["events", "review", eventId, "sessions"],
    queryFn: () => {
      if (!eventId) {
        throw new Error("Event id is required.")
      }

      return fetchEventWizardSessions(eventId)
    },
    enabled: Boolean(eventId),
    retry: false,
  })
  const questionsQuery = useQuery({
    queryKey: ["events", "review", eventId, "questions"],
    queryFn: () => {
      if (!eventId) {
        throw new Error("Event id is required.")
      }

      return fetchEventWizardQuestions(eventId)
    },
    enabled: Boolean(eventId),
    retry: false,
  })
  const visibilityOptionsQuery = useQuery({
    queryKey: ["events", "review", "visibility-options"],
    queryFn: fetchEventWizardVisibilityOptions,
    staleTime: 1000 * 60 * 60,
    retry: false,
  })
  const timeZonesQuery = useQuery({
    queryKey: ["events", "review", "time-zones"],
    queryFn: fetchEventWizardTimeZones,
    staleTime: 1000 * 60 * 60,
    retry: false,
  })
  const venueOptionsQuery = useQuery({
    queryKey: ["events", "review", "venues"],
    queryFn: fetchOrganizerVenues,
    staleTime: 1000 * 60 * 10,
    retry: false,
  })
  const paymentAccountsQuery = useQuery({
    queryKey: ["events", "review", "payment-accounts"],
    queryFn: fetchOrganizerPaymentAccountSelectionItems,
    staleTime: 1000 * 60 * 10,
    retry: false,
  })
  const discountCouponsQuery = useEventDiscountCoupons(eventId)

  const selectedVisibility = advancedSettingsQuery.data?.visibility ?? values.visibility ?? "Public"
  const selectedVisibilityLabel =
    visibilityOptionsQuery.data?.find((option) => option.value === selectedVisibility)?.label ?? selectedVisibility
  const selectedPurchaseTimeLimit = advancedSettingsQuery.data?.purchaseTimeLimit ?? values.purchaseTimeLimitMinutes ?? 15
  const selectedPaymentAccountUniqueId = paymentAccountQuery.data?.paymentAccountUniqueId ?? values.paymentAccountId ?? ""
  const selectedVenueUniqueId = venueQuery.data?.venueUniqueId ?? values.venueUniqueId ?? ""
  const selectedTimeZoneId = timeZoneQuery.data?.timeZoneId ?? values.timeZoneId
  const selectedTimeZoneLabel =
    timeZonesQuery.data?.find((timeZone) => timeZone.id === selectedTimeZoneId)?.displayName ?? values.timeZone ?? "Not set"
  const selectedPaymentAccount = paymentAccountsQuery.data?.find((account) => account.uniqueId === selectedPaymentAccountUniqueId) ?? null
  const selectedVenue = venueOptionsQuery.data?.find((venue) => venue.uniqueId === selectedVenueUniqueId) ?? null
  const selectedName = nameQuery.data?.name ?? values.name
  const selectedTermsConditions = termsConditionsQuery.data?.termsConditions ?? values.termsConditions
  const selectedThemeColor = themeColorQuery.data?.themeColor ?? values.themeColor ?? defaultEventWizardValues.themeColor
  const selectedSessions = sessionsQuery.data ?? []
  const hasQuestions = Boolean(
    (questionsQuery.data?.customFormUniqueIds.length ?? 0) > 0 || (questionsQuery.data?.customQuestions.length ?? 0) > 0,
  )
  const hasTermsConditions = Boolean(selectedTermsConditions?.trim())
  const hasDiscountCoupons = discountCouponsQuery.data?.discountsEnabled ?? false
  const selectedPaymentAccountName = selectedPaymentAccount?.name ?? "Not selected"
  const selectedPaymentAccountMerchant = selectedPaymentAccount?.paymentMerchant ?? ""
  const selectedPaymentAccountCurrency = selectedPaymentAccount?.paymentCurrency ?? ""
  const selectedStartDate = dateTimeQuery.data?.startDate ?? values.startDate ?? ""
  const selectedEndDate = dateTimeQuery.data?.endDate ?? values.endDate ?? ""
  const selectedBookingStartDate = dateTimeQuery.data?.bookingStartDate ?? values.bookingStartDate ?? ""
  const selectedBookingEndDate = dateTimeQuery.data?.bookingEndDate ?? values.bookingEndDate ?? ""
  const summaryError =
    nameQuery.error ??
    termsConditionsQuery.error ??
    themeColorQuery.error ??
    paymentAccountQuery.error ??
    advancedSettingsQuery.error ??
    dateTimeQuery.error ??
    timeZoneQuery.error ??
    venueQuery.error ??
    sessionsQuery.error ??
    questionsQuery.error ??
    visibilityOptionsQuery.error ??
    timeZonesQuery.error ??
    venueOptionsQuery.error ??
    paymentAccountsQuery.error ??
    discountCouponsQuery.error

  function editStep(step: ReviewStepSlug) {
    if (!eventId) {
      return
    }

    navigate(`${APP_ROUTES.eventWizard.editStep(eventId, step)}?returnUrl=${encodeURIComponent(returnUrl)}`)
  }

  const isNameLoading = Boolean(eventId) && nameQuery.isLoading
  const isTermsLoading = Boolean(eventId) && termsConditionsQuery.isLoading
  const isThemeColorLoading = Boolean(eventId) && themeColorQuery.isLoading
  const isPaymentAccountLoading =
    (Boolean(eventId) && paymentAccountQuery.isLoading) ||
    (Boolean(selectedPaymentAccountUniqueId) && paymentAccountsQuery.isLoading)
  const isTimeZoneLoading =
    (Boolean(eventId) && timeZoneQuery.isLoading) || (Boolean(selectedTimeZoneId) && timeZonesQuery.isLoading)
  const isVenueLoading = (Boolean(eventId) && venueQuery.isLoading) || (Boolean(selectedVenueUniqueId) && venueOptionsQuery.isLoading)
  const isSessionsLoading = Boolean(eventId) && sessionsQuery.isLoading
  const isDiscountCouponsLoading = Boolean(eventId) && discountCouponsQuery.isLoading
  const isQuestionsLoading = Boolean(eventId) && questionsQuery.isLoading
  const isAdvancedSettingsLoading =
    (Boolean(eventId) && advancedSettingsQuery.isLoading) || visibilityOptionsQuery.isLoading || timeZonesQuery.isLoading

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
          align={{ base: "flex-start", md: "flex-start" }}
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
              Review event details
            </Text>
            <Text mt={1} fontSize="sm" color="gray.600">
              Use the edit buttons to jump back to a specific step before saving the event.
            </Text>
          </Box>
        </Flex>

        <ReviewItem
          label="Name"
          value={
            <Text fontSize="sm" fontWeight="800" color="gray.900" wordBreak="break-word">
              {selectedName || "Not set"}
            </Text>
          }
          onEdit={() => editStep("name")}
          editLabel="Edit event name"
          isLoading={isNameLoading}
        />
        <ReviewItem
          label="Terms & Conditions"
          value={<ReviewPill label={getBooleanLabel(hasTermsConditions)} isSuccess={hasTermsConditions} />}
          onEdit={() => editStep("terms-conditions")}
          editLabel="Edit terms & conditions"
          isLoading={isTermsLoading}
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
          isLoading={isThemeColorLoading}
        />
        <ReviewItem
          label="Payment Account"
          value={
            selectedPaymentAccount ? (
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
          isLoading={isPaymentAccountLoading}
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
          isLoading={isTimeZoneLoading}
        />
        <ReviewItem
          label="Venue"
          value={
            <Text fontSize="sm" fontWeight="800" color="gray.900" wordBreak="break-word">
              {selectedVenue?.name || "Not selected"}
            </Text>
          }
          onEdit={() => editStep("venue")}
          editLabel="Edit venue"
          isLoading={isVenueLoading}
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
          isLoading={isSessionsLoading}
        />
        <ReviewItem
          label="Event Date/Time"
          value={
            <Stack gap={3}>
              <Stack gap={1}>
                <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
                  Event window
                </Text>
                <Text fontSize="sm" fontWeight="800" color="gray.900" wordBreak="break-word">
                  {selectedStartDate ? format(parseISO(selectedStartDate), "dd-MMM-yyyy hh:mm aa") : "Not set"}
                </Text>
                <Text fontSize="sm" fontWeight="800" color="gray.900" wordBreak="break-word">
                  {selectedEndDate ? format(parseISO(selectedEndDate), "dd-MMM-yyyy hh:mm aa") : "Not set"}
                </Text>
              </Stack>
              <Stack gap={1}>
                <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
                  Booking window
                </Text>
                <Text fontSize="sm" fontWeight="800" color="gray.900" wordBreak="break-word">
                  {selectedBookingStartDate ? format(parseISO(selectedBookingStartDate), "dd-MMM-yyyy hh:mm aa") : "Not set"}
                </Text>
                <Text fontSize="sm" fontWeight="800" color="gray.900" wordBreak="break-word">
                  {selectedBookingEndDate ? format(parseISO(selectedBookingEndDate), "dd-MMM-yyyy hh:mm aa") : "Not set"}
                </Text>
              </Stack>
            </Stack>
          }
          onEdit={() => editStep("date-time")}
          editLabel="Edit event date/time"
          isLoading={Boolean(eventId) && dateTimeQuery.isLoading}
        />
        <ReviewItem
          label="Discount Coupons"
          value={<ReviewPill label={getBooleanLabel(hasDiscountCoupons)} isSuccess={hasDiscountCoupons} />}
          onEdit={() => editStep("discount-coupon")}
          editLabel="Edit discount coupons"
          isLoading={isDiscountCouponsLoading}
        />
        <ReviewItem
          label="Questions"
          value={<ReviewPill label={getBooleanLabel(hasQuestions)} isSuccess={hasQuestions} />}
          onEdit={() => editStep("questions")}
          editLabel="Edit questions"
          isLoading={isQuestionsLoading}
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
          isLoading={isAdvancedSettingsLoading}
        />
      </Box>

      {summaryError ? (
        <Text fontSize="sm" color="red.500">
          {extractApiError(summaryError)}
        </Text>
      ) : null}
    </Stack>
  )
}
