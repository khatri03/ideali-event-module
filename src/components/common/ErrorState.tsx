import { Box, Button, Stack, Text } from "@chakra-ui/react"
import { AlertTriangle, RotateCcw, SearchX } from "lucide-react"

type ErrorStateTone = "failure" | "missing"

interface ErrorStateProps {
  title: string
  message: string
  /** "missing" is for a thing that is not there and never will be - it offers no retry. */
  tone?: ErrorStateTone
  onRetry?: () => void
  isRetrying?: boolean
}

const TONE_TOKENS: Record<ErrorStateTone, { bg: string; fg: string; icon: typeof AlertTriangle }> = {
  failure: { bg: "status.error.bg", fg: "status.error.fg", icon: AlertTriangle },
  missing: { bg: "status.neutral.bg", fg: "status.neutral.fg", icon: SearchX },
}

/**
 * A dead end with a way out of it. A failed request that could still succeed offers the retry; one that
 * could not - a record that is simply not there - says so instead of inviting a pointless second attempt.
 */
export function ErrorState({ title, message, tone = "failure", onRetry, isRetrying = false }: ErrorStateProps) {
  const { bg, fg, icon: Icon } = TONE_TOKENS[tone]

  return (
    <Box role="alert" border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" p={{ base: 5, md: 8 }}>
      <Stack align="center" textAlign="center" gap={3}>
        <Box bg={bg} color={fg} borderRadius="full" p={3}>
          <Icon size={24} aria-hidden="true" />
        </Box>
        <Text fontSize={{ base: "md", md: "lg" }} fontWeight="800" color="text.primary">
          {title}
        </Text>
        <Text fontSize={{ base: "sm", md: "md" }} color="text.secondary" maxW="md">
          {message}
        </Text>
        {onRetry ? (
          <Button
            variant="outline"
            borderRadius="14px"
            minH="11"
            px={5}
            mt={1}
            w={{ base: "full", sm: "auto" }}
            cursor="pointer"
            disabled={isRetrying}
            loading={isRetrying}
            loadingText="Retrying..."
            onClick={onRetry}
          >
            <RotateCcw size={16} />
            Try again
          </Button>
        ) : null}
      </Stack>
    </Box>
  )
}
