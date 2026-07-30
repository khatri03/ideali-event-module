import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { Box } from "@chakra-ui/react"

interface AnimatedPaymentMethodBodyProps {
  isOpen: boolean
  children: ReactNode
}

export function AnimatedPaymentMethodBody({ isOpen, children }: AnimatedPaymentMethodBodyProps) {
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [contentHeight, setContentHeight] = useState(0)

  useEffect(() => {
    if (!contentRef.current) return

    // Measure the real content height so auto-collapsing panels animate cleanly.
    setContentHeight(contentRef.current.scrollHeight)
  }, [children, isOpen])

  return (
    <Box
      maxH={isOpen ? `${Math.max(contentHeight, 1)}px` : "0px"}
      opacity={isOpen ? 1 : 0}
      transform={isOpen ? "translateY(0) scaleY(1)" : "translateY(-10px) scaleY(0.98)"}
      transformOrigin="top"
      transition="max-height 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease, transform 360ms cubic-bezier(0.22, 1, 0.36, 1)"
      overflow="hidden"
      pointerEvents={isOpen ? "auto" : "none"}
      willChange="max-height, opacity, transform"
    >
      <Box ref={contentRef}>{children}</Box>
    </Box>
  )
}
