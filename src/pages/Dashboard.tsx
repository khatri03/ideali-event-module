import { Box, Grid, Flex, Text, Badge, Table } from "@chakra-ui/react"
import {
  CalendarCheck,
  Zap,
  Users,
  DollarSign,
  ArrowRight,
} from "lucide-react"
import { format } from "date-fns"
import { StatCard } from "../components/dashboard/StatCard"
import { EventTrendChart } from "../components/dashboard/EventTrendChart"
import { CategoryChart } from "../components/dashboard/CategoryChart"
import { mockStats, mockEvents } from "../data/mock"

const STAT_ICONS = [
  <CalendarCheck size={22} />,
  <Zap size={22} />,
  <Users size={22} />,
  <DollarSign size={22} />,
]

const STATUS_COLORS: Record<string, string> = {
  published: "green",
  ongoing: "blue",
  draft: "gray",
  completed: "purple",
  cancelled: "red",
}

export function Dashboard() {
  const recentEvents = mockEvents.slice(0, 6)

  return (
    <Box>
      {/* Stats row */}
      <Grid templateColumns="repeat(4, 1fr)" gap={5} mb={6}>
        {mockStats.map((stat, i) => (
          <StatCard key={stat.label} stat={stat} icon={STAT_ICONS[i]} />
        ))}
      </Grid>

      {/* Charts row */}
      <Grid templateColumns="1fr 380px" gap={5} mb={6}>
        <EventTrendChart />
        <CategoryChart />
      </Grid>

      {/* Recent Events table */}
      <Box bg="card.bg" borderRadius="20px" boxShadow="card">
        <Flex align="center" justify="space-between" p={6} pb={4}>
          <Box>
            <Text fontSize="lg" fontWeight="700" color="text.primary">
              Recent Events
            </Text>
            <Text fontSize="sm" color="text.secondary">
              Latest activity across your events
            </Text>
          </Box>
          <Flex
            align="center"
            gap={1}
            fontSize="sm"
            fontWeight="600"
            color="brand.500"
            cursor="pointer"
            _hover={{ color: "brand.600" }}
            transition="color 0.15s"
          >
            <Text>View all</Text>
            <ArrowRight size={14} />
          </Flex>
        </Flex>

        <Box overflowX="auto">
          <Table.Root variant="line" size="sm">
            <Table.Header>
              <Table.Row bg="app.bg">
                <Table.ColumnHeader px={6} py={3} fontSize="xs" fontWeight="700" color="text.secondary" textTransform="uppercase" letterSpacing="0.05em">
                  Event
                </Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3} fontSize="xs" fontWeight="700" color="text.secondary" textTransform="uppercase" letterSpacing="0.05em">
                  Category
                </Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3} fontSize="xs" fontWeight="700" color="text.secondary" textTransform="uppercase" letterSpacing="0.05em">
                  Date
                </Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3} fontSize="xs" fontWeight="700" color="text.secondary" textTransform="uppercase" letterSpacing="0.05em">
                  Attendees
                </Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3} fontSize="xs" fontWeight="700" color="text.secondary" textTransform="uppercase" letterSpacing="0.05em">
                  Status
                </Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3} fontSize="xs" fontWeight="700" color="text.secondary" textTransform="uppercase" letterSpacing="0.05em">
                  Revenue
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {recentEvents.map((event) => (
                <Table.Row
                  key={event.id}
                  _hover={{ bg: "app.bg" }}
                  transition="background 0.15s"
                  cursor="pointer"
                  borderColor="border.subtle"
                >
                  <Table.Cell px={6} py={4}>
                    <Flex align="center" gap={3}>
                      <Box
                        w="10px"
                        h="10px"
                        borderRadius="full"
                        flexShrink={0}
                        style={{ backgroundColor: event.coverColor }}
                      />
                      <Box>
                        <Text fontSize="sm" fontWeight="600" color="text.primary" lineClamp={1} maxW="200px">
                          {event.title}
                        </Text>
                        <Text fontSize="xs" color="text.secondary" lineClamp={1} maxW="200px">
                          {event.location}
                        </Text>
                      </Box>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell px={4} py={4}>
                    <Text fontSize="xs" color="text.secondary" fontWeight="500" textTransform="capitalize">
                      {event.category}
                    </Text>
                  </Table.Cell>
                  <Table.Cell px={4} py={4}>
                    <Text fontSize="xs" color="text.secondary" fontWeight="500">
                      {format(new Date(event.startDate), "MMM d, yyyy")}
                    </Text>
                  </Table.Cell>
                  <Table.Cell px={4} py={4}>
                    <Box>
                      <Text fontSize="xs" fontWeight="700" color="text.primary">
                        {event.attendees.toLocaleString()}
                      </Text>
                      <Text fontSize="xs" color="text.secondary">
                        of {event.capacity.toLocaleString()}
                      </Text>
                    </Box>
                  </Table.Cell>
                  <Table.Cell px={4} py={4}>
                    <Badge
                      colorPalette={STATUS_COLORS[event.status] as "green" | "blue" | "gray" | "purple" | "red"}
                      variant="subtle"
                      borderRadius="8px"
                      fontSize="10px"
                      fontWeight="700"
                      px={2}
                      py={0.5}
                      textTransform="uppercase"
                      letterSpacing="0.05em"
                    >
                      {event.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell px={4} py={4}>
                    <Text fontSize="sm" fontWeight="700" color="text.primary">
                      {event.price === 0 ? "Free" : `$${(event.attendees * event.price).toLocaleString()}`}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>
    </Box>
  )
}
