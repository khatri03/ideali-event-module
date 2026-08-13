import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  fetchReportColumns,
  fetchReportEntities,
  fetchReportForms,
  fetchReportModules,
  fetchReportTemplate,
  fetchReportTemplateOptions,
  fetchReportTemplates,
  runCustomFormReport,
  type ReportRequest,
} from "@/api/customFormReports"

export const CUSTOM_FORM_REPORT_QUERY_KEY = ["organizer", "custom-form-reports"] as const
export const CUSTOM_FORM_REPORT_TEMPLATE_QUERY_KEY = [...CUSTOM_FORM_REPORT_QUERY_KEY, "templates"] as const

export function useReportModules() {
  return useQuery({
    queryKey: [...CUSTOM_FORM_REPORT_QUERY_KEY, "modules"],
    queryFn: fetchReportModules,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useReportEntities(moduleId: number | null) {
  return useQuery({
    queryKey: [...CUSTOM_FORM_REPORT_QUERY_KEY, "entities", moduleId],
    queryFn: () => fetchReportEntities(moduleId as number),
    enabled: moduleId !== null,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useReportForms(moduleId: number | null, entityUniqueId: string | null) {
  return useQuery({
    queryKey: [...CUSTOM_FORM_REPORT_QUERY_KEY, "forms", moduleId, entityUniqueId],
    queryFn: () => fetchReportForms(moduleId as number, entityUniqueId as string),
    enabled: moduleId !== null && entityUniqueId !== null,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useReportColumns(formUniqueId: string | null) {
  return useQuery({
    queryKey: [...CUSTOM_FORM_REPORT_QUERY_KEY, "columns", formUniqueId],
    queryFn: () => fetchReportColumns(formUniqueId as string),
    enabled: formUniqueId !== null,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useReportTemplateOptions(moduleId: number | null, formUniqueId: string | null) {
  return useQuery({
    queryKey: [...CUSTOM_FORM_REPORT_TEMPLATE_QUERY_KEY, "options", moduleId, formUniqueId],
    queryFn: () => fetchReportTemplateOptions(moduleId as number, formUniqueId as string),
    enabled: moduleId !== null && formUniqueId !== null,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useReportTemplate(templateUniqueId: string | null) {
  return useQuery({
    queryKey: [...CUSTOM_FORM_REPORT_TEMPLATE_QUERY_KEY, "detail", templateUniqueId],
    queryFn: () => fetchReportTemplate(templateUniqueId as string),
    enabled: templateUniqueId !== null,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useReportTemplates(searchTerm: string, page: number, pageSize: number) {
  return useQuery({
    queryKey: [...CUSTOM_FORM_REPORT_TEMPLATE_QUERY_KEY, "list", { searchTerm, page, pageSize }],
    queryFn: () => fetchReportTemplates(searchTerm, page, pageSize),
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useCustomFormReport(request: ReportRequest | null) {
  return useQuery({
    queryKey: [...CUSTOM_FORM_REPORT_QUERY_KEY, "run", request],
    queryFn: () => runCustomFormReport(request as ReportRequest),
    enabled: request !== null,
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  })
}
