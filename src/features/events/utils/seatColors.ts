/**
 * The colour every seat the buyer cannot pick is drawn in, on the chart and in the legend beside it.
 *
 * The renderer's own default for those seats is a pale grey that sits close to the chart's background, so a sold
 * seat reads as an empty part of the room rather than as one that is taken. This maroon is dark enough to hold its
 * own against white at WCAG AA and carries no hue any category palette is likely to reach for, which keeps
 * "unavailable" from being mistaken for a price band.
 */
export const UNAVAILABLE_SEAT_COLOR = "#800000"
