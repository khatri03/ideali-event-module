import { useRef, useState } from "react"
import { Box, Button, Flex, HStack, Stack, Text } from "@chakra-ui/react"
import { Tag } from "lucide-react"
import type { SeatingChart } from "@seatsio/seatsio-react"
import { useEventForSale, useMarkForSale, useMarkNotForSale } from "../../hooks/useEventReports"
import { ReportError, ReportPanelShell, ReportSkeleton } from "../ReportStates"
import { ForSaleChart } from "../ForSaleChart"
import { ForSaleRestriction } from "../ForSaleRestriction"

interface ForSalePanelProps {
  eventUniqueId: string
  formatCount: (value: number) => string
}

function toggle(set: Set<string>, value: string): Set<string> {
  const next = new Set(set)
  if (next.has(value)) {
    next.delete(value)
  } else {
    next.add(value)
  }
  return next
}

/** The brand-washed header explaining the two directions and how each commits. */
function ForSaleIntro() {
  return (
    <Flex
      align="center"
      gap={3}
      borderRadius="16px"
      border="1px solid"
      borderColor="border.subtle"
      bg="linear-gradient(135deg, rgba(117,81,255,0.08) 0%, rgba(66,42,251,0.04) 100%)"
      px={{ base: 4, md: 5 }}
      py={{ base: 3, md: 4 }}
    >
      <Box color="brand.600" flexShrink={0}>
        <Tag size={20} />
      </Box>
      <Box>
        <Text fontSize="sm" fontWeight="800" color="text.primary">
          Manage what's on sale
        </Text>
        <Text fontSize="sm" color="text.secondary">
          Pick objects on the map to take off sale, then apply. Put held-back objects back on sale from the list below.
        </Text>
      </Box>
    </Flex>
  )
}

/**
 * The take-off-sale summary and its commit. This direction is rate-limited by seats.io and picked spatially on the map,
 * so objects are staged and committed together as one call. The put-back-on-sale direction is not rate-limited and
 * commits from its own list, so it does not pass through here.
 */
function OffSaleApplyBar({
  count,
  onApply,
  onDiscard,
  isApplying,
}: {
  count: number
  onApply: () => void
  onDiscard: () => void
  isApplying: boolean
}) {
  return (
    <Box position="sticky" top={{ base: 2, md: 3 }} zIndex={2}>
      <Flex
        direction={{ base: "column", md: "row" }}
        align={{ base: "stretch", md: "center" }}
        justify="space-between"
        gap={3}
        borderRadius="16px"
        border="1px solid"
        borderColor="brand.400"
        bg="card.bg"
        boxShadow="cardHover"
        px={{ base: 4, md: 5 }}
        py={{ base: 3, md: 4 }}
      >
        <HStack gap={2} minW={0}>
          <Box boxSize="8px" borderRadius="999px" bg="status.warning" flexShrink={0} />
          <Text fontSize="sm" fontWeight="700" color="text.primary">
            {count} {count === 1 ? "object" : "objects"} to take off sale
          </Text>
        </HStack>
        <Flex gap={2} direction={{ base: "column", sm: "row" }}>
          <Button variant="ghost" onClick={onDiscard} disabled={isApplying} minH="11" px={6} order={{ base: 2, sm: 1 }}>
            Discard
          </Button>
          <Button
            colorPalette="orange"
            onClick={onApply}
            loading={isApplying}
            loadingText="Applying..."
            minH="11"
            px={8}
            order={{ base: 1, sm: 2 }}
          >
            Take off sale
          </Button>
        </Flex>
      </Flex>
    </Box>
  )
}

export function ForSalePanel({ eventUniqueId, formatCount }: ForSalePanelProps) {
  const query = useEventForSale(eventUniqueId, true)
  const markNotForSale = useMarkNotForSale(eventUniqueId)
  const markForSale = useMarkForSale(eventUniqueId)

  const chartRef = useRef<SeatingChart | null>(null)
  const [offSale, setOffSale] = useState<Set<string>>(new Set())
  const [backOnObjects, setBackOnObjects] = useState<Set<string>>(new Set())
  const [backOnCategories, setBackOnCategories] = useState<Set<string>>(new Set())

  const backOnCount = backOnObjects.size + backOnCategories.size

  function discardOffSale() {
    setOffSale(new Set())
    chartRef.current?.clearSelection()
  }

  function applyOffSale() {
    markNotForSale.mutate(
      { objects: [...offSale], categories: [] },
      {
        onSuccess: () => {
          setOffSale(new Set())
          chartRef.current?.clearSelection()
        },
      },
    )
  }

  async function applyBackOn() {
    await markForSale.mutateAsync({ objects: [...backOnObjects], categories: [...backOnCategories] })
    setBackOnObjects(new Set())
    setBackOnCategories(new Set())
  }

  if (query.isError) {
    return (
      <ReportPanelShell>
        <ReportError error={query.error} />
      </ReportPanelShell>
    )
  }

  if (query.isLoading || !query.data) {
    return (
      <ReportPanelShell>
        <ReportSkeleton />
      </ReportPanelShell>
    )
  }

  return (
    <ReportPanelShell>
      <Stack gap={5}>
        <ForSaleIntro />
        {offSale.size > 0 ? (
          <OffSaleApplyBar
            count={offSale.size}
            onApply={applyOffSale}
            onDiscard={discardOffSale}
            isApplying={markNotForSale.isPending}
          />
        ) : null}
        <ForSaleChart
          eventUniqueId={eventUniqueId}
          stagedLabels={[...offSale]}
          onObjectStaged={(label) => setOffSale((current) => new Set(current).add(label))}
          onObjectUnstaged={(label) =>
            setOffSale((current) => {
              const next = new Set(current)
              next.delete(label)
              return next
            })
          }
          onChartReady={(chart) => {
            chartRef.current = chart
          }}
        >
          <ForSaleRestriction
            report={query.data}
            formatCount={formatCount}
            stagedObjects={[...backOnObjects]}
            stagedCategories={[...backOnCategories]}
            stagedCount={backOnCount}
            onToggleObject={(label) => setBackOnObjects((current) => toggle(current, label))}
            onToggleCategory={(category) => setBackOnCategories((current) => toggle(current, category))}
            onToggleAllObjects={() =>
              setBackOnObjects((current) => {
                const heldBack = query.data.objects
                return heldBack.length > 0 && heldBack.every((label) => current.has(label))
                  ? new Set()
                  : new Set(heldBack)
              })
            }
            onPutSelectedBackOnSale={applyBackOn}
            isPutBackPending={markForSale.isPending}
          />
        </ForSaleChart>
      </Stack>
    </ReportPanelShell>
  )
}
