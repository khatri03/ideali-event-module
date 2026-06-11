import { useParams } from "react-router-dom"
import { EventQuestionsStep } from "../components/EventQuestionsStep"

export function EventQuestionsStepPage() {
  const { eventId } = useParams<{ eventId?: string }>()

  return <EventQuestionsStep eventId={eventId ?? ""} />
}
