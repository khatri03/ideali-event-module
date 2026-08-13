import { ChakraProvider } from "@chakra-ui/react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { system } from "@/theme"
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

function renderTable(columnLabel: string | null) {
  const columns: ReportField[] = [
    { uniqueId: "field-1", label: CONSENT_LABEL, controlType: "Text", displayOrder: 1, columnLabel },
  ]

  render(
    <ChakraProvider value={system}>
      <ReportResultsTable columns={columns} rows={[ROW]} isFetching={false} />
    </ChakraProvider>,
  )
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
        <ReportResultsTable columns={columns} rows={[{ ...ROW, contactNo: "" }]} isFetching={false} />
      </ChakraProvider>,
    )

    expect(screen.getAllByRole("cell")[2]).toHaveTextContent("—")
  })
})
