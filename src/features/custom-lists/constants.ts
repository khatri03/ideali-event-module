export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0]

/** Caps table height so a large page size scrolls inside the table instead of stretching the page. */
export const TABLE_MAX_HEIGHT = { base: "60vh", md: "520px" } as const

/** Shorter cap for the picker, which already sits inside a dialog with its own scroll region. */
export const PICKER_TABLE_MAX_HEIGHT = { base: "45vh", md: "360px" } as const

/** Keeps the column headers visible while the rows scroll. */
export const STICKY_HEADER_CSS = (headerBg: string) => ({
  "& thead th": {
    position: "sticky" as const,
    top: 0,
    zIndex: 1,
    bg: headerBg,
  },
})
