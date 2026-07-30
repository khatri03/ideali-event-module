import { describe, expect, it } from "vitest"
import { parseRichText, type RichTextNode } from "@/utils/richText"

/** Flattens the tree to the text a buyer would end up seeing. */
function toText(nodes: RichTextNode[]): string {
  return nodes
    .map((node) => (node.kind === "text" ? node.value : toText(node.children)))
    .join("")
}

function findTag(nodes: RichTextNode[], tag: string): Extract<RichTextNode, { kind: "element" }> | null {
  for (const node of nodes) {
    if (node.kind !== "element") continue
    if (node.tag === tag) return node

    const match = findTag(node.children, tag)
    if (match) return match
  }
  return null
}

describe("parseRichText", () => {
  it("Parse_EmptyMarkup_ReturnsNoNodes", () => {
    expect(parseRichText("")).toEqual([])
    expect(parseRichText("   ")).toEqual([])
  })

  it("Parse_FormattingMarkup_IsPreserved", () => {
    const nodes = parseRichText("<p>Doors open at <strong>6pm</strong></p><ul><li>Dinner</li></ul>")

    expect(findTag(nodes, "strong")).not.toBeNull()
    expect(findTag(nodes, "li")).not.toBeNull()
    expect(toText(nodes)).toBe("Doors open at 6pmDinner")
  })

  it("Parse_ScriptTag_DropsTagAndItsContent", () => {
    const nodes = parseRichText("<p>Safe</p><script>window.alert(1)</script>")

    expect(findTag(nodes, "script")).toBeNull()
    expect(toText(nodes)).toBe("Safe")
  })

  it("Parse_EventHandlerAttribute_IsStripped", () => {
    const nodes = parseRichText('<a href="https://example.com" onclick="steal()">Tickets</a>')
    const anchor = findTag(nodes, "a")

    expect(anchor?.attributes).toEqual({ href: "https://example.com" })
  })

  it("Parse_JavascriptUrl_DropsTheHref", () => {
    const anchor = findTag(parseRichText('<a href="javascript:alert(1)">Click</a>'), "a")

    expect(anchor).not.toBeNull()
    expect(anchor?.attributes.href).toBeUndefined()
    expect(toText([anchor as RichTextNode])).toBe("Click")
  })

  it("Parse_ObfuscatedJavascriptUrl_DropsTheHref", () => {
    const anchor = findTag(parseRichText('<a href="java\tscript:alert(1)">Click</a>'), "a")

    expect(anchor?.attributes.href).toBeUndefined()
  })

  it("Parse_DataUrlImage_DropsTheSource", () => {
    const image = findTag(parseRichText('<img src="data:text/html,<script>alert(1)</script>" alt="x">'), "img")

    expect(image?.attributes.src).toBeUndefined()
    expect(image?.attributes.alt).toBe("x")
  })

  it("Parse_SafeUrls_AreKept", () => {
    expect(findTag(parseRichText('<a href="https://example.com">a</a>'), "a")?.attributes.href).toBe(
      "https://example.com",
    )
    expect(findTag(parseRichText('<a href="mailto:box@example.com">a</a>'), "a")?.attributes.href).toBe(
      "mailto:box@example.com",
    )
    expect(findTag(parseRichText('<a href="/events/123">a</a>'), "a")?.attributes.href).toBe("/events/123")
  })

  it("Parse_IframeAndStyle_AreRemovedEntirely", () => {
    const nodes = parseRichText("<style>body{display:none}</style><iframe></iframe><p>Body</p>")

    expect(findTag(nodes, "iframe")).toBeNull()
    expect(findTag(nodes, "style")).toBeNull()
    expect(toText(nodes)).toBe("Body")
  })

  it("Parse_UnknownTag_UnwrapsToItsContent", () => {
    const nodes = parseRichText("<section><p>Kept</p></section>")

    expect(findTag(nodes, "p")).not.toBeNull()
    expect(toText(nodes)).toBe("Kept")
  })

  it("Parse_TableMarkup_KeepsSpanAttributes", () => {
    const cell = findTag(parseRichText('<table><tr><td colspan="2">Seat</td></tr></table>'), "td")

    expect(cell?.attributes).toEqual({ colspan: "2" })
  })
})
