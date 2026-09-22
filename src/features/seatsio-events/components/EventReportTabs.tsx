import { useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { Box, Flex, Tabs } from "@chakra-ui/react"
import { useEventSummary } from "../hooks/useEventReports"
import { EventBookedProgress } from "./EventBookedProgress"
import { SummaryPanel } from "./panels/SummaryPanel"
import { ForSalePanel } from "./panels/ForSalePanel"
import { StatusChangesPanel } from "./panels/StatusChangesPanel"
import { CategoriesPanel, ChannelsPanel, TablesPanel } from "./panels/GroupTabPanels"

const TABS = [
  { value: "summary", label: "Summary" },
  { value: "for-sale", label: "For sale" },
  { value: "tables", label: "Tables" },
  { value: "channels", label: "Channels" },
  { value: "categories", label: "Categories" },
  { value: "status-changes", label: "Status changes" },
] as const

const TAB_VALUES = TABS.map((tab) => tab.value)
const DEFAULT_TAB = TABS[0].value

/** The count of booked objects, read from the status breakdown, that fills the progress bar above the tabs. */
function bookedCount(groups: { key: string; count: number }[]): number {
  return groups.find((group) => group.key.toLowerCase() === "booked")?.count ?? 0
}

export function EventReportTabs({ eventUniqueId }: { eventUniqueId: string }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get("tab")
  const activeTab = requestedTab && TAB_VALUES.includes(requestedTab as (typeof TAB_VALUES)[number]) ? requestedTab : DEFAULT_TAB

  const summaryQuery = useEventSummary(eventUniqueId, true)
  const summary = summaryQuery.data
  const showProgress = Boolean(summary && summary.totalObjects > 0)

  const formatCount = useMemo(() => {
    const formatter = new Intl.NumberFormat()
    return (value: number) => formatter.format(value)
  }, [])

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams)
    params.set("tab", value)
    setSearchParams(params, { replace: true })
  }

  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={(details) => handleTabChange(details.value)}
      lazyMount
      unmountOnExit
      variant="line"
    >
      {showProgress ? (
        <Flex justify="flex-end" mb={4}>
          <EventBookedProgress booked={bookedCount(summary!.byStatus)} total={summary!.totalObjects} />
        </Flex>
      ) : null}
      <Box overflowX="auto" borderBottom="1px solid" borderColor="border.subtle">
        <Tabs.List borderBottom="none" minW="fit-content" gap={1}>
          {TABS.map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              px={4}
              py={3}
              minH="11"
              fontSize="sm"
              fontWeight="700"
              whiteSpace="nowrap"
              color="gray.500"
              _selected={{ color: "brand.600" }}
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Box>

      <Box pt={5}>
        <Tabs.Content value="summary">
          <SummaryPanel eventUniqueId={eventUniqueId} />
        </Tabs.Content>
        <Tabs.Content value="for-sale">
          <ForSalePanel eventUniqueId={eventUniqueId} formatCount={formatCount} />
        </Tabs.Content>
        <Tabs.Content value="tables">
          <TablesPanel eventUniqueId={eventUniqueId} formatCount={formatCount} />
        </Tabs.Content>
        <Tabs.Content value="channels">
          <ChannelsPanel eventUniqueId={eventUniqueId} formatCount={formatCount} />
        </Tabs.Content>
        <Tabs.Content value="categories">
          <CategoriesPanel eventUniqueId={eventUniqueId} formatCount={formatCount} />
        </Tabs.Content>
        <Tabs.Content value="status-changes">
          <StatusChangesPanel eventUniqueId={eventUniqueId} />
        </Tabs.Content>
      </Box>
    </Tabs.Root>
  )
}
