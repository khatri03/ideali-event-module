import { Button, Menu, Portal, Text } from "@chakra-ui/react"
import { Eye, MoreHorizontal, Send } from "lucide-react"
import type { EventInvoiceListItem } from "@/api/eventInvoices"
import { canResendInvoiceTickets } from "../utils/invoiceRowActions"

interface EventInvoiceRowActionsMenuProps {
  invoice: EventInvoiceListItem
  onOpenDetail: (invoice: EventInvoiceListItem) => void
  onResendTickets: (invoice: EventInvoiceListItem) => void
}

const ITEM_STYLE = {
  borderRadius: "10px",
  fontSize: "sm",
  fontWeight: "600",
  color: "text.secondary",
  px: 3,
  py: 2,
  gap: 2.5,
  cursor: "pointer",
} as const

export function EventInvoiceRowActionsMenu({ invoice, onOpenDetail, onResendTickets }: EventInvoiceRowActionsMenuProps) {
  return (
    <Menu.Root positioning={{ placement: "bottom-start" }}>
      <Menu.Trigger asChild>
        <Button
          variant="outline"
          w="10"
          h="10"
          minW="10"
          minH="10"
          p={0}
          borderRadius="full"
          borderColor="border.subtle"
          bg="card.bg"
          color="text.secondary"
          cursor="pointer"
          aria-label={`Actions for invoice ${invoice.invoiceNo}`}
          title="Actions"
        >
          <MoreHorizontal size={16} />
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content
            minW="12rem"
            borderRadius="16px"
            border="1px solid"
            borderColor="border.subtle"
            boxShadow="0 16px 40px rgba(15, 23, 42, 0.12)"
            p={1.5}
            bg="card.bg"
            _dark={{ bg: "navy.800", borderColor: "whiteAlpha.200" }}
          >
            <Menu.Item
              value="view-invoice"
              {...ITEM_STYLE}
              _hover={{ bg: "app.bg" }}
              onClick={() => onOpenDetail(invoice)}
            >
              <Eye size={14} />
              <Text as="span" flex="1" textAlign="left">
                View
              </Text>
            </Menu.Item>

            {canResendInvoiceTickets(invoice) ? (
              <Menu.Item
                value="resend-tickets"
                {...ITEM_STYLE}
                  _hover={{ bg: "app.bg" }}
                onClick={() => onResendTickets(invoice)}
              >
                <Send size={14} />
                <Text as="span" flex="1" textAlign="left">
                  Resend Tickets
                </Text>
              </Menu.Item>
            ) : null}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
