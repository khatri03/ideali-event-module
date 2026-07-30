import type { RefObject } from "react"
import { Box, Button, Checkbox, Flex } from "@chakra-ui/react"

interface RegistrationRefundPolicyCardProps {
  isAccepted: boolean
  onAcceptedChange: (isAccepted: boolean) => void
  onViewPolicy: () => void
  accentColor: string
  /** Scroll anchor, so an unaccepted-policy complaint can bring this card into view. */
  validationRef: RefObject<HTMLDivElement | null>
}

/** The refund policy gate. Nothing downstream may take payment until this is ticked. */
export function RegistrationRefundPolicyCard({
  isAccepted,
  onAcceptedChange,
  onViewPolicy,
  accentColor,
  validationRef,
}: RegistrationRefundPolicyCardProps) {
  return (
    <Box
      ref={validationRef}
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="20px"
      bg="white"
      px={{ base: 4, md: 5 }}
      py={4}
      boxShadow="0 12px 30px rgba(15, 23, 42, 0.08)"
    >
      <Flex
        justify="space-between"
        align={{ base: "stretch", md: "center" }}
        gap={4}
        direction={{ base: "column", md: "row" }}
      >
        <Checkbox.Root checked={isAccepted} onCheckedChange={(details) => onAcceptedChange(details.checked === true)}>
          <Checkbox.HiddenInput />
          <Checkbox.Control
            borderColor="gray.300"
            borderRadius="8px"
            bg="white"
            cursor="pointer"
            _checked={{ bg: accentColor, borderColor: accentColor }}
          />
          <Checkbox.Label color="gray.700" fontSize="sm" fontWeight="600" cursor="pointer">
            I accept the refund policy.
          </Checkbox.Label>
        </Checkbox.Root>

        <Button
          variant="ghost"
          color={accentColor}
          fontWeight="700"
          minH="11"
          cursor="pointer"
          onClick={onViewPolicy}
          alignSelf={{ base: "flex-start", md: "center" }}
        >
          View refund policy
        </Button>
      </Flex>
    </Box>
  )
}
