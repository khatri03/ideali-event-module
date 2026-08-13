import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createReportTemplate,
  fetchReportModules,
  fetchReportTemplates,
  runCustomFormReport,
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
  pageNo: 1,
  pageSize: 10,
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
      { uniqueId: DIETARY_FIELD_ID, label: "Dietary needs", controlType: "Text", displayOrder: 1 },
    ])
    expect(result.rows).toMatchObject({ total: 37, page: 2, pageSize: 10, totalPages: 4 })
    expect(result.rows.items[0].answers[DIETARY_FIELD_ID]).toBe("Halal")
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

  it("CreateTemplate_DuplicateName_SurfacesTheServerMessage", async () => {
    http.post.mockResolvedValue({ data: { Success: false, Message: "A template with that name already exists." } })

    await expect(
      createReportTemplate({ name: "Dietary", moduleId: 1, formUniqueId: REQUEST.formUniqueId, fieldUniqueIds: [] }),
    ).rejects.toThrow("A template with that name already exists.")
  })
})
