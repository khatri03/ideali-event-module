import type { SelectableObject } from "@seatsio/seatsio-react"

/**
 * Popover text for an object on hover. A sold seat reads "Sold" so the organizer sees why it can't be picked; an
 * on-sale-but-withheld object reads "Not for sale". Everything else gets Seats.io's own popover with no extra line.
 */
export function popoverInfoFor(object: SelectableObject): string {
  if ("status" in object && object.status === "booked") return "Sold"
  return "forSale" in object && !object.forSale ? "Not for sale" : ""
}
