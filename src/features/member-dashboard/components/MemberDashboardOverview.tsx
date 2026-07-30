import type { ReactNode } from "react"
import { Badge, Box, Button, Flex, Heading, SimpleGrid, Stack, Text, Separator } from "@chakra-ui/react"
import { ArrowRight, CalendarDays, ShieldCheck, Sparkles, Ticket, Bell } from "lucide-react"
import { format } from "date-fns"

interface DashboardStat {
  label: string
  value: string
  hint: string
  icon: ReactNode
  accent: string
}

interface UpcomingEvent {
  title: string
  dateTime: string
  location: string
  badge: string
}

interface MemberUpdate {
  title: string
  description: string
  time: string
}

const MEMBER_STATS: DashboardStat[] = [
  {
    label: "Membership",
    value: "Gold Annual",
    hint: "Renews in 42 days",
    icon: <ShieldCheck size={18} />,
    accent: "#7551FF",
  },
  {
    label: "Upcoming events",
    value: "4",
    hint: "2 this week",
    icon: <CalendarDays size={18} />,
    accent: "#3CB371",
  },
  {
    label: "Unread alerts",
    value: "3",
    hint: "1 urgent",
    icon: <Bell size={18} />,
    accent: "#F59E0B",
  },
  {
    label: "Member points",
    value: "1,240",
    hint: "+120 this month",
    icon: <Sparkles size={18} />,
    accent: "#422AFB",
  },
]

const UPCOMING_EVENTS: UpcomingEvent[] = [
  {
    title: "Summer Networking Night",
    dateTime: "2026-07-28T18:30:00",
    location: "Lahore Expo Center",
    badge: "Member only",
  },
  {
    title: "Founders Roundtable",
    dateTime: "2026-08-02T09:00:00",
    location: "Zoom",
    badge: "Priority access",
  },
  {
    title: "Wellness Workshop",
    dateTime: "2026-08-08T14:00:00",
    location: "Downtown Studio",
    badge: "Saved",
  },
]

const MEMBER_UPDATES: MemberUpdate[] = [
  {
    title: "Your membership tier is active",
    description: "Gold Annual benefits remain unlocked across all member events.",
    time: "2 hours ago",
  },
  {
    title: "New alert from the organizer",
    description: "The summer networking night agenda has been updated.",
    time: "Yesterday",
  },
  {
    title: "Saved list updated",
    description: "2 new experiences were added to your favorites this week.",
    time: "3 days ago",
  },
]

function StatCard({ stat }: { stat: DashboardStat }) {
  return (
    <Box
      border="1px solid"
      borderColor="border.subtle"
      borderRadius="18px"
      bg="card.bg"
      boxShadow="card"
      p={5}
    >
      <Flex align="center" justify="space-between" gap={4}>
        <Box>
          <Text fontSize="xs" fontWeight="800" letterSpacing="0.14em" textTransform="uppercase" color="text.secondary">
            {stat.label}
          </Text>
          <Heading mt={2} fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" color="gray.900">
            {stat.value}
          </Heading>
          <Text mt={1.5} fontSize="sm" color="text.secondary">
            {stat.hint}
          </Text>
        </Box>
        <Box
          w="48px"
          h="48px"
          borderRadius="16px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="white"
          flexShrink={0}
          style={{ background: `linear-gradient(135deg, ${stat.accent} 0%, #422AFB 100%)` }}
        >
          {stat.icon}
        </Box>
      </Flex>
    </Box>
  )
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <Box
      border="1px solid"
      borderColor="border.subtle"
      borderRadius="20px"
      bg="card.bg"
      boxShadow="card"
      p={{ base: 4, md: 5 }}
    >
      <Stack gap={1.5} mb={4}>
        <Heading fontSize={{ base: "lg", md: "xl" }} fontWeight="800" color="gray.900">
          {title}
        </Heading>
        <Text fontSize="sm" color="text.secondary">
          {subtitle}
        </Text>
      </Stack>
      {children}
    </Box>
  )
}

export function MemberDashboardOverview() {
  return (
    <Stack gap={6}>
      <Box
        border="1px solid"
        borderColor="border.subtle"
        borderRadius="20px"
        bg="card.bg"
        boxShadow="card"
        p={{ base: 4, md: 6 }}
      >
        <Flex direction={{ base: "column", md: "row" }} align={{ base: "flex-start", md: "center" }} gap={4}>
          <Box
            w="64px"
            h="64px"
            borderRadius="18px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="white"
            flexShrink={0}
            style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
          >
            <Ticket size={28} />
          </Box>

          <Box flex={1}>
            <Badge variant="subtle" colorPalette="purple" borderRadius="999px" px={3} py={1} mb={2}>
              Member dashboard
            </Badge>
            <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="800" letterSpacing="-0.03em" color="gray.900">
              Your member hub
            </Heading>
            <Text mt={2} fontSize={{ base: "sm", md: "md" }} color="gray.600" maxW="3xl">
              A quick snapshot of your membership, upcoming access, and recent activity.
            </Text>
          </Box>

          <Button
            variant="outline"
            borderRadius="14px"
            minH="11"
            px={4}
            cursor="pointer"
            alignSelf={{ base: "stretch", md: "center" }}
            w={{ base: "full", md: "auto" }}
          >
            View profile
            <ArrowRight size={16} />
          </Button>
        </Flex>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={4}>
        {MEMBER_STATS.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, xl: 2 }} gap={5}>
        <Panel title="Upcoming access" subtitle="Events you can attend next">
          <Stack gap={4}>
            {UPCOMING_EVENTS.map((event, index) => (
              <Box key={event.title}>
                <Flex direction={{ base: "column", sm: "row" }} justify="space-between" gap={3}>
                  <Box>
                    <Text fontSize="sm" fontWeight="700" color="gray.900">
                      {event.title}
                    </Text>
                    <Text mt={1} fontSize="sm" color="text.secondary">
                      {event.location}
                    </Text>
                  </Box>
                  <Box textAlign={{ base: "left", sm: "right" }}>
                    <Text fontSize="sm" fontWeight="700" color="gray.900">
                      {format(new Date(event.dateTime), "EEE, MMM d")}
                    </Text>
                    <Text mt={1} fontSize="sm" color="text.secondary">
                      {format(new Date(event.dateTime), "h:mm a")}
                    </Text>
                  </Box>
                </Flex>
                <Flex mt={3} align="center" justify="space-between" gap={3} wrap="wrap">
                  <Badge variant="subtle" colorPalette="purple" borderRadius="999px" px={3} py={1}>
                    {event.badge}
                  </Badge>
                  <Text fontSize="xs" color="text.secondary">
                    RSVP opens in {3 - index} days
                  </Text>
                </Flex>
                {index < UPCOMING_EVENTS.length - 1 ? <Separator mt={4} /> : null}
              </Box>
            ))}
          </Stack>
        </Panel>

        <Panel title="Recent activity" subtitle="The latest member updates">
          <Stack gap={4}>
            {MEMBER_UPDATES.map((update, index) => (
              <Box key={update.title}>
                <Flex align="flex-start" gap={3}>
                  <Box
                    w="10px"
                    h="10px"
                    borderRadius="full"
                    bg={index === 0 ? "#7551FF" : index === 1 ? "#3CB371" : "#F59E0B"}
                    mt={1.5}
                    flexShrink={0}
                  />
                  <Box flex={1}>
                    <Flex justify="space-between" gap={3} wrap="wrap">
                      <Text fontSize="sm" fontWeight="700" color="gray.900">
                        {update.title}
                      </Text>
                      <Text fontSize="xs" color="text.secondary">
                        {update.time}
                      </Text>
                    </Flex>
                    <Text mt={1} fontSize="sm" color="text.secondary">
                      {update.description}
                    </Text>
                  </Box>
                </Flex>
                {index < MEMBER_UPDATES.length - 1 ? <Separator mt={4} /> : null}
              </Box>
            ))}
          </Stack>
        </Panel>
      </SimpleGrid>
    </Stack>
  )
}
