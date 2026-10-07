import { Button } from "@chakra-ui/react"
import { Plus } from "lucide-react"
import { Link as RouterLink } from "react-router-dom"
import type { CustomInvoiceModule } from "@/api/customInvoices"
import { APP_ROUTES } from "@/utils/routes"

interface NewCustomInvoiceButtonProps {
  /** Present only when the list is locked; the editor then opens with this module preset and locked (D-11). */
  lockedModule?: CustomInvoiceModule
}

export function NewCustomInvoiceButton({ lockedModule }: NewCustomInvoiceButtonProps) {
  const target = lockedModule ? APP_ROUTES.customInvoices.newForModule(lockedModule) : APP_ROUTES.customInvoices.new

  return (
    <Button
      asChild
      w={{ base: "full", md: "auto" }}
      minH="11"
      px={6}
      borderRadius="14px"
      fontWeight="700"
      bg="linear-gradient(135deg, #7551FF 0%, #422AFB 100%)"
      color="white"
      cursor="pointer"
    >
      <RouterLink to={target}>
        <Plus size={16} />
        New Invoice
      </RouterLink>
    </Button>
  )
}
