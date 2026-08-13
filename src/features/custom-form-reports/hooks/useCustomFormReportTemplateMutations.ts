import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createReportTemplate,
  deleteReportTemplate,
  updateReportTemplate,
  type ReportTemplateRequest,
} from "@/api/customFormReports"
import { toaster } from "@/lib/toaster"
import { extractApiError } from "@/utils/errors"
import { CUSTOM_FORM_REPORT_TEMPLATE_QUERY_KEY } from "./useCustomFormReports"

export function useCreateReportTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: ReportTemplateRequest) => createReportTemplate(request),
    onSuccess: () => {
      toaster.create({ type: "success", title: "Report template saved." })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOM_FORM_REPORT_TEMPLATE_QUERY_KEY })
    },
  })
}

export function useUpdateReportTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateUniqueId, request }: { templateUniqueId: string; request: ReportTemplateRequest }) =>
      updateReportTemplate(templateUniqueId, request),
    onSuccess: () => {
      toaster.create({ type: "success", title: "Report template updated." })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOM_FORM_REPORT_TEMPLATE_QUERY_KEY })
    },
  })
}

export function useDeleteReportTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateUniqueId: string) => deleteReportTemplate(templateUniqueId),
    onSuccess: () => {
      toaster.create({ type: "success", title: "Report template deleted." })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOM_FORM_REPORT_TEMPLATE_QUERY_KEY })
    },
  })
}
