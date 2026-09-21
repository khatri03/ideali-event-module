import { useRef, useState } from "react"
import { Box, Flex, Stack, Text } from "@chakra-ui/react"
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
          Pick objects on the map to take off sale, or tap held-back objects to put them back — then review and apply
          together.
        </Text>
      </Box>
    </Flex>
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

  function focusObjects(labels: string[]) {
    if (labels.length === 0) {
      return
    }
    void chartRef.current?.zoomToObjects(labels)
  }

  function discardOffSale() {
    setOffSale(new Set())
    chartRef.current?.clearSelection()
  }

  function discardBackOn() {
    setBackOnObjects(new Set())
    setBackOnCategories(new Set())
  }

  async function applyOffSale(): Promise<boolean> {
    if (offSale.size === 0) {
      return true
    }
    try {
      await markNotForSale.mutateAsync({ objects: [...offSale], categories: [] })
      setOffSale(new Set())
      chartRef.current?.clearSelection()
      return true
    } catch {
      // The hook toasts its own error; leave the set staged so it can be retried from the card.
      return false
    }
  }

  async function applyBackOn(): Promise<boolean> {
    if (backOnObjects.size === 0 && backOnCategories.size === 0) {
      return true
    }
    try {
      await markForSale.mutateAsync({ objects: [...backOnObjects], categories: [...backOnCategories] })
      setBackOnObjects(new Set())
      setBackOnCategories(new Set())
      return true
    } catch {
      // The hook toasts its own error; leave the set staged so it can be retried from the card.
      return false
    }
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
          onApply={applyOffSale}
          onClear={discardOffSale}
          isApplying={markNotForSale.isPending}
        />
        <ForSaleRestriction
          report={query.data}
          formatCount={formatCount}
          stagedObjects={[...backOnObjects]}
          stagedCategories={[...backOnCategories]}
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
          onApply={applyBackOn}
          onClear={discardBackOn}
          onFocusObjects={focusObjects}
          isApplying={markForSale.isPending}
        />
      </Stack>
    </ReportPanelShell>
  )
}
