import { Text } from "@chakra-ui/react"
import { ConfirmDialog } from "@/components/common"
import { extractApiError } from "@/utils/errors"
import { useDeleteReportTemplate } from "../hooks/useCustomFormReportTemplateMutations"
import type { ReportTemplateListItem } from "@/api/customFormReports"

interface DeleteReportTemplateDialogProps {
  template: ReportTemplateListItem
  onClose: () => void
}

export function DeleteReportTemplateDialog({ template, onClose }: DeleteReportTemplateDialogProps) {
  const deleteMutation = useDeleteReportTemplate()

  async function handleDelete() {
    await deleteMutation.mutateAsync(template.uniqueId)
    onClose()
  }

  return (
    <ConfirmDialog
      title="Delete report template"
      description={
        <Text>
          Delete <strong>{template.name}</strong>? Reports already exported stay as they are; only the saved column
          selection is removed.
        </Text>
      }
      confirmLabel="Delete template"
      loadingLabel="Deleting..."
      errorMessage={deleteMutation.error ? extractApiError(deleteMutation.error) : null}
      isPending={deleteMutation.isPending}
      onConfirm={handleDelete}
      onClose={onClose}
    />
  )
}
