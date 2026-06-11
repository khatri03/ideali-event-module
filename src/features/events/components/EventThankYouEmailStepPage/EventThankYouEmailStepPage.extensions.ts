import { Extension, Node } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"
import { createElement, type MouseEvent } from "react"

function normalizePlaceholderToken(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return ""
  }

  if (/^\{\{.+\}\}$/.test(trimmed)) {
    return trimmed
  }

  return `{{${trimmed.replace(/\s+/g, "")}}}`
}

function derivePlaceholderLabel(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return ""
  }

  const normalized = trimmed.replace(/^\{\{|\}\}$/g, "")
  return normalized
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function EventPlaceholderTokenNodeView({ node, selected, deleteNode }: NodeViewProps) {
  const label = node.attrs.label || node.attrs["data-placeholder-label"] || ""
  const backgroundColor = selected ? "#cffafe" : "#ecfeff"
  const borderColor = selected ? "#06b6d4" : "#a5f3fc"
  const textColor = selected ? "#155e75" : "#0e7490"

  const handleDeleteMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const chipStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    borderRadius: "9999px",
    border: `1px solid ${borderColor}`,
    backgroundColor,
    color: textColor,
    padding: "0.25rem 0.75rem",
    fontSize: "0.75rem",
    lineHeight: 1.2,
    verticalAlign: "baseline",
    cursor: "pointer",
    boxShadow: selected ? "0 0 0 3px rgba(34, 211, 238, 0.18)" : "none",
  } as const

  const buttonStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "1rem",
    height: "1rem",
    border: "none",
    borderRadius: "9999px",
    background: "transparent",
    color: textColor,
    padding: 0,
    marginLeft: "0.125rem",
    fontSize: "0.875rem",
    lineHeight: 1,
  } as const

  return createElement(
    NodeViewWrapper,
    {
      as: "span",
      "data-placeholder-label": label,
      contentEditable: false,
      style: chipStyle,
      title: label,
    },
    createElement("span", null, label),
    createElement(
      "button",
      {
        type: "button",
        onMouseDown: handleDeleteMouseDown,
        onClick: deleteNode,
        style: buttonStyle,
        "aria-label": `Delete ${label}`,
        title: `Delete ${label}`,
      },
      "×",
    ),
  )
}

export const FontSizeExtension = Extension.create({
  name: "fontSize",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => (element as HTMLElement).style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {}
              }

              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },
})

export const LineHeightExtension = Extension.create({
  name: "lineHeight",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => (element as HTMLElement).style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) {
                return {}
              }

              return {
                style: `line-height: ${attributes.lineHeight}`,
              }
            },
          },
        },
      },
    ]
  },
})

export const EventPlaceholderTokenExtension = Node.create({
  name: "eventPlaceholderToken",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      label: {
        default: "",
        parseHTML: (element) =>
          (element as HTMLElement).getAttribute("data-placeholder-label") ||
          derivePlaceholderLabel((element as HTMLElement).getAttribute("data-placeholder-token") || (element as HTMLElement).textContent || ""),
      },
      token: {
        default: "",
        parseHTML: (element) =>
          (element as HTMLElement).getAttribute("data-placeholder-token") ||
          normalizePlaceholderToken((element as HTMLElement).textContent || ""),
      },
      fontSize: {
        default: null,
        parseHTML: (element) => (element as HTMLElement).style.fontSize || null,
      },
      color: {
        default: null,
        parseHTML: (element) => (element as HTMLElement).style.color || null,
      },
      bold: {
        default: false,
        parseHTML: (element) => (element as HTMLElement).style.fontWeight === "700",
      },
      italic: {
        default: false,
        parseHTML: (element) => (element as HTMLElement).style.fontStyle === "italic",
      },
      underline: {
        default: false,
        parseHTML: (element) => (element as HTMLElement).style.textDecoration.includes("underline"),
      },
      strike: {
        default: false,
        parseHTML: (element) => (element as HTMLElement).style.textDecoration.includes("line-through"),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "span[data-placeholder-label], span[data-placeholder-token]",
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const label = HTMLAttributes.label || HTMLAttributes["data-placeholder-label"] || ""
    const token = HTMLAttributes.token || HTMLAttributes["data-placeholder-token"] || normalizePlaceholderToken(label)
    const styles = [
      HTMLAttributes.fontSize ? `font-size: ${HTMLAttributes.fontSize}` : "",
      HTMLAttributes.color ? `color: ${HTMLAttributes.color}` : "",
      HTMLAttributes.bold ? "font-weight: 700" : "",
      HTMLAttributes.italic ? "font-style: italic" : "",
      HTMLAttributes.underline ? "text-decoration: underline" : "",
      HTMLAttributes.strike ? "text-decoration: line-through" : "",
    ]
      .filter(Boolean)
      .join("; ")

    return [
      "span",
      {
        "data-placeholder-label": label,
        "data-placeholder-token": token,
        contenteditable: "false",
        title: label,
        style: styles || undefined,
      },
      token || label,
    ]
  },

  renderText({ node }) {
    return node.attrs.token || node.attrs.label || ""
  },

  addNodeView() {
    return ReactNodeViewRenderer(EventPlaceholderTokenNodeView)
  },
})
