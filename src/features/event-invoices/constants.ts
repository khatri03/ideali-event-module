export { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/components/common"

/** Caps table height so a large page size scrolls inside the table instead of stretching the page. */
export const TABLE_MAX_HEIGHT = { base: "60vh", md: "520px" } as const

/** Keeps the column headers visible while the rows scroll. */
export const STICKY_HEADER_CSS = (headerBg: string) => ({
  "& thead th": {
    position: "sticky" as const,
    top: 0,
    zIndex: 1,
    bg: headerBg,
  },
})
