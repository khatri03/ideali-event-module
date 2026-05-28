import { Box, Text, Flex } from "@chakra-ui/react"
import { TrendingUp, TrendingDown } from "lucide-react"
import type { StatItem } from "../../types"

interface StatCardProps {
  stat: StatItem
  icon: React.ReactNode
}

export function StatCard({ stat, icon }: StatCardProps) {
  const isIncrease = stat.changeType === "increase"

  return (
    <Box
      bg="card.bg"
      borderRadius="20px"
      p={6}
      boxShadow="card"
      _hover={{ boxShadow: "cardHover", transform: "translateY(-2px)" }}
      transition="all 0.2s ease"
    >
      <Flex justify="space-between" align="flex-start">
        <Box>
          <Text fontSize="sm" fontWeight="500" color="text.secondary" mb={2}>
            {stat.label}
          </Text>
          <Text
            fontSize="2xl"
            fontWeight="800"
            color="text.primary"
            letterSpacing="-0.02em"
            lineHeight={1}
          >
            {stat.value}
          </Text>
          <Flex align="center" gap={1} mt={2}>
            <Box color={isIncrease ? "green.500" : "red.500"}>
              {isIncrease ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            </Box>
            <Text
              fontSize="xs"
              fontWeight="700"
              color={isIncrease ? "green.500" : "red.500"}
            >
              {isIncrease ? "+" : "-"}{stat.change}%
            </Text>
            <Text fontSize="xs" color="text.secondary">
              vs last month
            </Text>
          </Flex>
        </Box>
        <Flex
          w="56px"
          h="56px"
          borderRadius="16px"
          align="center"
          justify="center"
          style={{ backgroundColor: stat.iconBg + "20" }}
          flexShrink={0}
        >
          <Box style={{ color: stat.iconBg }}>
            {icon}
          </Box>
        </Flex>
      </Flex>
    </Box>
  )
}
