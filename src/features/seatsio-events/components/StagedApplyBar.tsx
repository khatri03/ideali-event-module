import { useState } from "react"
import { Badge, Button, Flex, Stack, Text, Wrap } from "@chakra-ui/react"
import { ConfirmDialog } from "@/components/common"

type BarTone = "warning" | "success"

const TONES: Record<BarTone, { bg: string; fg: string; palette: "orange" | "green" }> = {
  warning: { bg: "status.warning.bg", fg: "status.warning.fg", palette: "orange" },
  success: { bg: "status.success.bg", fg: "status.success.fg", palette: "green" },
}

interface StagedApplyBarProps {
  tone: BarTone
  /** Footer readout naming how many objects are staged, e.g. "2 staged to go off sale". */
  summary: string
  /** Staged labels; always listed in the confirm dialog, and shown in the footer when showFooterLabels is true. */
  labels: string[]
  /** The footer echoes the labels as pills; a card that already lists them above sets this false. */
  showFooterLabels?: boolean
  /** Button text stating the outcome, e.g. "Take 2 off sale". */
  applyLabel: string
  confirmTitle: string
  /** "destructive" for take-off-sale, "primary" for put-back. */
  confirmTone: "destructive" | "primary"
  /** One sentence describing what buyers will see after applying. */
  outcomeText: string
  /** Commits this direction; resolves true on success so the dialog can close, false to keep it open for a retry. */
  onApply: () => Promise<boolean>
  /** Drops this direction's staged set without sending anything. */
  onClear: () => void
  isApplying: boolean
}

/**
 * The footer of a for-sale card. It commits only that card's own direction, behind a confirm dialog whose button
 * spells out the outcome, so the rate-limited take-off-sale and the free put-back each apply on their own and the
 * organizer never triggers two opposite actions from one control.
 */
export function StagedApplyBar({
  tone,
  summary,
  labels,
  showFooterLabels = true,
  applyLabel,
  confirmTitle,
  confirmTone,
  outcomeText,
  onApply,
  onClear,
  isApplying,
}: StagedApplyBarProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const palette = TONES[tone].palette

  async function confirmApply() {
    const applied = await onApply()
    if (applied) {
      setIsConfirmOpen(false)
    }
  }

  return (
    <>
      <Flex
        direction={{ base: "column", md: "row" }}
        align={{ base: "stretch", md: "center" }}
        justify="space-between"
        gap={3}
        px={{ base: 4, md: 5 }}
        py={{ base: 3, md: 4 }}
        borderTop="1px solid"
        borderColor="border.subtle"
        bg={TONES[tone].bg}
      >
        <Flex align="center" gap={3} wrap="wrap" minW={0}>
          <Text fontSize="sm" fontWeight="700" color={TONES[tone].fg}>
            {summary}
          </Text>
          {showFooterLabels ? (
            <Wrap gap={2}>
              {labels.map((label) => (
                <Badge key={label} variant="solid" colorPalette={palette} borderRadius="999px" px={3} py={1}>
                  {label}
                </Badge>
              ))}
            </Wrap>
          ) : null}
        </Flex>
        <Flex gap={2} direction={{ base: "column", sm: "row" }} flexShrink={0}>
          <Button
            variant="outline"
            colorPalette="gray"
            onClick={onClear}
            disabled={isApplying}
            minH="11"
            px={6}
            order={{ base: 2, sm: 1 }}
          >
            Clear
          </Button>
          <Button
            colorPalette={palette}
            onClick={() => setIsConfirmOpen(true)}
            disabled={isApplying}
            loading={isApplying}
            loadingText="Applying..."
            minH="11"
            px={8}
            order={{ base: 1, sm: 2 }}
          >
            {applyLabel}
          </Button>
        </Flex>
      </Flex>

      {isConfirmOpen ? (
        <ConfirmDialog
          title={confirmTitle}
          tone={confirmTone}
          description={
            <Stack gap={3}>
              <Text>{outcomeText}</Text>
              <Wrap gap={2}>
                {labels.map((label) => (
                  <Badge key={label} variant="subtle" colorPalette={palette} borderRadius="999px" px={3} py={1.5} fontSize="sm">
                    {label}
                  </Badge>
                ))}
              </Wrap>
            </Stack>
          }
          confirmLabel="Apply changes"
          loadingLabel="Applying..."
          isPending={isApplying}
          onConfirm={confirmApply}
          onClose={() => setIsConfirmOpen(false)}
        />
      ) : null}
    </>
  )
}
