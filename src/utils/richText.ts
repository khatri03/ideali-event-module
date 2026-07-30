/**
 * Turns organizer-authored HTML into an allowlisted node tree.
 *
 * Organizer descriptions and policy documents arrive as raw markup and are shown to every buyer,
 * so the markup is treated as untrusted. Only the tags and attributes listed here survive; anything
 * else is either dropped with its content or unwrapped down to its text.
 */

const ALLOWED_TAGS = [
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
] as const

export type RichTextTag = (typeof ALLOWED_TAGS)[number]

export type RichTextNode =
  | { kind: "text"; value: string }
  | { kind: "element"; tag: RichTextTag; attributes: Record<string, string>; children: RichTextNode[] }

const allowedTags = new Set<string>(ALLOWED_TAGS)

/** Attributes kept per tag. Reading only these names is what keeps `on*` handlers out. */
const ALLOWED_ATTRIBUTES: Partial<Record<RichTextTag, readonly string[]>> = {
  a: ["href", "title"],
  img: ["src", "alt"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan"],
}

/** Tags removed together with everything inside them. */
const DROPPED_TAGS = new Set([
  "applet",
  "audio",
  "base",
  "button",
  "embed",
  "form",
  "frame",
  "frameset",
  "iframe",
  "input",
  "link",
  "math",
  "meta",
  "noscript",
  "object",
  "script",
  "select",
  "source",
  "style",
  "svg",
  "template",
  "textarea",
  "video",
])

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"])

/** Relative URLs resolve against this throwaway base purely so the protocol can be read. */
const URL_RESOLUTION_BASE = "https://resolve.invalid"

/** Whitespace and control characters, which browsers ignore inside a protocol. */
const LAST_IGNORED_URL_CODE_POINT = 0x20

function stripIgnoredCharacters(value: string): string {
  return Array.from(value)
    .filter((character) => (character.codePointAt(0) ?? 0) > LAST_IGNORED_URL_CODE_POINT)
    .join("")
}

function isSafeUrl(value: string): boolean {
  // Stripped first so "java\tscript:alert(1)" cannot reach the parser looking like a safe protocol.
  const candidate = stripIgnoredCharacters(value)
  if (candidate.length === 0) return false

  try {
    return SAFE_PROTOCOLS.has(new URL(candidate, URL_RESOLUTION_BASE).protocol)
  } catch {
    return false
  }
}

function isUrlAttribute(name: string): boolean {
  return name === "href" || name === "src"
}

function sanitizeAttributes(element: Element, tag: RichTextTag): Record<string, string> {
  const allowed = ALLOWED_ATTRIBUTES[tag]
  if (!allowed) return {}

  const attributes: Record<string, string> = {}
  for (const name of allowed) {
    const value = element.getAttribute(name)
    if (value === null) continue
    if (isUrlAttribute(name) && !isSafeUrl(value)) continue
    attributes[name] = value
  }
  return attributes
}

function convertChildren(node: Node): RichTextNode[] {
  return Array.from(node.childNodes).flatMap(convertNode)
}

function convertNode(node: Node): RichTextNode[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.nodeValue ?? ""
    return value.length > 0 ? [{ kind: "text", value }] : []
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return []

  const element = node as Element
  const tag = element.tagName.toLowerCase()
  if (DROPPED_TAGS.has(tag)) return []

  const children = convertChildren(element)
  if (!allowedTags.has(tag)) return children

  const allowedTag = tag as RichTextTag
  return [{ kind: "element", tag: allowedTag, attributes: sanitizeAttributes(element, allowedTag), children }]
}

/**
 * Parses untrusted HTML into renderable nodes. `DOMParser` builds an inert document, so nothing in
 * the markup runs while it is being inspected.
 */
export function parseRichText(html: string): RichTextNode[] {
  if (html.trim().length === 0) return []
  return convertChildren(new DOMParser().parseFromString(html, "text/html").body)
}
