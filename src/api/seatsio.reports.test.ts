import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  fetchSeatsIoEventChannels,
  fetchSeatsIoEventForSale,
  fetchSeatsIoEventRenderContext,
  fetchSeatsIoEventStatusChanges,
  fetchSeatsIoEventSummary,
  fetchSeatsIoEventTables,
} from "./seatsio"

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock("./client", () => ({ client: { get: getMock } }))

const EVENT_UNIQUE_ID = "7a6c857d-ca04-4abe-a812-895496c8bea9"

beforeEach(() => {
  getMock.mockReset()
})

describe("fetchSeatsIoEventSummary", () => {
  /** The summary reads its totals and both breakdowns out of the service-response envelope, camelCase or Pascal. */
  it("maps totals and grouped breakdowns from the response envelope", async () => {
    getMock.mockResolvedValue({
      data: {
        Data: {
          totalObjects: 3,
          byStatus: [
            { key: "booked", label: "Booked", count: 2 },
            { key: "free", label: "Free", count: 1 },
          ],
          byCategory: [{ key: "Stalls", label: "Stalls", count: 2 }],
        },
      },
    })

    const summary = await fetchSeatsIoEventSummary(EVENT_UNIQUE_ID)

    expect(summary.totalObjects).toBe(3)
    expect(summary.byStatus.map((group) => group.label)).toEqual(["Booked", "Free"])
    expect(summary.byCategory[0]).toEqual({ key: "Stalls", label: "Stalls", count: 2 })
  })

  /** A missing payload degrades to an empty summary rather than throwing and blanking the tab. */
  it("returns an empty summary when the envelope carries no data", async () => {
    getMock.mockResolvedValue({ data: { Data: null } })

    const summary = await fetchSeatsIoEventSummary(EVENT_UNIQUE_ID)

    expect(summary.totalObjects).toBe(0)
    expect(summary.byStatus).toEqual([])
  })
})

describe("fetchSeatsIoEventRenderContext", () => {
  /** The render context reads the keys, region and display names from the envelope, camelCase or Pascal. */
  it("maps the keys, region and display names from the response envelope", async () => {
    getMock.mockResolvedValue({
      data: {
        Data: {
          EventKey: "event-1",
          PublicKey: "pk-workspace",
          Region: "na",
          EventLabel: "CME 2026",
          ChartName: "Court Room",
        },
      },
    })

    const context = await fetchSeatsIoEventRenderContext(EVENT_UNIQUE_ID)

    expect(context).toEqual({
      eventKey: "event-1",
      publicKey: "pk-workspace",
      region: "na",
      eventLabel: "CME 2026",
      chartName: "Court Room",
    })
  })

  /** A missing payload degrades to empty fields, which the preview reads as "no map" rather than throwing. */
  it("returns empty fields when the envelope carries no data", async () => {
    getMock.mockResolvedValue({ data: { Data: null } })

    const context = await fetchSeatsIoEventRenderContext(EVENT_UNIQUE_ID)

    expect(context).toEqual({ eventKey: "", publicKey: "", region: "", eventLabel: "", chartName: "" })
  })
})

describe("fetchSeatsIoEventForSale", () => {
  /** An event with no restriction is reported as everything-for-sale, not as an empty selection. */
  it("flags everything for sale when the configuration is absent", async () => {
    getMock.mockResolvedValue({ data: { Data: { everythingForSale: true, objects: [], categories: [] } } })

    const report = await fetchSeatsIoEventForSale(EVENT_UNIQUE_ID)

    expect(report.everythingForSale).toBe(true)
    expect(report.objects).toEqual([])
  })
})

describe("fetchSeatsIoEventChannels", () => {
  /** Channels come from the event, not a report: each row carries its name, colour and object count. */
  it("maps each channel with its colour and object count", async () => {
    getMock.mockResolvedValue({
      data: {
        Data: [
          { key: "vip", name: "VIP", color: "#aaaaaa", objectCount: 2 },
          { key: "press", name: "Press", color: "#bbbbbb", objectCount: 1 },
        ],
      },
    })

    const channels = await fetchSeatsIoEventChannels(EVENT_UNIQUE_ID)

    expect(channels).toHaveLength(2)
    expect(channels[0]).toEqual({ key: "vip", name: "VIP", color: "#aaaaaa", objectCount: 2 })
  })

  /** An event with no channels yields an empty list, which the channels tab reads as "none created yet". */
  it("returns an empty list when the event defines no channels", async () => {
    getMock.mockResolvedValue({ data: { Data: [] } })

    const channels = await fetchSeatsIoEventChannels(EVENT_UNIQUE_ID)

    expect(channels).toEqual([])
  })
})

describe("fetchSeatsIoEventTables", () => {
  /** Table booking is read as a mode plus per-table types, not as an object-type count. */
  it("maps the booking mode and each table's booking type", async () => {
    getMock.mockResolvedValue({
      data: {
        Data: {
          mode: "CUSTOM",
          modeLabel: "Custom per table",
          inheritsChartSettings: false,
          tables: [{ label: "T1", bookingType: "Booked as a whole" }],
        },
      },
    })

    const report = await fetchSeatsIoEventTables(EVENT_UNIQUE_ID)

    expect(report.mode).toBe("CUSTOM")
    expect(report.inheritsChartSettings).toBe(false)
    expect(report.tables[0]).toEqual({ label: "T1", bookingType: "Booked as a whole" })
  })

  /** An event with no override reads as inheriting the chart's settings, with no per-table rows. */
  it("reports inherited settings with an empty table list", async () => {
    getMock.mockResolvedValue({
      data: { Data: { mode: "INHERIT", modeLabel: "Inherited from chart", inheritsChartSettings: true, tables: [] } },
    })

    const report = await fetchSeatsIoEventTables(EVENT_UNIQUE_ID)

    expect(report.inheritsChartSettings).toBe(true)
    expect(report.tables).toEqual([])
  })
})

describe("fetchSeatsIoEventStatusChanges", () => {
  /** The cursor a caller passes travels as the startAfterId query param, and the next cursor comes back mapped. */
  it("sends the cursor and returns the next one", async () => {
    getMock.mockResolvedValue({
      data: {
        Data: {
          items: [
            {
              objectLabel: "A-1",
              status: "Booked",
              quantity: 1,
              holdToken: "tok-1",
              orderId: "ord-9",
              origin: "API call - 100.51.215.8",
              dateUtc: "2026-09-10T10:00:00Z",
            },
          ],
          nextPageStartsAfter: 999,
        },
      },
    })

    const page = await fetchSeatsIoEventStatusChanges(EVENT_UNIQUE_ID, 12)

    expect(getMock).toHaveBeenCalledWith(
      expect.stringContaining(EVENT_UNIQUE_ID) as unknown as string,
      { params: { startAfterId: 12 } },
    )
    expect(page.items[0].objectLabel).toBe("A-1")
    expect(page.items[0].holdToken).toBe("tok-1")
    expect(page.items[0].origin).toBe("API call - 100.51.215.8")
    expect(page.nextPageStartsAfter).toBe(999)
  })

  /** With no cursor the first page is requested without a param, and a last page reports no next cursor. */
  it("omits the param on the first page and maps a null cursor", async () => {
    getMock.mockResolvedValue({ data: { Data: { items: [], nextPageStartsAfter: null } } })

    const page = await fetchSeatsIoEventStatusChanges(EVENT_UNIQUE_ID)

    expect(getMock).toHaveBeenCalledWith(
      expect.stringContaining(EVENT_UNIQUE_ID) as unknown as string,
      { params: undefined },
    )
    expect(page.nextPageStartsAfter).toBeNull()
  })
})
