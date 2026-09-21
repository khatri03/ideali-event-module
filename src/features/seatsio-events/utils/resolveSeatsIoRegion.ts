const SEATS_IO_REGIONS = ["eu", "na", "sa", "oc"] as const

export type SeatsIoRegion = (typeof SEATS_IO_REGIONS)[number]

/** Narrows the region the API sent to one the renderer accepts, falling back to Europe when it is unrecognised. */
export function resolveSeatsIoRegion(region: string): SeatsIoRegion {
  return SEATS_IO_REGIONS.includes(region as SeatsIoRegion) ? (region as SeatsIoRegion) : "eu"
}
