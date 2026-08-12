import { Button } from "@chakra-ui/react"
import { ArrowLeft } from "lucide-react"

interface BackToInvoicesButtonProps {
  onBack: () => void
  /** "onBrand" is for the dark invoice header; "default" for the plain surfaces around it. */
  tone?: "onBrand" | "default"
}

export function BackToInvoicesButton({ onBack, tone = "default" }: BackToInvoicesButtonProps) {
  const isOnBrand = tone === "onBrand"

  return (
    <Button
      variant={isOnBrand ? "ghost" : "outline"}
      color={isOnBrand ? "whiteAlpha.900" : undefined}
      borderRadius="14px"
      minH="11"
      px={isOnBrand ? 3 : 4}
      w={{ base: "full", md: "auto" }}
      alignSelf="flex-start"
      cursor="pointer"
      _hover={isOnBrand ? { bg: "whiteAlpha.200" } : undefined}
      onClick={onBack}
    >
      <ArrowLeft size={16} />
      Back to invoices
    </Button>
  )
}
