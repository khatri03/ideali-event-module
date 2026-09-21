import { useState, type ReactNode } from "react"
import { Badge, Box, Button, Flex, HStack, Stack, Switch, Text, Wrap } from "@chakra-ui/react"
import { CheckCircle2, RotateCcw } from "lucide-react"
import type { SeatsIoEventForSaleReport } from "@/api/seatsio"
import { ReportGroupList } from "./ReportGroupList"
import { StagedApplyBar } from "./StagedApplyBar"

interface ForSaleRestrictionProps {
  report: SeatsIoEventForSaleReport
  formatCount: (value: number) => string
  /** Held-back objects the organizer has selected to put back on sale. */
  stagedObjects: string[]
  /** Held-back categories the organizer has selected to put back on sale. */
  stagedCategories: string[]
  onToggleObject: (label: string) => void
  onToggleCategory: (category: string) => void
  /** Selects every held-back object, or clears the selection when all are already selected. */
  onToggleAllObjects: () => void
  /** Zooms the live map to the given held-back objects so tapping a pill reveals where it sits. */
  onFocusObjects: (labels: string[]) => void
  /** Commits the staged put-back set; resolves true on success so its confirm dialog can close. */
  onApply: () => Promise<boolean>
  /** Drops the staged put-back set without sending anything. */
  onClear: () => void
  /** A commit is in flight, so the pills lock to keep the staged set stable while it applies. */
  isApplying: boolean
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

function HeldBackCard({ children }: { children: ReactNode }) {
  return (
    <Box borderRadius="16px" border="1px solid" borderColor="border.subtle" overflow="hidden" bg="card.bg" boxShadow="card">
      {children}
    </Box>
  )
}

function EverythingForSaleBanner() {
  return (
    <HeldBackCard>
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
    </HeldBackCard>
  )
}

/**
 * The put-back-on-sale section that sits under the live map. Each held-back object or category is a pill the organizer
 * selects to stage it; the staged set is committed from the shared pending-changes bar above the card, alongside any
 * take-off-sale picks, so both directions apply through one action. An "All" pill selects every held-back object at once.
 */
export function ForSaleRestriction({
  report,
  formatCount,
  stagedObjects,
  stagedCategories,
  onToggleObject,
  onToggleCategory,
  onToggleAllObjects,
  onFocusObjects,
  onApply,
  onClear,
  isApplying,
}: ForSaleRestrictionProps) {
  const [zoomOnSelect, setZoomOnSelect] = useState(true)

  if (report.everythingForSale) {
    return <EverythingForSaleBanner />
  }

  const heldBackIsListed = !report.forSale
  const hasListedItems = report.objects.length > 0 || report.categories.length > 0
  const showPutBack = heldBackIsListed && hasListedItems
  const allObjectsSelected = report.objects.length > 0 && report.objects.every((label) => stagedObjects.includes(label))
  const stagedLabels = [...stagedObjects, ...stagedCategories]
  const stagedCount = stagedLabels.length

  return (
    <HeldBackCard>
      <Flex
        align="center"
        justify="space-between"
        gap={3}
        px={{ base: 4, md: 5 }}
        py={{ base: 3, md: 4 }}
        borderBottom="1px solid"
        borderColor="border.subtle"
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
                ? "Tap objects to stage them, then apply from the bar below."
                : report.forSale
                  ? "Only the objects below are on sale."
                  : "No held-back objects are listed for this event."}
            </Text>
          </Box>
        </HStack>
        {showPutBack ? (
          <Switch.Root
            checked={zoomOnSelect}
            onCheckedChange={(details) => setZoomOnSelect(details.checked === true)}
            colorPalette="green"
            flexShrink={0}
          >
            <Switch.HiddenInput />
            <Switch.Control cursor="pointer" />
            <Switch.Label fontSize="xs" fontWeight="700" color="text.secondary" whiteSpace="nowrap">
              Zoom to selection
            </Switch.Label>
          </Switch.Root>
        ) : null}
      </Flex>

      <Stack gap={5} px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }}>
        {showPutBack ? (
          <Stack
            gap={4}
            borderRadius="12px"
            border="1px solid"
            borderColor="border.subtle"
            bg="status.success.bg"
            px={{ base: 3, md: 4 }}
            py={{ base: 3, md: 4 }}
          >
            {report.objects.length > 0 ? (
              <Wrap gap={2}>
                <StageChip
                  label="All"
                  isStaged={allObjectsSelected}
                  onToggle={() => {
                    onToggleAllObjects()
                    if (zoomOnSelect && !allObjectsSelected) {
                      onFocusObjects(report.objects)
                    }
                  }}
                  isDisabled={isApplying}
                />
                {report.objects.map((label) => (
                  <StageChip
                    key={label}
                    label={label}
                    isStaged={stagedObjects.includes(label)}
                    onToggle={() => {
                      const isStaging = !stagedObjects.includes(label)
                      onToggleObject(label)
                      if (zoomOnSelect && isStaging) {
                        onFocusObjects([label])
                      }
                    }}
                    isDisabled={isApplying}
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
                      isDisabled={isApplying}
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

      {showPutBack ? (
        stagedCount > 0 ? (
          <StagedApplyBar
            tone="success"
            summary={`${stagedCount} staged to put back on sale`}
            labels={stagedLabels}
            showFooterLabels={false}
            applyLabel={`Put ${stagedCount} back on sale`}
            confirmTitle={`Put ${stagedCount} ${stagedCount === 1 ? "object" : "objects"} back on sale`}
            confirmTone="primary"
            outcomeText="Buyers will be able to buy these objects again."
            onApply={onApply}
            onClear={onClear}
            isApplying={isApplying}
          />
        ) : (
          <Flex align="center" px={{ base: 4, md: 5 }} py={{ base: 3, md: 4 }} borderTop="1px solid" borderColor="border.subtle">
            <Text fontSize="sm" fontWeight="700" color="text.secondary">
              Nothing staged yet — tap objects above to put them back on sale.
            </Text>
          </Flex>
        )
      ) : null}
    </HeldBackCard>
  )
}
