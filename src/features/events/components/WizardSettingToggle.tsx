import { Badge, Box, Field, Flex, Switch, Text } from "@chakra-ui/react"
import { StepFieldLabel } from "./StepFieldLabel"

interface WizardSettingToggleProps {
  /** The setting's name in the step, above the control. */
  label: string
  /** What turning it on does, phrased as the organizer's decision rather than the system's behaviour. */
  title: string
  /** Read in place of the organizer working out the consequence themselves, so it changes with the state. */
  description: string
  helperText: string
  /** Announced to a screen reader, which has only the switch and none of the surrounding text. */
  switchLabel: string
  isEnabled: boolean
  onToggle: (isEnabled: boolean) => void
}

/**
 * The shape every yes/no setting in the wizard takes. Held apart from any one setting so a second
 * switch cannot quietly arrive looking like a different control than the first.
 */
export function WizardSettingToggle({
  label,
  title,
  description,
  helperText,
  switchLabel,
  isEnabled,
  onToggle,
}: WizardSettingToggleProps) {
  return (
    <Field.Root>
      <StepFieldLabel label={label} />

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
              {title}
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
            {description}
          </Text>
        </Box>

        <Switch.Root
          checked={isEnabled}
          onCheckedChange={(details) => onToggle(Boolean(details.checked))}
          colorPalette="brand"
          flexShrink={0}
          cursor="pointer"
        >
          <Switch.HiddenInput aria-label={switchLabel} />
          <Switch.Control />
        </Switch.Root>
      </Flex>

      <Field.HelperText mt={2}>{helperText}</Field.HelperText>
    </Field.Root>
  )
}
