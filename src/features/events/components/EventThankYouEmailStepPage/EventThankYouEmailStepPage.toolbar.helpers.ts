import type { Editor } from "@tiptap/react"
import { NodeSelection } from "@tiptap/pm/state"

export type PlaceholderTokenSelectionAttrs = {
  label?: string
  fontSize?: string | null
  color?: string | null
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
}

export function getSelectedPlaceholderTokenAttrs(editor: Editor | null): PlaceholderTokenSelectionAttrs | null {
  const selection = editor?.state.selection
  if (!editor || !(selection instanceof NodeSelection)) {
    return null
  }

  if (selection.node.type.name !== "eventPlaceholderToken") {
    return null
  }

  return selection.node.attrs as PlaceholderTokenSelectionAttrs
}

export function updateSelectedPlaceholderToken(editor: Editor | null, nextAttrs: Partial<PlaceholderTokenSelectionAttrs>): boolean {
  if (!editor) {
    return false
  }

  const attrs = getSelectedPlaceholderTokenAttrs(editor)
  if (!attrs) {
    return false
  }

  editor.chain().focus().updateAttributes("eventPlaceholderToken", { ...attrs, ...nextAttrs }).run()
  return true
}

export function toggleSelectedPlaceholderTokenAttr(
  editor: Editor | null,
  attrName: keyof Pick<PlaceholderTokenSelectionAttrs, "bold" | "italic" | "underline" | "strike">,
): boolean {
  const attrs = getSelectedPlaceholderTokenAttrs(editor)
  if (!attrs) {
    return false
  }

  updateSelectedPlaceholderToken(editor, { [attrName]: !attrs[attrName] } as Partial<PlaceholderTokenSelectionAttrs>)
  return true
}

export function isSelectedPlaceholderFormatted(
  editor: Editor | null,
  attrName: keyof Pick<PlaceholderTokenSelectionAttrs, "bold" | "italic" | "underline" | "strike">,
): boolean {
  return Boolean(getSelectedPlaceholderTokenAttrs(editor)?.[attrName])
}

export function getPlaceholderLabel(value: string): string {
  return value
    .replace(/[{}]/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}
