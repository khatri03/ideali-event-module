/** Widest grid a custom form is allowed to render in, whatever the organizer authored. */
const MAX_FORM_COLUMNS = 4

/** Organizer-authored column count, coerced into a grid the buyer's viewport can actually hold. */
export function clampFormColumns(value: number | null | undefined) {
  if (!value || value < 1) {
    return 1
  }

  return Math.min(MAX_FORM_COLUMNS, value)
}

/** A field never spans more columns than the form it sits in. */
export function getFieldColumnSpan(fieldColumn: number | null | undefined, formColumn: number | null | undefined) {
  if (!fieldColumn || fieldColumn < 1) {
    return 1
  }

  return Math.min(fieldColumn, clampFormColumns(formColumn))
}
