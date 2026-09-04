import type { Region } from "@seatsio/seatsio-types"

/**
 * Regions the Seats.io embeds accept. A workspace reported in any other region cannot be rendered, and the screens
 * say so rather than mounting an embed that fails with nothing on the page to explain it.
 */
export const SUPPORTED_SEATSIO_REGIONS = new Set<Region>(["eu", "na", "sa", "oc"])
