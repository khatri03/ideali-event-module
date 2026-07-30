import { useEffect, useRef } from "react"
import { Box, Button, Flex, SkeletonText, Stack, Text } from "@chakra-ui/react"
import { ArrowLeft } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { extractApiError } from "@/utils/errors"
import { htmlToPlainText } from "@/utils/html"
import { APP_ROUTES } from "@/utils/routes"
import { useInboxItem } from "../hooks/useAlerts"
import { useMarkAlertRead } from "../hooks/useAlertMutations"
import { formatDateTime } from "../constants"
import { PriorityPill } from "../components/PriorityPill"

export default function MemberNotificationDetailPage() {
  const navigate = useNavigate()
  const { recipientUniqueId = "" } = useParams()
  const itemQuery = useInboxItem(recipientUniqueId)
  const markRead = useMarkAlertRead()
  const markedRef = useRef(false)

  const alert = itemQuery.data

  // Opening the notification is what marks it read (Opened). Guard so it fires once per view.
  useEffect(() => {
    if (alert && !alert.isRead && !markedRef.current) {
      markedRef.current = true
      markRead.mutate(alert.uniqueId)
    }
  }, [alert, markRead])

  return (
    <Box maxW="820px" mx="auto" w="full" px={{ base: 4, md: 6 }} py={{ base: 4, md: 6 }}>
      <Button
        variant="ghost"
        size="sm"
        mb={4}
        borderRadius="10px"
        cursor="pointer"
        onClick={() => navigate(APP_ROUTES.alertInbox)}
      >
        <ArrowLeft size={16} />
        All notifications
      </Button>

      {itemQuery.isError ? (
        <Box p={4} borderRadius="16px" border="1px solid" borderColor="red.200" bg="red.50">
          <Text fontSize="sm" fontWeight="700" color="red.700">
            {extractApiError(itemQuery.error)}
          </Text>
        </Box>
      ) : itemQuery.isLoading || !alert ? (
        <Box p={5} borderRadius="16px" border="1px solid" borderColor="border.subtle" bg="card.bg">
          <SkeletonText noOfLines={6} />
        </Box>
      ) : (
        <Stack
          gap={4}
          p={{ base: 5, md: 6 }}
          borderRadius="16px"
          border="1px solid"
          borderColor="border.subtle"
          bg="card.bg"
          boxShadow="card"
        >
          <Flex justify="space-between" align="flex-start" gap={3} flexWrap="wrap">
            <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" color="gray.900">
              {alert.title}
            </Text>
            <PriorityPill priority={alert.priority} />
          </Flex>

          <Flex align="center" gap={3} color="text.secondary" fontSize="sm" flexWrap="wrap">
            <Text>From {alert.sentBy}</Text>
            <Text>•</Text>
            <Text>{formatDateTime(alert.sentAtUtc)}</Text>
          </Flex>

          <Box h="1px" bg="border.subtle" />

          <Text fontSize={{ base: "sm", md: "md" }} color="gray.700" whiteSpace="pre-wrap">
            {htmlToPlainText(alert.body)}
          </Text>
        </Stack>
      )}
    </Box>
  )
}
