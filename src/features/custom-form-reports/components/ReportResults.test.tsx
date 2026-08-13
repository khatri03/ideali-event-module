import { ChakraProvider } from "@chakra-ui/react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { system } from "@/theme"
import { ReportResults } from "./ReportResults"
import type { ReportField, ReportRow } from "@/api/customFormReports"

const COLUMNS: ReportField[] = [
  { uniqueId: "field-1", label: "Dietary needs", controlType: "Text", displayOrder: 1, columnLabel: null },
]

const ROW: ReportRow = {
  invoiceNo: "INV-1001",
  contactName: "Sohail Ahmed",
  contactNo: "+1-555-0199",
  contactEmail: "sohail@example.com",
  entityName: "Gold membership",
  answers: { "field-1": "Halal" },
}

function renderResults(rows: ReportRow[], isFetching = false) {
  render(
    <ChakraProvider value={system}>
      <ReportResults columns={COLUMNS} rows={rows} entityLabel="Entity" isFetching={isFetching} sort={null} onSort={vi.fn()} />
    </ChakraProvider>,
  )
}

describe("ReportResults", () => {
  it("ReportThatMatchedNothing_SaysSoAndOffersNoLayoutAtAll", () => {
    renderResults([])

    expect(screen.getByText("No submissions match this report.")).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Sort submissions by")).not.toBeInTheDocument()
  })

  it("Rows_AreCarriedByBothTheTableAndTheCardsSoEitherWidthIsServed", () => {
    renderResults([ROW])

    expect(screen.getByRole("table")).toBeInTheDocument()
    expect(screen.getByLabelText("Sort submissions by")).toBeInTheDocument()
  })

  it("Refetching_IsAnnouncedRatherThanOnlyDimmed", () => {
    renderResults([ROW], true)

    expect(screen.getByRole("table").closest("[aria-busy]")).toHaveAttribute("aria-busy", "true")
  })
})
