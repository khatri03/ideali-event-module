import { Badge, Box, Flex, Image, Stack, Text } from "@chakra-ui/react"
import { format } from "date-fns"
import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { useWatch } from "react-hook-form"
import { useParams } from "react-router-dom"
import { fetchEventWizardQuestions, fetchEventWizardThankYouEmail } from "@/api/events"
import { auth } from "@/lib/auth"
import { useEventDiscountCoupons } from "../hooks/useEventDiscountCoupons"
import { htmlToPlainText } from "@/utils/html"
import { defaultEventWizardValues, type EventWizardValues } from "../schemas/eventWizard.schemas"

function getVisibilityLabel(visibility?: string | null) {
  switch (visibility) {
    case "Member":
      return "Members only"
    case "Invitation":
      return "Invitation only"
    case "Public":
    default:
      return "Public"
  }
}

export function EventReviewStepPage() {
  const { eventId } = useParams<{ eventId?: string }>()
  const values = useWatch({ defaultValue: defaultEventWizardValues }) as EventWizardValues
  const discountCouponsQuery = useEventDiscountCoupons(eventId)
  const questionsQuery = useQuery({
    queryKey: ["events", "review", eventId, "questions"],
    queryFn: () => {
      if (!eventId) {
        throw new Error("Event id is required.")
      }

      return fetchEventWizardQuestions(eventId)
    },
    enabled: !!eventId,
    retry: false,
  })
  const thankYouEmailQuery = useQuery({
    queryKey: ["events", "review", eventId, "thank-you-email"],
    queryFn: () => {
      if (!eventId) {
        throw new Error("Event id is required.")
      }

      return fetchEventWizardThankYouEmail(eventId)
    },
    enabled: !!eventId,
    retry: false,
  })
  const organizer = auth.getOrganizer()
  const paymentAccount = organizer?.paymentAccounts?.find((account) => account.uniqueId === values.paymentAccountId)
  const discountCouponValue = discountCouponsQuery.isLoading
    ? "Loading..."
    : discountCouponsQuery.data
      ? discountCouponsQuery.data.discountsEnabled
        ? `${discountCouponsQuery.data.coupons.length} coupon${discountCouponsQuery.data.coupons.length === 1 ? "" : "s"} configured`
        : "Disabled"
      : "Not configured"

  const selectedFormCount = questionsQuery.data?.customFormUniqueIds.length ?? 0
  const customQuestionCount = questionsQuery.data?.customQuestions.length ?? 0
  const selectedQuestionsSummary = (() => {
    const formLabel = `${selectedFormCount} Custom Form${selectedFormCount === 1 ? "" : "s"}`
    const questionLabel = `${customQuestionCount} Question${customQuestionCount === 1 ? "" : "s"}`

    if (selectedFormCount > 0 && customQuestionCount > 0) {
      return `${formLabel} and ${questionLabel}`
    }

    if (selectedFormCount > 0) {
      return formLabel
    }

    if (customQuestionCount > 0) {
      return questionLabel
    }

    return "None"
  })()

  const thankYouEmailSummary = thankYouEmailQuery.isLoading
    ? "Loading..."
    : thankYouEmailQuery.data
      ? (() => {
          const hasEmailContent = Boolean(thankYouEmailQuery.data?.emailSubject || thankYouEmailQuery.data?.emailTemplate)
          const notificationRecipients = thankYouEmailQuery.data?.otherNotificationEmails?.trim() ?? ""
          const hasNotifications =
            thankYouEmailQuery.data?.notifyOrganizer ||
            notificationRecipients.length > 0

          if (!hasEmailContent) {
            return "Skipped"
          }

          return hasNotifications ? "Configured with notifications" : "Configured"
        })()
      : "Not configured"

  return (
    <Stack h="full" gap={5}>
      <Stack flex="1" gap={5}>
        <Text fontSize="sm" color="text.secondary">
          Review the setup before creating the event. Hidden defaults will be applied to the remaining platform fields for now.
        </Text>

        <Stack gap={4}>
          <ReviewRow label="Name" value={values.name} />
          <ReviewRow label="Description" value={htmlToPlainText(values.description) || "No description provided"} />
          <ReviewRow
            label="Banner"
            value={
              values.bannerUrl ? (
                <Box
                  border="1px solid"
                  borderColor="border.subtle"
                  borderRadius="18px"
                  overflow="hidden"
                  maxW={{ base: "full", md: "360px" }}
                  ml={{ md: "auto" }}
                >
                  <Image
                    src={values.bannerUrl}
                    alt="Event banner preview"
                    w="full"
                    maxH="160px"
                    objectFit="cover"
                  />
                </Box>
              ) : (
                <Text fontSize="sm" color="text.secondary">
                  Not selected
                </Text>
              )
            }
            isRequired
          />
          <ReviewRow label="Theme color" value={<ColorPill color={values.themeColor} />} isRequired />
          <ReviewRow label="Visibility" value={getVisibilityLabel(values.visibility)} />
          <ReviewRow label="Payment account" value={paymentAccount?.name || "Not selected"} isRequired />
          <ReviewRow
            label="Payment methods"
            value={values.paymentMethods.length > 0 ? `${values.paymentMethods.length} selected` : "Not selected"}
            isRequired
          />
          <ReviewRow label="Discount coupon" value={discountCouponValue} />
          <ReviewRow label="Questions" value={questionsQuery.isLoading ? "Loading..." : selectedQuestionsSummary} />
          <ReviewRow label="Thank you Email" value={thankYouEmailSummary} />
          <ReviewRow
            label="Advanced settings"
            value={values.purchaseTimeLimitMinutes ? `${values.purchaseTimeLimitMinutes} minutes before start` : "Not set"}
          />
          <ReviewRow label="Time zone" value={values.timeZone || "Not set"} />
          <ReviewRow label="Venue" value="Not configured" />
          <ReviewRow
            label="Sessions"
            value={
              values.sessions.length > 0 ? (
                <Stack gap={2}>
                  {values.sessions.map((session, index) => (
                    <Box key={`${session.title}-${index}`} p={3} borderRadius="16px" bg="app.bg" border="1px solid" borderColor="border.subtle">
                      <Text fontSize="sm" fontWeight="700" color="text.primary">
                        {session.title || `Session ${index + 1}`}
                      </Text>
                      <Text fontSize="sm" color="text.secondary">
                        {session.startsAt ? format(new Date(session.startsAt), "PPpp") : "Start time not set"} -{" "}
                        {session.endsAt ? format(new Date(session.endsAt), "PPpp") : "End time not set"}
                      </Text>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Text fontSize="sm" color="text.secondary">
                  No sessions configured.
                </Text>
              )
            }
          />
        </Stack>

      </Stack>
    </Stack>
  )
}

function ReviewRow({
  label,
  value,
  isRequired = false,
}: {
  label: string
  value: ReactNode
  isRequired?: boolean
}) {
  return (
    <Flex
      direction={{ base: "column", md: "row" }}
      gap={3}
      p={4}
      borderRadius="18px"
      border="1px solid"
      borderColor="border.subtle"
      bg="app.bg"
      align={{ md: "center" }}
      justify="space-between"
    >
      <Text fontSize="sm" fontWeight="700" color="text.primary" minW={{ md: "180px" }}>
        <Flex as="span" align="center" gap={2} wrap="wrap">
          <Text as="span">{label}</Text>
          {isRequired ? (
            <Text as="span" color="red.500" fontWeight="800" aria-hidden="true">
              *
            </Text>
          ) : null}
        </Flex>
      </Text>
      <Box flex={1} textAlign={{ md: "right" }}>
        {value}
      </Box>
    </Flex>
  )
}

function ColorPill({ color }: { color: string }) {
  return (
    <Badge
      borderRadius="999px"
      px={3}
      py={1}
      fontSize="sm"
      fontWeight="700"
      color="white"
      style={{ background: color }}
    >
      {color}
    </Badge>
  )
}
