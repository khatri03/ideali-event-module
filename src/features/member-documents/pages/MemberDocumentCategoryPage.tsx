import { useParams } from "react-router-dom"
import { MemberDocumentCategoryView } from "../components/MemberDocumentCategoryView"

export default function MemberDocumentCategoryPage() {
  const { uniqueId = "" } = useParams()

  return <MemberDocumentCategoryView uniqueId={uniqueId} />
}
