import { beforeEach, describe, expect, it, vi } from "vitest"
import { ServiceResponseError } from "./serviceResponse"
import { deleteSeatsIoChartCategory } from "./seatsio"

const { deleteMock } = vi.hoisted(() => ({ deleteMock: vi.fn() }))

vi.mock("./client", () => ({ client: { delete: deleteMock } }))

const CHART_UNIQUE_ID = "7a6c857d-ca04-4abe-a812-895496c8bea9"
const CATEGORY_UNIQUE_ID = "6bb2f0f8-8f7e-4b6c-9a4e-2f3c1d0e5a71"
const CATEGORY_IN_USE_MESSAGE = "This category can't be deleted because it is assigned to objects."

beforeEach(() => {
  deleteMock.mockReset()
})

describe("deleteSeatsIoChartCategory", () => {
  /**
   * The API refuses a category still drawn against seats with a 200 whose envelope says it failed. Reading
   * only the status would close the dialog and drop the category from the screen while Seats.io still holds
   * it, so the organizer would believe a deletion happened that never did.
   */
  it("raises the refusal carried in a 200 response body", async () => {
    deleteMock.mockResolvedValue({ data: { success: false, message: CATEGORY_IN_USE_MESSAGE } })

    await expect(deleteSeatsIoChartCategory(CHART_UNIQUE_ID, CATEGORY_UNIQUE_ID)).rejects.toThrow(
      ServiceResponseError,
    )
    await expect(deleteSeatsIoChartCategory(CHART_UNIQUE_ID, CATEGORY_UNIQUE_ID)).rejects.toThrow(
      CATEGORY_IN_USE_MESSAGE,
    )
  })

  /**
   * A refusal that arrives without a message still has to say something a person can read. An empty dialog
   * leaves the organizer with a delete that visibly did nothing and no reason given.
   */
  it("falls back to a readable message when the refusal carries none", async () => {
    deleteMock.mockResolvedValue({ data: { success: false, message: "   " } })

    await expect(deleteSeatsIoChartCategory(CHART_UNIQUE_ID, CATEGORY_UNIQUE_ID)).rejects.toThrow(
      "Failed to delete the category.",
    )
  })

  /** A category nothing is drawn against is deleted, and the call resolves against the category's own route. */
  it("resolves and addresses the category route when the delete succeeds", async () => {
    deleteMock.mockResolvedValue({ data: { success: true, message: null, data: null } })

    await expect(deleteSeatsIoChartCategory(CHART_UNIQUE_ID, CATEGORY_UNIQUE_ID)).resolves.toBeUndefined()

    expect(deleteMock).toHaveBeenCalledWith(
      expect.stringContaining(CATEGORY_UNIQUE_ID) as unknown as string,
    )
  })

  /**
   * Older endpoints answer a delete with no body at all. Treating that silence as a failure would break a
   * working path, so only an envelope that explicitly reports failure raises.
   */
  it("treats an empty response body as success", async () => {
    deleteMock.mockResolvedValue({ data: "" })

    await expect(deleteSeatsIoChartCategory(CHART_UNIQUE_ID, CATEGORY_UNIQUE_ID)).resolves.toBeUndefined()
  })
})
