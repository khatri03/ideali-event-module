import { ChakraProvider } from "@chakra-ui/react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { REPORT_EXPORT_FORMAT, REPORT_EXPORT_SCOPE } from "@/api/customFormReports"
import { system } from "@/theme"
import { ReportExportMenu } from "./ReportExportMenu"

function renderMenu(onExport = vi.fn().mockResolvedValue(undefined)) {
  render(
    <ChakraProvider value={system}>
      <ReportExportMenu pageRowCount={10} totalRowCount={37} isExporting={false} onExport={onExport} />
    </ChakraProvider>,
  )

  return { onExport }
}

async function chooseFormat(label: string) {
  await userEvent.click(screen.getByRole("button", { name: /Export/ }))
  await userEvent.click(await screen.findByRole("menuitem", { name: label }))
}

describe("ReportExportMenu", () => {
  it("ChoosingAFormat_AsksForTheScopeBeforeDownloadingAnything", async () => {
    const { onExport } = renderMenu()

    await chooseFormat("Excel")

    expect(await screen.findByText("Download as Excel")).toBeInTheDocument()
    expect(onExport).not.toHaveBeenCalled()
  })

  it("ScopeChoices_StateHowManyRowsEachOneWouldDownload", async () => {
    renderMenu()

    await chooseFormat("CSV")

    expect(await screen.findByRole("button", { name: /This page only\s*10 rows/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Every row matching the filters\s*37 rows/ })).toBeInTheDocument()
  })

  it("ConfirmingThisPage_DownloadsOnlyTheCurrentPageInTheChosenFormat", async () => {
    const { onExport } = renderMenu()

    await chooseFormat("JSON")
    await userEvent.click(await screen.findByRole("button", { name: /This page only/ }))

    expect(onExport).toHaveBeenCalledWith(REPORT_EXPORT_FORMAT.json, REPORT_EXPORT_SCOPE.currentPage)
  })

  it("ConfirmingEveryRow_DownloadsTheWholeFilteredReport", async () => {
    const { onExport } = renderMenu()

    await chooseFormat("Excel")
    await userEvent.click(await screen.findByRole("button", { name: /Every row matching the filters/ }))

    expect(onExport).toHaveBeenCalledWith(REPORT_EXPORT_FORMAT.excel, REPORT_EXPORT_SCOPE.allMatchingRows)
  })

  it("SuccessfulDownload_ClosesTheScopeDialog", async () => {
    renderMenu()

    await chooseFormat("CSV")
    await userEvent.click(await screen.findByRole("button", { name: /This page only/ }))

    await waitFor(() => expect(screen.queryByText("Download as CSV")).not.toBeInTheDocument())
  })

  it("RejectedDownload_LeavesTheDialogOpenSoASmallerScopeCanBeChosen", async () => {
    renderMenu(vi.fn().mockRejectedValue(new Error("Too many rows.")))

    await chooseFormat("CSV")
    await userEvent.click(await screen.findByRole("button", { name: /Every row matching the filters/ }))

    await waitFor(() => expect(screen.getByText("Download as CSV")).toBeInTheDocument())
  })

  it("Disabled_OffersNoFormatAndSaysWhatIsMissing", async () => {
    render(
      <ChakraProvider value={system}>
        <ReportExportMenu pageRowCount={10} totalRowCount={37} isExporting={false} isDisabled onExport={vi.fn()} />
      </ChakraProvider>,
    )

    const trigger = screen.getByRole("button", { name: /Export/ })

    expect(trigger).toBeDisabled()
    expect(trigger).toHaveAttribute("title", "Apply your changes before downloading this report.")

    await userEvent.click(trigger)

    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument()
  })

  it("WhileExporting_NeitherScopeCanBeChosenAgain", async () => {
    render(
      <ChakraProvider value={system}>
        <ReportExportMenu pageRowCount={1} totalRowCount={1} isExporting onExport={vi.fn()} />
      </ChakraProvider>,
    )

    await chooseFormat("CSV")

    const choices = await screen.findAllByRole("button", { name: /Preparing/ })

    expect(choices).toHaveLength(2)
    choices.forEach((choice) => expect(choice).toBeDisabled())
  })
})
