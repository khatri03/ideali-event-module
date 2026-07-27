import { useParams } from "react-router-dom"
import { DocumentCategoryDetailView } from "../components/DocumentCategoryDetailView"

export default function DocumentCategoryDetailPage() {
  const { uniqueId = "" } = useParams()

  return <DocumentCategoryDetailView uniqueId={uniqueId} />
}
