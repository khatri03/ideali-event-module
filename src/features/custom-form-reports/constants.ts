export { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/components/common"

/** Caps the results height so a large page scrolls inside the table instead of stretching the page. */
export const REPORT_TABLE_MAX_HEIGHT = { base: "60vh", md: "560px" } as const

/** Sentinel for the "work without a saved template" choice, since a select option cannot hold an empty value. */
export const NO_TEMPLATE_VALUE = "none"
