import { useState } from "react"
import { Button, Menu, Portal } from "@chakra-ui/react"
import { Download } from "lucide-react"
import { REPORT_EXPORT_FORMAT, type ReportExportFormat, type ReportExportScope } from "@/api/customFormReports"
import { ReportExportScopeDialog } from "./ReportExportScopeDialog"

const EXPORT_FORMATS: { format: ReportExportFormat; label: string }[] = [
  { format: REPORT_EXPORT_FORMAT.excel, label: "Excel" },
  { format: REPORT_EXPORT_FORMAT.csv, label: "CSV" },
  { format: REPORT_EXPORT_FORMAT.json, label: "JSON" },
]

interface ReportExportMenuProps {
  pageRowCount: number
  totalRowCount: number
  isExporting: boolean
  onExport: (format: ReportExportFormat, scope: ReportExportScope) => Promise<void>
}

export function ReportExportMenu({ pageRowCount, totalRowCount, isExporting, onExport }: ReportExportMenuProps) {
  const [chosenFormat, setChosenFormat] = useState<ReportExportFormat | null>(null)
  const chosen = EXPORT_FORMATS.find((option) => option.format === chosenFormat)

  /**
   * A failed download leaves the dialog open so the reader can pick the smaller scope instead; the reason for the
   * failure has already reached them as a message, so it is not repeated here.
   */
  async function handleConfirm(format: ReportExportFormat, scope: ReportExportScope) {
    try {
      await onExport(format, scope)
      setChosenFormat(null)
    } catch {
      setChosenFormat(format)
    }
  }

  return (
    <>
      <Menu.Root positioning={{ placement: "bottom-end" }}>
        <Menu.Trigger asChild>
          <Button
            variant="outline"
            borderRadius="14px"
            h="44px"
            px={6}
            w={{ base: "full", md: "auto" }}
            cursor="pointer"
          >
            <Download size={16} aria-hidden />
            Export
          </Button>
        </Menu.Trigger>

        <Portal>
          <Menu.Positioner>
            <Menu.Content minW="12rem" borderRadius="16px" p={2}>
              {EXPORT_FORMATS.map((option) => (
                <Menu.Item
                  key={option.format}
                  value={option.label}
                  minH="11"
                  px={3}
                  borderRadius="10px"
                  fontSize="sm"
                  fontWeight="600"
                  cursor="pointer"
                  onClick={() => setChosenFormat(option.format)}
                >
                  {option.label}
                </Menu.Item>
              ))}
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>

      {chosen ? (
        <ReportExportScopeDialog
          formatLabel={chosen.label}
          pageRowCount={pageRowCount}
          totalRowCount={totalRowCount}
          isExporting={isExporting}
          onConfirm={(scope) => void handleConfirm(chosen.format, scope)}
          onClose={() => setChosenFormat(null)}
        />
      ) : null}
    </>
  )
}
