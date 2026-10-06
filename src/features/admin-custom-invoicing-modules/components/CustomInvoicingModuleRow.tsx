import { Badge, Box, Flex, Stack, Switch, Text } from "@chakra-ui/react"
import { format, parseISO } from "date-fns"
import { useEffect, useRef, useState } from "react"
import { COMING_SOON_LABEL } from "../moduleCatalog"

interface CustomInvoicingModuleRowProps {
  name: string
  description: string
  isEnabled: boolean
  isComingSoon: boolean
  isPending: boolean
  changedByName: string | null
  changedAtUtc: string | null
  onToggle: (next: boolean) => void
}

function describeLastChange(changedByName: string | null, changedAtUtc: string | null): string {
  if (!changedAtUtc) {
    return "Default setting"
  }
  const changedOn = format(parseISO(changedAtUtc), "d MMM yyyy")
  return changedByName ? `Changed by ${changedByName} on ${changedOn}` : `Changed on ${changedOn}`
}

function StatusBadge({ isEnabled, isComingSoon }: Pick<CustomInvoicingModuleRowProps, "isEnabled" | "isComingSoon">) {
  if (isComingSoon) {
    return (
      <Badge variant="subtle" colorPalette="purple" borderRadius="999px" px={3} py={1}>
        {COMING_SOON_LABEL}
      </Badge>
    )
  }
  return (
    <Badge variant="subtle" colorPalette={isEnabled ? "green" : "gray"} borderRadius="999px" px={3} py={1}>
      {isEnabled ? "Enabled" : "Disabled"}
    </Badge>
  )
}

export function CustomInvoicingModuleRow({
  name,
  description,
  isEnabled,
  isComingSoon,
  isPending,
  changedByName,
  changedAtUtc,
  onToggle,
}: CustomInvoicingModuleRowProps) {
  const isLocked = isComingSoon || isPending
  const inputRef = useRef<HTMLInputElement>(null)
  const [toggleAttempts, setToggleAttempts] = useState(0)

  // A declined toggle leaves the controlled value unchanged, so the native input must be pulled back to it by hand.
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.checked = isEnabled
    }
  }, [isEnabled, toggleAttempts])

  const handleCheckedChange = (next: boolean) => {
    setToggleAttempts((attempts) => attempts + 1)
    onToggle(next)
  }
  const textColor = isComingSoon ? "text.secondary" : "text.primary"

  return (
    <Stack
      direction={{ base: "column", md: "row" }}
      align={{ base: "flex-start", md: "center" }}
      gap={{ base: 3, md: 6 }}
      px={{ base: 4, md: 6 }}
      py={4}
      opacity={isComingSoon ? 0.7 : 1}
    >
      <Box flex={1} minW={0}>
        <Flex align="center" gap={3} wrap="wrap">
          <Text fontSize={{ base: "md", md: "lg" }} fontWeight="700" color={textColor}>
            {name}
          </Text>
          <StatusBadge isEnabled={isEnabled} isComingSoon={isComingSoon} />
        </Flex>
        <Text mt={1} fontSize={{ base: "sm", md: "md" }} color="text.secondary">
          {description}
        </Text>
        {isComingSoon ? null : (
          <Text mt={1} fontSize="sm" color="text.secondary">
            {describeLastChange(changedByName, changedAtUtc)}
          </Text>
        )}
      </Box>

      <Switch.Root
        checked={isEnabled}
        disabled={isLocked}
        onCheckedChange={(details) => handleCheckedChange(details.checked)}
        colorPalette="brand"
        minH="11"
        minW="11"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        cursor={isLocked ? "not-allowed" : "pointer"}
      >
        <Switch.HiddenInput ref={inputRef} aria-label={`Custom invoicing for ${name}`} />
        <Switch.Control cursor={isLocked ? "not-allowed" : "pointer"} />
      </Switch.Root>
    </Stack>
  )
}
