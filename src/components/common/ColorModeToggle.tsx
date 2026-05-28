import { useState, useEffect } from "react"
import { IconButton } from "@chakra-ui/react"
import { Sun, Moon } from "lucide-react"

function getInitial(): "light" | "dark" {
  try {
    const stored = localStorage.getItem("ideali-color-mode") as "light" | "dark" | null
    if (stored) return stored
  } catch {}
  return "light"
}

export function ColorModeToggle() {
  const [mode, setMode] = useState<"light" | "dark">(getInitial)

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode)
    localStorage.setItem("ideali-color-mode", mode)
  }, [mode])

  // Set on mount
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", getInitial())
  }, [])

  return (
    <IconButton
      aria-label="Toggle color mode"
      variant="ghost"
      size="sm"
      onClick={() => setMode((p) => (p === "light" ? "dark" : "light"))}
      borderRadius="12px"
      color="gray.500"
      _hover={{ bg: "gray.100", _dark: { bg: "navy.700" }, color: "brand.500" }}
    >
      {mode === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </IconButton>
  )
}
