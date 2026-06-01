import { Button, Flex } from "@chakra-ui/react"

interface EventWizardActionsProps {
  backLabel?: string
  nextLabel?: string
  isBackDisabled?: boolean
  isNextDisabled?: boolean
  isLoading?: boolean
  onBack?: () => void
  onNext?: () => void
}

export function EventWizardActions({
  backLabel = "Back",
  nextLabel = "Next",
  isBackDisabled,
  isNextDisabled,
  isLoading,
  onBack,
  onNext,
}: EventWizardActionsProps) {
  return (
    <Flex gap={3} justify="space-between" flexWrap="wrap">
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
      <Button
        borderRadius="14px"
        h="44px"
        px={6}
        onClick={onNext}
        loading={isLoading}
        disabled={isNextDisabled}
        loadingText={nextLabel}
        minW={{ base: "full", md: "auto" }}
        color="white"
        style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
      >
        {nextLabel}
      </Button>
    </Flex>
  )
}
