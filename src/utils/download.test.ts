import { afterEach, describe, expect, it, vi } from "vitest"
import { saveBlob } from "./download"

const OBJECT_URL = "blob:https://ideali.test/report"

function stubObjectUrl() {
  const createObjectURL = vi.fn().mockReturnValue(OBJECT_URL)
  const revokeObjectURL = vi.fn()

  vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL })

  return { createObjectURL, revokeObjectURL }
}

describe("saveBlob", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("Save_NamedFile_HandsTheBrowserADownloadUnderThatName", () => {
    stubObjectUrl()
    const clicked: HTMLAnchorElement[] = []
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push(this)
      })

    saveBlob(new Blob(["a,b"]), "report.csv")

    expect(click).toHaveBeenCalledOnce()
    expect(clicked[0].download).toBe("report.csv")
    expect(clicked[0].href).toBe(OBJECT_URL)

    click.mockRestore()
  })

  it("Save_AfterTheClick_ReleasesTheObjectUrlSoRepeatedExportsDoNotAccumulate", () => {
    const { revokeObjectURL } = stubObjectUrl()
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})

    saveBlob(new Blob(["a,b"]), "report.csv")

    expect(revokeObjectURL).toHaveBeenCalledWith(OBJECT_URL)
    expect(document.querySelector("a[download]")).toBeNull()

    click.mockRestore()
  })
})
