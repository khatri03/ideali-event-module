import { Badge, Text } from "@chakra-ui/react"

export type TextPillPalette = "brand" | "gray" | "cyan" | "purple" | "orange"

interface TextPillProps {
  children: string
  colorPalette?: TextPillPalette
}

export function TextPill({ children, colorPalette = "gray" }: TextPillProps) {
  return (
    <Badge
      variant="subtle"
      colorPalette={colorPalette}
      borderRadius="999px"
      px={3}
      py={1}
      whiteSpace="normal"
      textAlign="left"
    >
      <Text as="span" fontSize="xs" fontWeight="800" lineHeight={1}>
        {children}
      </Text>
    </Badge>
  )
}
