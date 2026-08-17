import { Badge, Box, Field, Flex, Switch, Text } from "@chakra-ui/react"
import { StepFieldLabel } from "./StepFieldLabel"

interface PaymentMethodChargesToggleProps {
  isEnabled: boolean
  onToggle: (isEnabled: boolean) => void
}

export function PaymentMethodChargesToggle({ isEnabled, onToggle }: PaymentMethodChargesToggleProps) {
  return (
    <Field.Root>
      <StepFieldLabel label="Payment method charges" />

      <Flex
        w="full"
        align="center"
        justify="space-between"
        gap={4}
        minH="46px"
        px={4}
        py={3}
        bg="white"
        border="1px solid"
        borderColor="gray.200"
        borderRadius="16px"
        transition="border-color 0.15s ease, box-shadow 0.15s ease"
        _hover={{ borderColor: "brand.300" }}
        _focusWithin={{ borderColor: "brand.500", boxShadow: "0 0 0 3px rgba(117, 81, 255, 0.15)" }}
      >
        <Box minW={0}>
          <Flex align="center" gap={2} flexWrap="wrap">
            <Text fontSize="sm" fontWeight="700" color="gray.900">
              Pass the processing fee to the buyer
            </Text>
            <Badge
              colorPalette={isEnabled ? "green" : "gray"}
              variant="subtle"
              borderRadius="999px"
              px={3}
              py={1}
              fontSize="10px"
              fontWeight="800"
              textTransform="uppercase"
              letterSpacing="0.08em"
            >
              {isEnabled ? "On" : "Off"}
            </Badge>
          </Flex>
          <Text fontSize="xs" color="gray.500" mt={1}>
            {isEnabled
              ? "The fee for the method the buyer picks is added to their total."
              : "You absorb the fee and the buyer pays the ticket price."}
          </Text>
        </Box>

        <Switch.Root
          checked={isEnabled}
          onCheckedChange={(details) => onToggle(Boolean(details.checked))}
          colorPalette="brand"
          flexShrink={0}
          cursor="pointer"
        >
          <Switch.HiddenInput aria-label="Pass payment method charges to the buyer" />
          <Switch.Control />
        </Switch.Root>
      </Flex>

      <Field.HelperText mt={2}>
        Processing fees differ per payment method, so turning this on makes each method total differently.
      </Field.HelperText>
    </Field.Root>
  )
}
