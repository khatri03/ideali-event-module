import { ChakraProvider } from "@chakra-ui/react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { system } from "@/theme"
import type { ReportSort } from "../schemas/customFormReport.schemas"
import { ReportResultsCards } from "./ReportResultsCards"
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

function renderCards(sort: ReportSort | null = null, rows: ReportRow[] = [ROW]) {
  const onSort = vi.fn()

  render(
    <ChakraProvider value={system}>
      <ReportResultsCards columns={COLUMNS} rows={rows} entityLabel="Entity" sort={sort} onSort={onSort} />
    </ChakraProvider>,
  )

  return { onSort }
}

/** The sort control repeats every column name, so card assertions look only at the submissions themselves. */
function submissions() {
  return within(screen.getByRole("list", { name: "Submissions" }))
}

describe("ReportResultsCards", () => {
  it("Submission_IsHeadedByTheContactAndTheirInvoice", () => {
    renderCards()

    expect(submissions().getByText("Sohail Ahmed")).toBeInTheDocument()
    expect(submissions().getByText("INV-1001")).toBeInTheDocument()
  })

  it("EveryRemainingDetailAndAnswer_IsLabelledSoNoColumnIsLostAtThisWidth", () => {
    renderCards()

    const pairs = ["Contact No", "Contact Email", "Entity", "Dietary needs"]

    pairs.forEach((label) => expect(submissions().getByText(label)).toBeInTheDocument())
    expect(submissions().getByText("+1-555-0199")).toBeInTheDocument()
    expect(submissions().getByText("Halal")).toBeInTheDocument()
  })

  it("RenamedColumn_IsLabelledByTheTemplateHeading", () => {
    render(
      <ChakraProvider value={system}>
        <ReportResultsCards
          columns={[{ ...COLUMNS[0], columnLabel: "Meal preference" }]}
          entityLabel="Entity"
          rows={[ROW]}
          sort={null}
          onSort={vi.fn()}
        />
      </ChakraProvider>,
    )

    expect(submissions().getByText("Meal preference")).toBeInTheDocument()
    expect(submissions().queryByText("Dietary needs")).not.toBeInTheDocument()
  })

  it("UnansweredField_ShowsADashRatherThanAnEmptyLine", () => {
    renderCards(null, [{ ...ROW, answers: {} }])

    expect(submissions().getAllByText("—")).toHaveLength(1)
  })

  it("ChoosingASortColumn_AsksForThatColumnWithoutTheHeadingsBeingReachable", async () => {
    const { onSort } = renderCards()

    await userEvent.selectOptions(screen.getByLabelText("Sort submissions by"), "field-1")

    expect(onSort).toHaveBeenCalledWith("field-1")
  })

  it("RecordDetailSortChoice_CarriesItsPrefixedTarget", async () => {
    const { onSort } = renderCards()

    await userEvent.selectOptions(screen.getByLabelText("Sort submissions by"), "record-detail:2")

    expect(onSort).toHaveBeenCalledWith("record-detail:2")
  })

  it("UnsortedReport_OffersNoDirectionToggleBecauseThereIsNoOrderToReverse", () => {
    renderCards()

    expect(screen.queryByRole("button", { name: /order/i })).not.toBeInTheDocument()
  })

  it("AscendingReport_OffersToReverseTheOrderOnTheSameColumn", async () => {
    const { onSort } = renderCards({ target: "field-1", descending: false })

    await userEvent.click(screen.getByRole("button", { name: "Reverse the order" }))

    expect(onSort).toHaveBeenCalledWith("field-1")
  })

  it("DescendingReport_OffersTheWayBackToTheDefaultOrder", () => {
    renderCards({ target: "field-1", descending: true })

    expect(screen.getByRole("button", { name: "Return to newest first" })).toBeInTheDocument()
  })

  it("SortSelect_ShowsTheColumnTheReportIsCurrentlyOrderedBy", () => {
    renderCards({ target: "record-detail:2", descending: false })

    expect(screen.getByLabelText("Sort submissions by")).toHaveValue("record-detail:2")
  })

  it("EachSubmission_GetsItsOwnCard", () => {
    renderCards(null, [ROW, { ...ROW, invoiceNo: "INV-1002", contactName: "Alice Stone" }])

    expect(submissions().getAllByRole("listitem")).toHaveLength(2)
    expect(submissions().getByText("INV-1002")).toBeInTheDocument()
  })

  it("SortChoices_CoverEveryRecordDetailAndSelectedColumn", () => {
    renderCards()

    const options = within(screen.getByLabelText("Sort submissions by")).getAllByRole("option")

    expect(options.map((option) => option.textContent)).toEqual([
      "Newest first",
      "Invoice No",
      "Contact Name",
      "Contact No",
      "Contact Email",
      "Entity",
      "Dietary needs",
    ])
  })
})
