import { Box, Text, Flex } from "@chakra-ui/react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { mockCategoryData } from "../../data/mock"

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { color: string } }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <Box
      bg="card.bg"
      border="1px solid"
      borderColor="border.subtle"
      borderRadius="12px"
      p={3}
      boxShadow="card"
    >
      <Flex align="center" gap={2}>
        <Box w="10px" h="10px" borderRadius="full" style={{ backgroundColor: item.payload.color }} />
        <Text fontSize="sm" fontWeight="700" color="text.primary">
          {item.name}: {item.value}
        </Text>
      </Flex>
    </Box>
  )
}

export function CategoryChart() {
  const total = mockCategoryData.reduce((sum, d) => sum + d.value, 0)

  return (
    <Box bg="card.bg" borderRadius="20px" p={6} boxShadow="card" h="full">
      <Text fontSize="lg" fontWeight="700" color="text.primary" mb={1}>
        By Category
      </Text>
      <Text fontSize="sm" color="text.secondary" mb={4}>
        Distribution across event types
      </Text>
      <Flex align="center" gap={6}>
        <Box flexShrink={0}>
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={mockCategoryData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {mockCategoryData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </Box>
        <Box flex={1}>
          {mockCategoryData.map((item) => (
            <Flex key={item.name} align="center" justify="space-between" mb={2}>
              <Flex align="center" gap={2}>
                <Box
                  w="8px"
                  h="8px"
                  borderRadius="full"
                  flexShrink={0}
                  style={{ backgroundColor: item.color }}
                />
                <Text fontSize="xs" fontWeight="500" color="text.secondary">
                  {item.name}
                </Text>
              </Flex>
              <Flex align="center" gap={2}>
                <Text fontSize="xs" fontWeight="700" color="text.primary">
                  {item.value}
                </Text>
                <Text fontSize="xs" color="text.secondary">
                  {Math.round((item.value / total) * 100)}%
                </Text>
              </Flex>
            </Flex>
          ))}
        </Box>
      </Flex>
    </Box>
  )
}
