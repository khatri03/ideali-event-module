import { useState } from "react"
import { Badge, Box, Button, Flex, HStack, Stack, Text, Wrap } from "@chakra-ui/react"
import { CheckCircle2, RotateCcw } from "lucide-react"
import type { SeatsIoEventForSaleReport } from "@/api/seatsio"
import { ConfirmDialog } from "@/components/common"
import { ReportGroupList } from "./ReportGroupList"

interface ForSaleRestrictionProps {
  report: SeatsIoEventForSaleReport
  formatCount: (value: number) => string
  /** Held-back objects the organizer has selected to put back on sale. */
  stagedObjects: string[]
  /** Held-back categories the organizer has selected to put back on sale. */
  stagedCategories: string[]
  /** How many held-back items are currently selected. */
  stagedCount: number
  onToggleObject: (label: string) => void
  onToggleCategory: (category: string) => void
  /** Selects every held-back object, or clears the selection when all are already selected. */
  onToggleAllObjects: () => void
  /** Puts the selected held-back items back on sale. Resolves once the change commits, rejects if it fails. */
  onPutSelectedBackOnSale: () => Promise<void>
  isPutBackPending: boolean
}

function StageChip({
  label,
  isStaged,
  onToggle,
  isDisabled,
}: {
  label: string
  isStaged: boolean
  onToggle: () => void
  isDisabled: boolean
}) {
  return (
    <Button
      size="sm"
      variant={isStaged ? "solid" : "outline"}
      colorPalette="green"
      onClick={onToggle}
      disabled={isDisabled}
      aria-pressed={isStaged}
      borderRadius="999px"
      minH="9"
      px={4}
    >
      {label}
    </Button>
  )
}

function ReadOnlyPills({ values, colorPalette }: { values: string[]; colorPalette: "green" | "orange" }) {
  return (
    <Wrap gap={2}>
      {values.map((value) => (
        <Badge key={value} variant="subtle" colorPalette={colorPalette} borderRadius="999px" px={3} py={1.5} fontSize="sm">
          {value}
        </Badge>
      ))}
    </Wrap>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="0.08em" color="text.secondary">
      {children}
    </Text>
  )
}

function EverythingForSaleBanner() {
  return (
    <Flex align="center" gap={3} bg="status.success.bg" px={{ base: 4, md: 5 }} py={{ base: 3, md: 4 }}>
      <Box color="status.success.fg" flexShrink={0}>
        <CheckCircle2 size={22} />
      </Box>
      <Box>
        <Text fontSize="sm" fontWeight="800" color="status.success.fg">
          Everything is on sale
        </Text>
        <Text fontSize="sm" color="text.secondary">
          No for-sale restriction is set, so every object on this event can be sold.
        </Text>
      </Box>
    </Flex>
  )
}

/**
 * The put-back-on-sale section that sits under the live map. Each held-back object or category is a pill the organizer
 * selects, then commits with the button grouped directly beneath them; this direction is not rate-limited, so it acts
 * on its own rather than through the map's take-off-sale apply. An "All" pill selects every held-back object at once.
 */
export function ForSaleRestriction({
  report,
  formatCount,
  stagedObjects,
  stagedCategories,
  stagedCount,
  onToggleObject,
  onToggleCategory,
  onToggleAllObjects,
  onPutSelectedBackOnSale,
  isPutBackPending,
}: ForSaleRestrictionProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  if (report.everythingForSale) {
    return <EverythingForSaleBanner />
  }

  const heldBackIsListed = !report.forSale
  const hasListedItems = report.objects.length > 0 || report.categories.length > 0
  const showPutBack = heldBackIsListed && hasListedItems
  const allObjectsSelected = report.objects.length > 0 && report.objects.every((label) => stagedObjects.includes(label))
  const stagedLabels = [...stagedObjects, ...stagedCategories]

  async function confirmPutBack() {
    try {
      await onPutSelectedBackOnSale()
      setIsConfirmOpen(false)
    } catch {
      // The mutation surfaces its own error toast; keep the dialog open so the selection survives a retry.
    }
  }

  return (
    <Box>
      <Flex
        direction={{ base: "column", md: "row" }}
        align={{ base: "stretch", md: "center" }}
        justify="space-between"
        gap={3}
        px={{ base: 4, md: 5 }}
        py={{ base: 3, md: 4 }}
      >
        <HStack gap={3} minW={0}>
          <Box color="status.success.fg">
            <RotateCcw size={20} />
          </Box>
          <Box minW={0}>
            <HStack gap={2}>
              <Text fontSize="sm" fontWeight="800" color="text.primary">
                {showPutBack ? "Objects held back" : "Put objects back on sale"}
              </Text>
              {!showPutBack ? (
                <Badge variant="subtle" colorPalette={report.forSale ? "green" : "orange"} borderRadius="999px" px={3} py={1}>
                  {report.forSale ? "Whitelist" : "Held back"}
                </Badge>
              ) : null}
            </HStack>
            <Text fontSize="xs" color="text.secondary">
              {showPutBack
                ? "Select the objects to put back, then apply."
                : report.forSale
                  ? "Only the objects below are on sale."
                  : "No held-back objects are listed for this event."}
            </Text>
          </Box>
        </HStack>
        {showPutBack ? (
          <Button
            colorPalette="green"
            onClick={() => setIsConfirmOpen(true)}
            disabled={stagedCount === 0 || isPutBackPending}
            loading={isPutBackPending}
            loadingText="Putting back..."
            w={{ base: "full", md: "auto" }}
            minH="11"
            px={6}
            flexShrink={0}
          >
            {stagedCount > 0 ? `Put ${stagedCount} back on sale` : "Back To Sale"}
          </Button>
        ) : null}
      </Flex>

      <Stack gap={5} px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }}>
        {showPutBack ? (
          <Stack gap={4}>
            {report.objects.length > 0 ? (
              <Wrap gap={2}>
                <StageChip
                  label="All"
                  isStaged={allObjectsSelected}
                  onToggle={onToggleAllObjects}
                  isDisabled={isPutBackPending}
                />
                {report.objects.map((label) => (
                  <StageChip
                    key={label}
                    label={label}
                    isStaged={stagedObjects.includes(label)}
                    onToggle={() => onToggleObject(label)}
                    isDisabled={isPutBackPending}
                  />
                ))}
              </Wrap>
            ) : null}
            {report.categories.length > 0 ? (
              <Stack gap={2}>
                <SectionLabel>Categories held back</SectionLabel>
                <Wrap gap={2}>
                  {report.categories.map((category) => (
                    <StageChip
                      key={category}
                      label={category}
                      isStaged={stagedCategories.includes(category)}
                      onToggle={() => onToggleCategory(category)}
                      isDisabled={isPutBackPending}
                    />
                  ))}
                </Wrap>
              </Stack>
            ) : null}
          </Stack>
        ) : null}

        {report.forSale && hasListedItems ? (
          <Stack gap={4}>
            {report.objects.length > 0 ? (
              <Stack gap={2}>
                <SectionLabel>On-sale objects</SectionLabel>
                <ReadOnlyPills values={report.objects} colorPalette="green" />
              </Stack>
            ) : null}
            {report.categories.length > 0 ? (
              <Stack gap={2}>
                <SectionLabel>On-sale categories</SectionLabel>
                <ReadOnlyPills values={report.categories} colorPalette="green" />
              </Stack>
            ) : null}
          </Stack>
        ) : null}

        {!hasListedItems ? (
          <Text fontSize="sm" color="text.secondary">
            {report.forSale
              ? "The held-back set is not itemised, so individual objects can't be listed here."
              : "A for-sale restriction is set but names no specific objects."}
          </Text>
        ) : null}

        {report.areaPlaces.length > 0 ? (
          <Stack gap={2}>
            <SectionLabel>Area places</SectionLabel>
            <ReportGroupList groups={report.areaPlaces} formatCount={formatCount} />
          </Stack>
        ) : null}
      </Stack>

      {isConfirmOpen ? (
        <ConfirmDialog
          title="Put objects back on sale"
          tone="primary"
          description={
            <Stack gap={3}>
              <Text>
                {stagedCount === 1 ? "This object goes" : `These ${stagedCount} objects go`} back on sale — buyers can
                purchase {stagedCount === 1 ? "it" : "them"} right away:
              </Text>
              <Wrap gap={2}>
                {stagedLabels.map((label) => (
                  <Badge key={label} variant="subtle" colorPalette="green" borderRadius="999px" px={3} py={1.5} fontSize="sm">
                    {label}
                  </Badge>
                ))}
              </Wrap>
            </Stack>
          }
          confirmLabel="Put back on sale"
          loadingLabel="Putting back..."
          isPending={isPutBackPending}
          onConfirm={confirmPutBack}
          onClose={() => setIsConfirmOpen(false)}
        />
      ) : null}
    </Box>
  )
}
