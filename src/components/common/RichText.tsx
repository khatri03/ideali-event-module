import { createElement, useMemo, type ReactNode } from "react"
import { Box } from "@chakra-ui/react"
import { parseRichText, type RichTextNode } from "@/utils/richText"

/** Tags that must not be given children. */
const VOID_TAGS = new Set(["br", "hr", "img"])

/** HTML attribute names that differ in React. */
const REACT_ATTRIBUTE_NAMES: Record<string, string> = {
  colspan: "colSpan",
  rowspan: "rowSpan",
}

const RICH_TEXT_STYLES = {
  "& p": { mb: 3 },
  "& p:last-child": { mb: 0 },
  "& ul, & ol": { pl: 6, mb: 3 },
  "& ul": { listStyleType: "disc" },
  "& ol": { listStyleType: "decimal" },
  "& li": { mb: 1 },
  "& a": { color: "blue.600", textDecoration: "underline", cursor: "pointer" },
  "& h1, & h2, & h3, & h4, & h5, & h6": { fontWeight: "700", color: "gray.900", mt: 4, mb: 2 },
  "& h1": { fontSize: { base: "lg", md: "xl" } },
  "& h2": { fontSize: { base: "md", md: "lg" } },
  "& img": { maxWidth: "100%", height: "auto", borderRadius: "12px" },
  "& table": { width: "100%", borderCollapse: "collapse", my: 3 },
  "& th, & td": { borderWidth: "1px", borderColor: "gray.200", px: 3, py: 2, textAlign: "left" },
  "& blockquote": { borderLeftWidth: "3px", borderColor: "gray.300", pl: 4, color: "gray.600", my: 3 },
  "& pre": { bg: "gray.50", p: 3, borderRadius: "12px", overflowX: "auto" },
  "& hr": { my: 4, borderColor: "gray.200" },
}

function toReactProps(node: Extract<RichTextNode, { kind: "element" }>): Record<string, string> {
  const props: Record<string, string> = {}
  for (const [name, value] of Object.entries(node.attributes)) {
    props[REACT_ATTRIBUTE_NAMES[name] ?? name] = value
  }

  // Organizer links leave the checkout, so never hand the opener window over with them.
  if (node.tag === "a" && props.href) {
    props.target = "_blank"
    props.rel = "noopener noreferrer"
  }
  return props
}

function renderNode(node: RichTextNode, index: number): ReactNode {
  if (node.kind === "text") return node.value

  const props = { key: index, ...toReactProps(node) }
  if (VOID_TAGS.has(node.tag)) return createElement(node.tag, props)
  return createElement(node.tag, props, node.children.map(renderNode))
}

/**
 * Renders untrusted HTML through an allowlist instead of `dangerouslySetInnerHTML`. Markup outside
 * the allowlist is discarded, so unusual formatting can be lost by design.
 */
export function RichText({ html }: { html: string }) {
  const nodes = useMemo(() => parseRichText(html), [html])

  return (
    <Box color="gray.700" lineHeight="1.75" css={RICH_TEXT_STYLES} overflowX="auto">
      {nodes.map(renderNode)}
    </Box>
  )
}
