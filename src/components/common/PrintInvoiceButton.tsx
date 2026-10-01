import { Button } from "@chakra-ui/react"
import { Printer } from "lucide-react"

interface PrintInvoiceButtonProps {
  /** "onBrand" is for the dark invoice header; "default" for the plain surfaces around it. */
  tone?: "onBrand" | "default"
}

/**
 * Hands the page to the browser's own print dialog, which is also how a PDF is produced on every desktop
 * platform. The paper layout is the page's print stylesheet, so there is nothing to keep in step here.
 */
export function PrintInvoiceButton({ tone = "default" }: PrintInvoiceButtonProps) {
  const isOnBrand = tone === "onBrand"

  return (
    <Button
      variant={isOnBrand ? "ghost" : "outline"}
      color={isOnBrand ? "whiteAlpha.900" : undefined}
      borderRadius="14px"
      minH="11"
      px={isOnBrand ? 3 : 4}
      w={{ base: "full", sm: "auto" }}
      cursor="pointer"
      _hover={isOnBrand ? { bg: "whiteAlpha.200" } : undefined}
      onClick={() => window.print()}
    >
      <Printer size={16} />
      Print
    </Button>
  )
}
