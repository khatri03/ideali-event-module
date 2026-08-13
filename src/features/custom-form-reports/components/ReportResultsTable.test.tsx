import { ChakraProvider } from "@chakra-ui/react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { system } from "@/theme"
import type { ReportSort } from "../schemas/customFormReport.schemas"
import { ReportResultsTable } from "./ReportResultsTable"
import type { ReportField, ReportRow } from "@/api/customFormReports"

const CONSENT_LABEL = "I agree to receive membership updates"

const ROW: ReportRow = {
  invoiceNo: "INV-1001",
  contactName: "Sohail Ahmed",
  contactNo: "+1-555-0199",
  contactEmail: "sohail@example.com",
  entityName: "Gold membership",
  answers: { "field-1": "Yes" },
}

function renderTable(columnLabel: string | null, sort: ReportSort | null = null) {
  const columns: ReportField[] = [
    { uniqueId: "field-1", label: CONSENT_LABEL, controlType: "Text", displayOrder: 1, columnLabel },
  ]
  const onSort = vi.fn()

  render(
    <ChakraProvider value={system}>
      <ReportResultsTable columns={columns} rows={[ROW]} entityLabel="Entity" sort={sort} onSort={onSort} />
    </ChakraProvider>,
  )

  return { onSort }
}

describe("ReportResultsTable", () => {
  it("RenamedColumn_IsHeadedByTheTemplateHeadingNotTheQuestion", () => {
    renderTable("Updates opt-in")

    expect(screen.getByRole("columnheader", { name: "Updates opt-in" })).toBeInTheDocument()
    expect(screen.queryByRole("columnheader", { name: CONSENT_LABEL })).not.toBeInTheDocument()
  })

  it("UnnamedColumn_FallsBackToTheFieldLabel", () => {
    renderTable(null)

    expect(screen.getByRole("columnheader", { name: CONSENT_LABEL })).toBeInTheDocument()
  })

  it("RecordDetails_LeadEveryReportInAFixedOrder", () => {
    renderTable(null)

    expect(
      screen.getAllByRole("columnheader").slice(0, 5).map((header) => header.textContent),
    ).toEqual(["Invoice No", "Contact Name", "Contact No", "Contact Email", "Entity"])
    expect(screen.getByRole("cell", { name: "+1-555-0199" })).toBeInTheDocument()
  })

  it("MissingRecordDetail_ShowsADashRatherThanAnEmptyCell", () => {
    const columns: ReportField[] = [
      { uniqueId: "field-1", label: CONSENT_LABEL, controlType: "Text", displayOrder: 1, columnLabel: null },
    ]

    render(
      <ChakraProvider value={system}>
        <ReportResultsTable
          columns={columns}
          entityLabel="Entity"
          rows={[{ ...ROW, contactNo: "" }]}
          sort={null}
          onSort={vi.fn()}
        />
      </ChakraProvider>,
    )

    expect(screen.getAllByRole("cell")[2]).toHaveTextContent("—")
  })

  it("LongAnswer_IsStillReadableInFullEvenThoughTheColumnCutsIt", () => {
    const answer = `Severe nut allergy. ${"Details follow. ".repeat(40)}`
    const columns: ReportField[] = [
      { uniqueId: "field-1", label: CONSENT_LABEL, controlType: "Text", displayOrder: 1, columnLabel: null },
    ]

    render(
      <ChakraProvider value={system}>
        <ReportResultsTable
          columns={columns}
          entityLabel="Entity"
          rows={[{ ...ROW, answers: { "field-1": answer } }]}
          sort={null}
          onSort={vi.fn()}
        />
      </ChakraProvider>,
    )

    expect(screen.getAllByRole("cell")[5]).toHaveAttribute("title", answer.trim())
  })

  it("UnansweredField_CarriesNoTitleSoTheDashIsNotOfferedAsContent", () => {
    const columns: ReportField[] = [
      { uniqueId: "field-1", label: CONSENT_LABEL, controlType: "Text", displayOrder: 1, columnLabel: null },
    ]

    render(
      <ChakraProvider value={system}>
        <ReportResultsTable
          columns={columns}
          entityLabel="Entity"
          rows={[{ ...ROW, answers: {} }]}
          sort={null}
          onSort={vi.fn()}
        />
      </ChakraProvider>,
    )

    const answerCell = screen.getAllByRole("cell")[5]

    expect(answerCell).toHaveTextContent("—")
    expect(answerCell).not.toHaveAttribute("title")
  })

  it("ClickingAColumn_AsksForItToBeSorted", async () => {
    const { onSort } = renderTable(null)

    await userEvent.click(screen.getByRole("button", { name: CONSENT_LABEL }))

    expect(onSort).toHaveBeenCalledWith("field-1")
  })

  it("ClickingARecordDetail_AsksForItsPrefixedTargetToBeSorted", async () => {
    const { onSort } = renderTable(null)

    await userEvent.click(screen.getByRole("button", { name: "Invoice No" }))

    expect(onSort).toHaveBeenCalledWith("record-detail:1")
  })

  it("SortedColumn_IsTheOnlyOneAnnouncingADirection", () => {
    renderTable(null, { target: "field-1", descending: true })

    expect(screen.getByRole("columnheader", { name: CONSENT_LABEL })).toHaveAttribute("aria-sort", "descending")
    expect(screen.getByRole("columnheader", { name: "Invoice No" })).toHaveAttribute("aria-sort", "none")
  })
})
