import { Button, Flex } from "@chakra-ui/react"

interface EventWizardActionsProps {
  backLabel?: string
  primaryLabel?: string
  secondaryLabel?: string
  skipLabel?: string
  showBack?: boolean
  showSkip?: boolean
  isBackDisabled?: boolean
  isPrimaryDisabled?: boolean
  isSecondaryDisabled?: boolean
  isSkipDisabled?: boolean
  isPrimaryLoading?: boolean
  isSecondaryLoading?: boolean
  onBack?: () => void
  onPrimary?: () => void
  onSecondary?: () => void
  onSkip?: () => void
}

export function EventWizardActions({
  backLabel = "Back",
  primaryLabel = "Save & Continue",
  secondaryLabel = "Save & Exit",
  skipLabel = "Skip",
  showBack = true,
  showSkip = false,
  isBackDisabled,
  isPrimaryDisabled,
  isSecondaryDisabled,
  isSkipDisabled,
  isPrimaryLoading,
  isSecondaryLoading,
  onBack,
  onPrimary,
  onSecondary,
  onSkip,
}: EventWizardActionsProps) {
  return (
    <Flex
      direction={{ base: "column", md: "row" }}
      gap={3}
      align={{ base: "stretch", md: "center" }}
      justify="space-between"
    >
      <Flex gap={3} flex={1} align="center" justify={{ base: "stretch", md: "flex-start" }}>
        {showBack ? (
          <Button
            variant="outline"
            borderRadius="14px"
            h="44px"
            px={6}
            onClick={onBack}
            disabled={isBackDisabled}
            minW={{ base: "full", md: "auto" }}
          >
            {backLabel}
          </Button>
        ) : null}
      </Flex>

      <Flex gap={3} justify={{ base: "stretch", md: "flex-end" }} flexWrap="wrap">
        {showSkip ? (
          <Button
            variant="outline"
            colorPalette="orange"
            borderRadius="14px"
            h="44px"
            px={6}
            onClick={onSkip}
            disabled={isSkipDisabled}
            minW={{ base: "full", md: "auto" }}
            _hover={{ bg: "orange.50", borderColor: "orange.300" }}
          >
            {skipLabel}
          </Button>
        ) : null}

        <Button
          variant="outline"
          borderRadius="14px"
          h="44px"
          px={6}
          onClick={onSecondary}
          loading={isSecondaryLoading}
          disabled={isSecondaryDisabled}
          loadingText={secondaryLabel}
          minW={{ base: "full", md: "auto" }}
        >
          {secondaryLabel}
        </Button>

        <Button
          borderRadius="14px"
          h="44px"
          px={6}
          onClick={onPrimary}
          loading={isPrimaryLoading}
          disabled={isPrimaryDisabled}
          loadingText={primaryLabel}
          minW={{ base: "full", md: "auto" }}
          color="white"
          style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
        >
          {primaryLabel}
        </Button>
      </Flex>
    </Flex>
  )
}
