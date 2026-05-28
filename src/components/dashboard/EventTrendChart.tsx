import { Box, Text } from "@chakra-ui/react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { mockChartData } from "../../data/mock"

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; name: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <Box
      bg="card.bg"
      border="1px solid"
      borderColor="border.subtle"
      borderRadius="12px"
      p={3}
      boxShadow="card"
    >
      <Text fontSize="xs" fontWeight="700" color="text.secondary" mb={1}>
        {label}
      </Text>
      {payload.map((item) => (
        <Text key={item.name} fontSize="sm" fontWeight="700" color="brand.500">
          {item.name === "events" ? "Events: " : "Attendees: "}
          {item.value.toLocaleString()}
        </Text>
      ))}
    </Box>
  )
}

export function EventTrendChart() {
  return (
    <Box bg="card.bg" borderRadius="20px" p={6} boxShadow="card" h="full">
      <Text fontSize="lg" fontWeight="700" color="text.primary" mb={1}>
        Event Trends
      </Text>
      <Text fontSize="sm" color="text.secondary" mb={5}>
        Monthly events and attendees over the past year
      </Text>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={mockChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradEvents" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7551FF" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#7551FF" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradAttendees" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#422AFB" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#422AFB" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(112,144,176,0.12)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fontWeight: 600, fill: "#718096", fontFamily: "DM Sans" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#718096", fontFamily: "DM Sans" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="attendees"
            stroke="#422AFB"
            strokeWidth={2.5}
            fill="url(#gradAttendees)"
            dot={false}
            activeDot={{ r: 5, fill: "#422AFB" }}
          />
          <Area
            type="monotone"
            dataKey="events"
            stroke="#7551FF"
            strokeWidth={2.5}
            fill="url(#gradEvents)"
            dot={false}
            activeDot={{ r: 5, fill: "#7551FF" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  )
}
