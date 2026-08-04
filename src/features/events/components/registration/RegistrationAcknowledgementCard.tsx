import type { RefObject } from "react"
import { Box, Button, Checkbox, Flex } from "@chakra-ui/react"

interface RegistrationAcknowledgementCardProps {
  label: string
  actionLabel: string
  isAccepted: boolean
  /**
   * The buyer tried to pay and this is the box that stopped them. Drawn in red so the page itself
   * points at it - the toast that reports it is gone by the time they finish reading the page.
   */
  isInvalid: boolean
  onAcceptedChange: (isAccepted: boolean) => void
  onViewContent: () => void
  accentColor: string
  /** Scroll anchor, so an unaccepted-acknowledgement complaint can bring this card into view. */
  validationRef: RefObject<HTMLDivElement | null>
}

/** An acknowledgement gate. Nothing downstream may take payment until this is ticked. */
export function RegistrationAcknowledgementCard({
  label,
  actionLabel,
  isAccepted,
  isInvalid,
  onAcceptedChange,
  onViewContent,
  accentColor,
  validationRef,
}: RegistrationAcknowledgementCardProps) {
  return (
    <Box
      ref={validationRef}
      borderWidth={isInvalid ? "2px" : "1px"}
      borderColor={isInvalid ? "red.400" : "gray.200"}
      borderRadius="20px"
      bg={isInvalid ? "red.50" : "white"}
      px={{ base: 4, md: 5 }}
      py={4}
      boxShadow={isInvalid ? "0 12px 30px rgba(220, 38, 38, 0.18)" : "0 12px 30px rgba(15, 23, 42, 0.08)"}
      transition="border-color 150ms ease, background-color 150ms ease"
    >
      <Flex
        justify="space-between"
        align={{ base: "stretch", md: "center" }}
        gap={4}
        direction={{ base: "column", md: "row" }}
      >
        <Checkbox.Root checked={isAccepted} onCheckedChange={(details) => onAcceptedChange(details.checked === true)}>
          <Checkbox.HiddenInput aria-invalid={isInvalid || undefined} />
          <Checkbox.Control
            borderColor={isInvalid ? "red.400" : "gray.300"}
            borderWidth={isInvalid ? "2px" : "1px"}
            borderRadius="8px"
            bg="white"
            cursor="pointer"
            _checked={{ bg: accentColor, borderColor: accentColor }}
          />
          <Checkbox.Label color={isInvalid ? "red.600" : "gray.700"} fontSize="sm" fontWeight={isInvalid ? "700" : "600"} cursor="pointer">
            {label}
          </Checkbox.Label>
        </Checkbox.Root>

        <Button
          variant="ghost"
          color={accentColor}
          fontWeight="700"
          minH="11"
          cursor="pointer"
          onClick={onViewContent}
          alignSelf={{ base: "flex-start", md: "center" }}
        >
          {actionLabel}
        </Button>
      </Flex>
    </Box>
  )
}
