import { Button, Stack } from "@chakra-ui/react"
import { Library, Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { APP_ROUTES } from "@/utils/routes"
import { ReportPageHeader } from "../components/ReportPageHeader"
import { ReportTemplatesManager } from "../components/ReportTemplatesManager"

export function CustomFormReportTemplatesPage() {
  const navigate = useNavigate()

  return (
    <Stack gap={6}>
      <ReportPageHeader
        icon={<Library size={28} color="white" />}
        title="Report Templates"
        description="Column selections you saved while building a report. Open the report builder to create a new one or to change the columns of an existing template."
        action={
          <Button
            borderRadius="14px"
            minH="11"
            px={6}
            w={{ base: "full", md: "auto" }}
            color="white"
            style={{ background: "linear-gradient(135deg, #7551FF 0%, #422AFB 100%)" }}
            cursor="pointer"
            onClick={() => navigate(APP_ROUTES.customFormReports.builder)}
          >
            <Plus size={16} />
            New report
          </Button>
        }
      />

      <ReportTemplatesManager />
    </Stack>
  )
}
