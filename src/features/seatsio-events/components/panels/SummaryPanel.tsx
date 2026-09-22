import { useEventSummary } from "../../hooks/useEventReports"
import { EventChartPreview } from "../EventChartPreview"
import { ReportEmpty, ReportError, ReportPanelShell, ReportSkeleton } from "../ReportStates"

interface SummaryPanelProps {
  eventUniqueId: string
}

export function SummaryPanel({ eventUniqueId }: SummaryPanelProps) {
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
      <EventChartPreview eventUniqueId={eventUniqueId} />
    </ReportPanelShell>
  )
}
