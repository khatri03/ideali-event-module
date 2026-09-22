import type { ComponentType } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Badge, Box, Button, Heading, HStack, Skeleton, Stack, Text, Wrap } from "@chakra-ui/react"
import { ArrowLeft, BarChart3, CalendarClock, LayoutGrid, MapPin } from "lucide-react"
import type { LucideProps } from "lucide-react"
import { format, parseISO } from "date-fns"
import { APP_ROUTES } from "@/utils/routes"
import { EventReportTabs } from "../components/EventReportTabs"
import { useEventRenderContext } from "../hooks/useEventReports"

interface EventReportLocationState {
  eventLabel?: string
  chartUniqueId?: string
}

type StatusPalette = "green" | "gray" | "purple" | "red"

/** How each session lifecycle token renders as a header badge; a token missing here (or empty) shows no badge. */
const SESSION_STATUS: Record<string, { label: string; palette: StatusPalette }> = {
  draft: { label: "Draft", palette: "gray" },
  published: { label: "Published", palette: "green" },
  started: { label: "Live", palette: "purple" },
  ended: { label: "Ended", palette: "gray" },
  cancelled: { label: "Cancelled", palette: "red" },
}

/** Formats the session start for the header, or returns an empty string when it is missing or unparseable. */
function formatSessionStart(isoUtc: string): string {
  if (!isoUtc) {
    return ""
  }
  const parsed = parseISO(isoUtc)
  return Number.isNaN(parsed.getTime()) ? "" : format(parsed, "EEE d MMM yyyy, h:mm a")
}

/** One labelled fact in the report header — session, venue or chart — so each name is spelled out, not guessed. */
function HeaderFact({ icon: Icon, label, value }: { icon: ComponentType<LucideProps>; label: string; value: string }) {
  return (
    <HStack gap={2} color="gray.600" minW={0}>
      <Box color="gray.400" flexShrink={0}>
        <Icon size={15} />
      </Box>
      <Text fontSize={{ base: "sm", md: "md" }} truncate>
        <Text as="span" fontWeight="700" color="gray.500">
          {label}:{" "}
        </Text>
        <Text as="span" fontWeight="600">
          {value}
        </Text>
      </Text>
    </HStack>
  )
}

export function EventReportPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { eventUniqueId = "" } = useParams()
  const state = (location.state ?? null) as EventReportLocationState | null

  const backTarget = state?.chartUniqueId
    ? APP_ROUTES.seatingLayouts.events(state.chartUniqueId)
    : APP_ROUTES.seatingLayouts.list

  const renderContext = useEventRenderContext(eventUniqueId, Boolean(eventUniqueId))
  const eventLabel = renderContext.data?.eventLabel || state?.eventLabel || ""
  const chartName = renderContext.data?.chartName || ""
  const venueName = renderContext.data?.venueName || ""
  const sessionName = renderContext.data?.sessionName || ""
  const sessionStart = formatSessionStart(renderContext.data?.sessionStartUtc || "")
  const status = SESSION_STATUS[renderContext.data?.sessionStatus ?? ""]
  const sessionValue = sessionName && sessionStart ? `${sessionName} · ${sessionStart}` : sessionName
  const isHeaderLoading = !eventLabel && renderContext.isLoading

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
            Seats.io event report
          </Text>
        </HStack>
        {isHeaderLoading ? (
          <Skeleton height="9" width={{ base: "70%", md: "320px" }} borderRadius="10px" />
        ) : (
          <HStack gap={3} flexWrap="wrap">
            <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="gray.900">
              {eventLabel || "Event report"}
            </Heading>
            {status ? (
              <Badge variant="subtle" colorPalette={status.palette} borderRadius="999px" px={3} py={1} fontWeight="700">
                {status.label}
              </Badge>
            ) : null}
          </HStack>
        )}
        {sessionValue || venueName || chartName ? (
          <Wrap gapX={5} gapY={1.5}>
            {sessionValue ? <HeaderFact icon={CalendarClock} label="Session" value={sessionValue} /> : null}
            {venueName ? <HeaderFact icon={MapPin} label="Venue" value={venueName} /> : null}
            {chartName ? <HeaderFact icon={LayoutGrid} label="Chart" value={chartName} /> : null}
          </Wrap>
        ) : null}
      </Stack>

      <Box borderRadius="20px" border="1px solid" borderColor="border.subtle" bg="card.bg" boxShadow="card" p={{ base: 3, md: 5 }}>
        <EventReportTabs eventUniqueId={eventUniqueId} />
      </Box>
    </Box>
  )
}
