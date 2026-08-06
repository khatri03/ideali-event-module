import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const PRESENTATION = "D:/V4Ideas/Ideali/ideali.api/src/Presentation"

function walk(directory, found = []) {
  for (const entry of readdirSync(directory)) {
    if (entry === "bin" || entry === "obj") continue
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) {
      walk(path, found)
      continue
    }
    if (entry.endsWith("Controller.cs")) found.push(path.replace(/\\/g, "/"))
  }
  return found
}

function cleanDoc(parts) {
  return parts
    .join(" ")
    .replace(/<\/?(summary|remarks|para)>/g, " ")
    .replace(/<see cref="[^"]*?([\w]+)"\s*\/>/g, "$1")
    .replace(/<paramref name="([^"]+)"\s*\/>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function docAbove(lines, index) {
  const parts = []
  let cursor = index - 1
  let seenDoc = false

  while (cursor >= 0) {
    const line = lines[cursor].trim()
    if (line.startsWith("///")) {
      seenDoc = true
      parts.unshift(line.replace(/^\/\/\/\s?/, ""))
      cursor--
      continue
    }
    if (!seenDoc && (line.startsWith("[") || line === "" || line.startsWith("//"))) {
      cursor--
      continue
    }
    break
  }

  return cleanDoc(parts)
}

const summaries = {}

for (const file of walk(PRESENTATION)) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/)
  let controller = ""

  for (let index = 0; index < lines.length; index++) {
    const classMatch = lines[index].match(/\bclass\s+(\w*Controller)\b/)
    if (classMatch) {
      controller = classMatch[1]
      const text = docAbove(lines, index)
      if (text) summaries[controller] = text
      continue
    }

    const methodMatch = lines[index].match(
      /^\s*(?:public|internal)\s+(?:async\s+)?(?:virtual\s+|override\s+)?[\w<>,\[\]\?\. ]+?\s+(\w+)\s*\(/
    )
    if (!methodMatch || !controller) continue

    // Walk up past the attribute block to the doc comment.
    let cursor = index
    while (cursor > 0 && lines[cursor - 1].trim().startsWith("[")) cursor--

    const text = docAbove(lines, cursor)
    if (text) summaries[`${controller}::${methodMatch[1]}`] = text
  }
}

writeFileSync(process.argv[2], JSON.stringify(summaries, null, 2))
console.log(`summaries=${Object.keys(summaries).length}`)
