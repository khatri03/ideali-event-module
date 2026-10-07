import type { ReactNode } from "react"
import { Button, Menu, Portal, Text } from "@chakra-ui/react"
import { Ban, CheckCircle2, Eye, Mail, MoreHorizontal } from "lucide-react"

interface InvoiceSettlementActionsMenuProps {
  invoiceNo: string
  onView?: () => void
  onMarkPaid?: () => void
  onCancel?: () => void
  onEmailInvoice?: () => void
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
  _hover: { bg: "app.bg" },
} as const

function ActionItem({ value, icon, label, onSelect, isDanger = false }: {
  value: string
  icon: ReactNode
  label: string
  onSelect: () => void
  isDanger?: boolean
}) {
  const dangerStyle = isDanger ? { color: "red.600", _hover: { bg: "red.50", color: "red.600" } } : {}
  return (
    <Menu.Item value={value} {...ITEM_STYLE} {...dangerStyle} onClick={onSelect}>
      {icon}
      <Text as="span" flex="1" textAlign="left">
        {label}
      </Text>
    </Menu.Item>
  )
}

/** The row form of the settlement actions: the same trigger and look as the Event Invoices row menu. */
export function InvoiceSettlementActionsMenu({ invoiceNo, onView, onMarkPaid, onCancel, onEmailInvoice }: InvoiceSettlementActionsMenuProps) {
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
          aria-label={`Actions for invoice ${invoiceNo}`}
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
            {onView ? <ActionItem value="view-invoice" icon={<Eye size={14} />} label="View" onSelect={onView} /> : null}
            {onMarkPaid ? (
              <ActionItem value="mark-paid" icon={<CheckCircle2 size={14} />} label="Mark as paid" onSelect={onMarkPaid} />
            ) : null}
            {onEmailInvoice ? (
              <ActionItem value="email-invoice" icon={<Mail size={14} />} label="Email link" onSelect={onEmailInvoice} />
            ) : null}
            {onCancel ? (
              <ActionItem value="cancel-invoice" icon={<Ban size={14} />} label="Cancel invoice" onSelect={onCancel} isDanger />
            ) : null}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
