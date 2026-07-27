import { useParams } from "react-router-dom"
import { AlertComposer } from "../components/AlertComposer"

export default function MemberAlertEditPage() {
  const { uniqueId = "" } = useParams()

  return <AlertComposer uniqueId={uniqueId} />
}
