import { Navigate, useParams } from "react-router-dom"
import { APP_ROUTES } from "@/utils/routes"
import { CustomListEditor } from "../components/CustomListEditor"

export function CustomListEditPage() {
  const { uniqueId } = useParams<{ uniqueId: string }>()

  if (!uniqueId) {
    return <Navigate to={APP_ROUTES.customLists.list} replace />
  }

  return <CustomListEditor customListUniqueId={uniqueId} />
}
