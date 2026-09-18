import { useEventSummary } from "../../hooks/useEventReports"
import { EventChartPreview } from "../EventChartPreview"
import { ReportEmpty, ReportError, ReportPanelShell, ReportSkeleton } from "../ReportStates"

interface SummaryPanelProps {
  eventUniqueId: string
  formatCount: (value: number) => string
}

/** The count of booked objects, read from the status breakdown, shown as the badge on top of the live map. */
function bookedCount(groups: { key: string; label: string; count: number }[]): number {
  return groups.find((group) => group.key.toLowerCase() === "booked")?.count ?? 0
}

export function SummaryPanel({ eventUniqueId, formatCount }: SummaryPanelProps) {
  const query = useEventSummary(eventUniqueId, true)

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

  const summary = query.data
  if (summary.totalObjects === 0 && summary.byStatus.length === 0) {
    return (
      <ReportEmpty
        title="No seats reported yet"
        description="Once this event has objects on its chart, its live seat map appears here."
      />
    )
  }

  return (
    <ReportPanelShell>
      <EventChartPreview
        eventUniqueId={eventUniqueId}
        bookedLabel={`${formatCount(bookedCount(summary.byStatus))} booked`}
      />
    </ReportPanelShell>
  )
}
