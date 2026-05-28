import { Box, Heading, Text } from "@chakra-ui/react"

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={6}>
      <Box>
        <Heading
          fontSize="2xl"
          fontWeight="800"
          color="text.primary"
          letterSpacing="-0.02em"
        >
          {title}
        </Heading>
        {subtitle && (
          <Text mt={1} fontSize="sm" color="text.secondary">
            {subtitle}
          </Text>
        )}
      </Box>
      {action && <Box>{action}</Box>}
    </Box>
  )
}
