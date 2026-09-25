import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/theme"
import { TablePagination } from "./TablePagination"

function renderPagination(props: Partial<Parameters<typeof TablePagination>[0]> = {}) {
  return render(
    <ChakraProvider value={system}>
      <TablePagination
        page={1}
        pageSize={10}
        totalPages={0}
        total={0}
        itemLabel="category"
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        {...props}
      />
    </ChakraProvider>,
  )
}

describe("TablePagination", () => {
  it("IrregularPlural_UsesTheSuppliedPluralNotSingularPlusS", () => {
    // A noun whose plural is not "+s" ("category" -> "categories") must never render as "categorys".
    renderPagination({ itemLabelPlural: "categories" })

    expect(screen.getByText("No categories")).toBeInTheDocument()
    expect(screen.getByLabelText("categories per page")).toBeInTheDocument()
    expect(screen.queryByText("No categorys")).not.toBeInTheDocument()
  })

  it("RegularPlural_FallsBackToSingularPlusSWhenNoPluralGiven", () => {
    // Callers with a regular plural need not pass one; the "+s" fallback still holds.
    renderPagination({ itemLabel: "member" })

    expect(screen.getByText("No members")).toBeInTheDocument()
    expect(screen.getByLabelText("members per page")).toBeInTheDocument()
  })

  it("NonEmptyPage_ShowsTheRangeInsteadOfTheEmptyLabel", () => {
    renderPagination({ total: 3, totalPages: 1, itemLabelPlural: "categories" })

    expect(screen.getByText("1–3 of 3")).toBeInTheDocument()
    expect(screen.queryByText("No categories")).not.toBeInTheDocument()
  })
})
