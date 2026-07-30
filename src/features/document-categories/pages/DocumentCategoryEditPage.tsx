import { useParams } from "react-router-dom"
import { DocumentCategoryForm } from "../components/DocumentCategoryForm"

export default function DocumentCategoryEditPage() {
  const { uniqueId = "" } = useParams()

  return <DocumentCategoryForm uniqueId={uniqueId} />
}
