import { Button, Stack } from "@chakra-ui/react"
import { FileSpreadsheet, Library } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { APP_ROUTES } from "@/utils/routes"
import { CustomFormReportBuilder } from "../components/CustomFormReportBuilder"
import { ReportPageHeader } from "../components/ReportPageHeader"

export function CustomFormReportBuilderPage() {
  const navigate = useNavigate()

  return (
    <Stack gap={6}>
      <ReportPageHeader
        icon={<FileSpreadsheet size={28} color="white" />}
        title="Custom Reports"
        description="Pick a module, an entity and one of its custom forms, then choose the answers you want alongside the invoice and contact details. Save a column choice as a template to reuse it later."
        action={
          <Button
            variant="outline"
            borderRadius="14px"
            minH="11"
            px={6}
            w={{ base: "full", md: "auto" }}
            cursor="pointer"
            onClick={() => navigate(APP_ROUTES.customFormReports.templates)}
          >
            <Library size={16} />
            Saved templates
          </Button>
        }
      />

      <CustomFormReportBuilder />
    </Stack>
  )
}
