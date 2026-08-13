import { describe, expect, it } from "vitest"
import { AxiosError } from "axios"
import { ServiceResponseError } from "@/api/serviceResponse"
import { extractApiError, httpStatusOf, isNotFoundError } from "./errors"

function httpError(status: number) {
  return new AxiosError("failed", String(status), undefined, undefined, {
    status,
    data: {},
    statusText: "",
    headers: {},
    config: { headers: {} },
  } as never)
}

describe("httpStatusOf", () => {
  it("ServerRespondedWithAStatus_ReportsIt", () => {
    expect(httpStatusOf(httpError(404))).toBe(404)
    expect(httpStatusOf(httpError(500))).toBe(500)
  })

  it("FailureThatNeverReachedTheServer_ReportsNoStatus", () => {
    expect(httpStatusOf(new AxiosError("Network Error"))).toBeNull()
    expect(httpStatusOf(new Error("boom"))).toBeNull()
    expect(httpStatusOf(null)).toBeNull()
  })
})

describe("extractApiError", () => {
  it("ServiceReportedItsOwnFailure_ShowsTheServerWordingToTheOrganizer", () => {
    expect(extractApiError(new ServiceResponseError("A template with that name already exists."))).toBe(
      "A template with that name already exists.",
    )
  })

  it("AnyOtherThrownError_StaysGenericSoInternalsDoNotLeak", () => {
    expect(extractApiError(new Error("Cannot read properties of undefined"))).toBe("An unexpected error occurred.")
  })
})

describe("isNotFoundError", () => {
  it("NotFoundResponse_IsRecognised", () => {
    expect(isNotFoundError(httpError(404))).toBe(true)
  })

  it("AnyOtherFailure_IsNot", () => {
    expect(isNotFoundError(httpError(403))).toBe(false)
    expect(isNotFoundError(httpError(500))).toBe(false)
    expect(isNotFoundError(new Error("boom"))).toBe(false)
  })
})
