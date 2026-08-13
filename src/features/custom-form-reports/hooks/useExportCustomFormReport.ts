import { useMutation } from "@tanstack/react-query"
import { exportCustomFormReport, type ReportExportRequest } from "@/api/customFormReports"
import { toaster } from "@/lib/toaster"
import { saveBlob } from "@/utils/download"
import { extractApiError } from "@/utils/errors"

/**
 * A download changes nothing on the server, so there is no cache to invalidate; it is a mutation because it is an
 * action the reader takes rather than state the page keeps.
 */
export function useExportCustomFormReport() {
  return useMutation({
    mutationFn: (request: ReportExportRequest) => exportCustomFormReport(request),
    onSuccess: (download) => {
      saveBlob(download.blob, download.fileName)
      toaster.create({ type: "success", title: `Downloaded ${download.fileName}` })
    },
    onError: (error) => {
      toaster.create({ type: "error", title: extractApiError(error) })
    },
  })
}
