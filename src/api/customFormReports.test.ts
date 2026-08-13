import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createReportTemplate,
  exportCustomFormReport,
  fetchReportModules,
  fetchReportTemplate,
  fetchReportTemplates,
  REPORT_EXPORT_FORMAT,
  REPORT_EXPORT_SCOPE,
  REPORT_SYSTEM_FIELD,
  runCustomFormReport,
  type ReportExportRequest,
  type ReportRequest,
} from "./customFormReports"
import { ServiceResponseError } from "./serviceResponse"

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))

vi.mock("@/api/client", () => ({ client: http }))

const DIETARY_FIELD_ID = "3f1b6c0e-1c4e-4f0a-9b2e-8f5a1d2c3b4a"
const ALLERGY_FIELD_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d"

const REQUEST: ReportRequest = {
  moduleId: 1,
  entityUniqueId: "d4c3b2a1-0000-4000-8000-000000000001",
  formUniqueId: "d4c3b2a1-0000-4000-8000-000000000002",
  fieldUniqueIds: [DIETARY_FIELD_ID],
  filters: [],
  sortFieldUniqueId: null,
  sortSystemField: null,
  sortDescending: false,
  pageNo: 1,
  pageSize: 10,
}

const EXPORT_REQUEST: ReportExportRequest = {
  ...REQUEST,
  format: REPORT_EXPORT_FORMAT.csv,
  scope: REPORT_EXPORT_SCOPE.allMatchingRows,
  templateUniqueId: null,
}

function runPayload() {
  return {
    Success: true,
    Message: null,
    Data: {
      Columns: [{ UniqueId: DIETARY_FIELD_ID, Label: "Dietary needs", ControlType: "Text", DisplayOrder: 1 }],
      Rows: {
        PageNo: 2,
        PageSize: 10,
        PageCount: 4,
        TotalRecordsCount: 37,
        PageData: [
          {
            InvoiceNo: "INV-1001",
            ContactName: "Sohail Ahmed",
            ContactNo: "+1-555-0199",
            ContactEmail: "sohail@example.com",
            EntityName: "APPNA 49th Annual Convention 2026",
            Answers: { [DIETARY_FIELD_ID]: "Halal", [ALLERGY_FIELD_ID]: null },
          },
        ],
      },
    },
  }
}

describe("customFormReports api", () => {
  beforeEach(() => {
    http.get.mockReset()
    http.post.mockReset()
  })

  it("RunReport_PascalCaseBody_MapsRowsAndKeepsAnswerKeysAsIds", async () => {
    http.post.mockResolvedValue({ data: runPayload() })

    const result = await runCustomFormReport(REQUEST)

    expect(result.columns).toEqual([
      { uniqueId: DIETARY_FIELD_ID, label: "Dietary needs", controlType: "Text", displayOrder: 1, columnLabel: null },
    ])
    expect(result.rows).toMatchObject({ total: 37, page: 2, pageSize: 10, totalPages: 4 })
    expect(result.rows.items[0].answers[DIETARY_FIELD_ID]).toBe("Halal")
    expect(result.rows.items[0].contactNo).toBe("+1-555-0199")
  })

  it("RunReport_RecordDetailFilter_IsSentWithoutAFieldId", async () => {
    http.post.mockResolvedValue({ data: runPayload() })

    await runCustomFormReport({
      ...REQUEST,
      filters: [{ fieldUniqueId: null, systemField: REPORT_SYSTEM_FIELD.contactNo, operator: 1, values: ["555"] }],
    })

    expect(http.post.mock.calls[0][1].filters).toEqual([
      { fieldUniqueId: null, systemField: 3, operator: 1, values: ["555"] },
    ])
  })

  it("RunReport_MissingPermanentColumns_RendersThemAsEmptyStringsRatherThanNull", async () => {
    const payload = runPayload()
    payload.Data.Rows.PageData[0].InvoiceNo = null as unknown as string
    payload.Data.Rows.PageData[0].ContactEmail = null as unknown as string
    http.post.mockResolvedValue({ data: payload })

    const result = await runCustomFormReport(REQUEST)

    expect(result.rows.items[0].invoiceNo).toBe("")
    expect(result.rows.items[0].contactEmail).toBe("")
  })

  it("RunReport_ServiceReportsFailure_ThrowsTheServerMessage", async () => {
    http.post.mockResolvedValue({ data: { Success: false, Message: "You cannot report on this form." } })

    await expect(runCustomFormReport(REQUEST)).rejects.toBeInstanceOf(ServiceResponseError)
    await expect(runCustomFormReport(REQUEST)).rejects.toThrow("You cannot report on this form.")
  })

  it("RunReport_ResponseShapeDoesNotMatch_ThrowsRatherThanReturningPartialRows", async () => {
    http.post.mockResolvedValue({ data: { Success: true, Data: { Columns: [], Rows: { PageNo: 1 } } } })

    await expect(runCustomFormReport(REQUEST)).rejects.toThrow()
  })

  it("FetchTemplates_NullPageData_ReturnsAnEmptyPageInsteadOfThrowing", async () => {
    http.get.mockResolvedValue({
      data: { Success: true, Data: { PageNo: 1, PageSize: 10, PageCount: 0, TotalRecordsCount: 0, PageData: null } },
    })

    const page = await fetchReportTemplates("", 1, 10)

    expect(page.items).toEqual([])
    expect(page.total).toBe(0)
  })

  it("FetchTemplates_BlankSearchTerm_IsNotSentAsAQueryParameter", async () => {
    http.get.mockResolvedValue({
      data: { Success: true, Data: { PageNo: 1, PageSize: 10, PageCount: 0, TotalRecordsCount: 0, PageData: [] } },
    })

    await fetchReportTemplates("   ", 2, 25)

    const params = http.get.mock.calls[0][1].params as URLSearchParams
    expect(params.has("searchTerm")).toBe(false)
    expect(params.get("page")).toBe("2")
    expect(params.get("pageSize")).toBe("25")
  })

  it("FetchModules_Options_AreMappedToIdAndName", async () => {
    http.get.mockResolvedValue({ data: { Success: true, Data: [{ Text: "Event", Value: 1 }] } })

    await expect(fetchReportModules()).resolves.toEqual([{ id: 1, name: "Event" }])
  })

  it("FetchTemplate_RenamedColumn_KeepsBothTheHeadingAndTheFieldLabel", async () => {
    http.get.mockResolvedValue({
      data: {
        Success: true,
        Data: {
          UniqueId: "template-1",
          Name: "Membership consent",
          ModuleId: 5,
          ModuleName: "Membership",
          FormUniqueId: REQUEST.formUniqueId,
          FormName: "Member form",
          Columns: [
            {
              UniqueId: DIETARY_FIELD_ID,
              Label: "I agree to receive membership updates",
              ControlType: "Text",
              DisplayOrder: 1,
              ColumnLabel: "Updates opt-in",
            },
          ],
        },
      },
    })

    const template = await fetchReportTemplate("template-1")

    expect(template.columns[0].columnLabel).toBe("Updates opt-in")
    expect(template.columns[0].label).toBe("I agree to receive membership updates")
  })

  it("ExportReport_ScopeAndFormat_AreSentAlongsideTheReportThatIsOnScreen", async () => {
    http.post.mockResolvedValue({ data: new Blob(["a,b"]), headers: {} })

    await exportCustomFormReport(EXPORT_REQUEST)

    expect(http.post.mock.calls[0][1]).toMatchObject({
      format: REPORT_EXPORT_FORMAT.csv,
      scope: REPORT_EXPORT_SCOPE.allMatchingRows,
      fieldUniqueIds: [DIETARY_FIELD_ID],
    })
    expect(http.post.mock.calls[0][2]).toEqual({ responseType: "blob" })
  })

  it("ExportReport_ServerNamesTheFile_ThatNameIsUsedForTheDownload", async () => {
    http.post.mockResolvedValue({
      data: new Blob(["a,b"]),
      headers: { "content-disposition": 'attachment; filename=member-form-20260813120000.csv' },
    })

    const download = await exportCustomFormReport(EXPORT_REQUEST)

    expect(download.fileName).toBe("member-form-20260813120000.csv")
  })

  it("ExportReport_ResponseWithoutAFileName_FallsBackRatherThanDownloadingUndefined", async () => {
    http.post.mockResolvedValue({ data: new Blob(["a,b"]), headers: {} })

    await expect(exportCustomFormReport(EXPORT_REQUEST)).resolves.toMatchObject({
      fileName: "custom-form-report",
    })
  })

  it("ExportReport_RejectedByTheServer_ThrowsTheMessageInsteadOfReturningAFile", async () => {
    http.post.mockRejectedValue({
      response: { data: new Blob([JSON.stringify({ Success: false, Message: "Narrow the filters and try again." })]) },
    })

    await expect(exportCustomFormReport(EXPORT_REQUEST)).rejects.toBeInstanceOf(ServiceResponseError)
  })

  it("ExportReport_RejectedWithAnUnreadableBody_StillThrowsSomethingSafeToShow", async () => {
    http.post.mockRejectedValue({ response: { data: new Blob(["<html>gateway error</html>"]) } })

    await expect(exportCustomFormReport(EXPORT_REQUEST)).rejects.toThrow("Failed to download the report.")
  })

  it("CreateTemplate_DuplicateName_SurfacesTheServerMessage", async () => {
    http.post.mockResolvedValue({ data: { Success: false, Message: "A template with that name already exists." } })

    await expect(
      createReportTemplate({ name: "Dietary", moduleId: 1, formUniqueId: REQUEST.formUniqueId, columns: [] }),
    ).rejects.toThrow("A template with that name already exists.")
  })
})
