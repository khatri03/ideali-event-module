import { useParams } from "react-router-dom"
import { AlertDetailView } from "../components/AlertDetailView"

export default function MemberAlertDetailPage() {
  const { uniqueId = "" } = useParams()

  return <AlertDetailView uniqueId={uniqueId} />
}
