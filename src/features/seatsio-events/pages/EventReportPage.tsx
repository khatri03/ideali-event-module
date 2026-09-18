import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Box, Button, Heading, HStack, Stack, Text } from "@chakra-ui/react"
import { ArrowLeft, BarChart3 } from "lucide-react"
import { APP_ROUTES } from "@/utils/routes"
import { EventReportTabs } from "../components/EventReportTabs"

interface EventReportLocationState {
  eventLabel?: string
  chartUniqueId?: string
}

export function EventReportPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { eventUniqueId = "" } = useParams()
  const state = (location.state ?? null) as EventReportLocationState | null

  const backTarget = state?.chartUniqueId
    ? APP_ROUTES.seatingLayouts.events(state.chartUniqueId)
    : APP_ROUTES.seatingLayouts.list

  return (
    <Box w="full">
      <Button variant="ghost" size="sm" mb={4} px={2} color="gray.600" onClick={() => navigate(backTarget)}>
        <ArrowLeft size={16} />
        Back to events
      </Button>

      <Stack gap={2} mb={6}>
        <HStack gap={2}>
          <Box color="brand.500">
            <BarChart3 size={18} />
          </Box>
          <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="0.12em" color="gray.500">
            Seats.io · Event report
          </Text>
        </HStack>
        <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="gray.900">
          {state?.eventLabel || "Event report"}
        </Heading>
        <Text fontSize={{ base: "sm", md: "md" }} color="gray.600" maxW="2xl">
          Live seat, sales and status insights for this event. Each tab loads its report when you open it.
        </Text>
      </Stack>

      <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" boxShadow="card" p={{ base: 3, md: 5 }}>
        <EventReportTabs eventUniqueId={eventUniqueId} />
      </Box>
    </Box>
  )
}
