import { Button, Menu, Portal, Text } from "@chakra-ui/react"
import { Ban, CheckCircle2, Eye, MoreHorizontal, Pencil, Send } from "lucide-react"
import type { EventInvoiceListItem } from "@/api/eventInvoices"

interface EventInvoiceRowActionsMenuProps {
  invoice: EventInvoiceListItem
  onOpenDetail: (invoice: EventInvoiceListItem) => void
  onEdit: (invoice: EventInvoiceListItem) => void
  onMarkPaid: (invoice: EventInvoiceListItem) => void
  onCancel: (invoice: EventInvoiceListItem) => void
  onSend: (invoice: EventInvoiceListItem) => void
}

const ITEM_STYLE = {
  borderRadius: "10px",
  fontSize: "sm",
  fontWeight: "600",
  color: "text.secondary",
  px: 3,
  py: 2,
  minH: "11",
  gap: 2.5,
  cursor: "pointer",
} as const

export function EventInvoiceRowActionsMenu({
  invoice,
  onOpenDetail,
  onEdit,
  onMarkPaid,
  onCancel,
  onSend,
}: EventInvoiceRowActionsMenuProps) {
  return (
    <Menu.Root positioning={{ placement: "bottom-start" }}>
      <Menu.Trigger asChild>
        <Button
          variant="outline"
          w="11"
          h="11"
          minW="11"
          minH="11"
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
            <Menu.Item value="view-invoice" {...ITEM_STYLE} _hover={{ bg: "app.bg" }} onClick={() => onOpenDetail(invoice)}>
              <Eye size={14} />
              <Text as="span" flex="1" textAlign="left">
                View
              </Text>
            </Menu.Item>

            {invoice.canEdit ? (
              <Menu.Item value="edit-invoice" {...ITEM_STYLE} _hover={{ bg: "app.bg" }} onClick={() => onEdit(invoice)}>
                <Pencil size={14} />
                <Text as="span" flex="1" textAlign="left">
                  Edit
                </Text>
              </Menu.Item>
            ) : null}

            {invoice.canMarkAsPaid ? (
              <Menu.Item value="mark-paid" {...ITEM_STYLE} _hover={{ bg: "app.bg" }} onClick={() => onMarkPaid(invoice)}>
                <CheckCircle2 size={14} />
                <Text as="span" flex="1" textAlign="left">
                  Mark as paid
                </Text>
              </Menu.Item>
            ) : null}

            {invoice.canSend && invoice.ticketCount > 0 ? (
              <Menu.Item value="resend-tickets" {...ITEM_STYLE} _hover={{ bg: "app.bg" }} onClick={() => onSend(invoice)}>
                <Send size={14} />
                <Text as="span" flex="1" textAlign="left">
                  Resend tickets
                </Text>
              </Menu.Item>
            ) : null}

            {invoice.canCancel ? (
              <Menu.Item
                value="cancel-invoice"
                {...ITEM_STYLE}
                color="red.600"
                _hover={{ bg: "red.50", color: "red.600" }}
                onClick={() => onCancel(invoice)}
              >
                <Ban size={14} />
                <Text as="span" flex="1" textAlign="left">
                  Cancel invoice
                </Text>
              </Menu.Item>
            ) : null}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
