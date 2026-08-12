import { useState } from "react"
import { Box, Button, Heading, SimpleGrid, Stack, Text } from "@chakra-ui/react"
import { Ban, CheckCircle2 } from "lucide-react"
import { ConfirmDialog } from "@/features/custom-lists"
import { extractApiError } from "@/utils/errors"
import { useCancelEventInvoice, useMarkEventInvoiceAsPaid } from "../hooks/useEventInvoices"

type SettlementAction = "mark-paid" | "cancel"

interface EventInvoiceSettlementActionsProps {
  invoiceUniqueId: string
  invoiceNo: string
  /** Server-decided, never inferred from the signed-in role - the endpoints enforce the same rule. */
  canMarkAsPaid: boolean
  canCancel: boolean
}

export function EventInvoiceSettlementActions({
  invoiceUniqueId,
  invoiceNo,
  canMarkAsPaid,
  canCancel,
}: EventInvoiceSettlementActionsProps) {
  const [pendingAction, setPendingAction] = useState<SettlementAction | null>(null)
  const markPaidMutation = useMarkEventInvoiceAsPaid(invoiceUniqueId)
  const cancelMutation = useCancelEventInvoice(invoiceUniqueId)

  if (!canMarkAsPaid && !canCancel) {
    return null
  }

  const activeMutation = pendingAction === "cancel" ? cancelMutation : markPaidMutation

  const handleConfirm = async () => {
    try {
      await activeMutation.mutateAsync()
      setPendingAction(null)
    } catch {
      // Kept open so the dialog's own error banner stays on screen with the failed action in view.
    }
  }

  return (
    <Box
      border="1px solid"
      borderColor="border.subtle"
      borderRadius="20px"
      bg="card.bg"
      boxShadow="card"
      p={{ base: 4, md: 6 }}
    >
      <Stack gap={1} mb={4}>
        <Heading fontSize="lg" fontWeight="800" color="gray.900">
          Settle this order
        </Heading>
        <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">
          This order is still awaiting payment. Record the money as received, or call the order off.
        </Text>
      </Stack>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} maxW={{ md: "520px" }}>
        {canMarkAsPaid ? (
          <Button
            colorPalette="green"
            borderRadius="14px"
            minH="11"
            px={5}
            w="full"
            cursor="pointer"
            onClick={() => setPendingAction("mark-paid")}
          >
            <CheckCircle2 size={16} />
            Mark as paid
          </Button>
        ) : null}

        {canCancel ? (
          <Button
            variant="outline"
            colorPalette="red"
            borderRadius="14px"
            minH="11"
            px={5}
            w="full"
            cursor="pointer"
            onClick={() => setPendingAction("cancel")}
          >
            <Ban size={16} />
            Mark as cancelled
          </Button>
        ) : null}
      </SimpleGrid>

      {pendingAction ? (
        <ConfirmDialog
          title={pendingAction === "cancel" ? "Cancel this order" : "Mark this order as paid"}
          description={
            pendingAction === "cancel" ? (
              <Text>
                Order <strong>{invoiceNo}</strong> will be closed unpaid, the seats it holds released, and
                the buyer emailed. Its tickets can no longer be sent out. This cannot be undone.
              </Text>
            ) : (
              <Text>
                Order <strong>{invoiceNo}</strong> will be recorded as paid in full, the buyer emailed, and
                any tickets it is owed issued and delivered. This cannot be undone.
              </Text>
            )
          }
          confirmLabel={pendingAction === "cancel" ? "Cancel order" : "Mark as paid"}
          loadingLabel={pendingAction === "cancel" ? "Cancelling..." : "Settling..."}
          tone={pendingAction === "cancel" ? "destructive" : "primary"}
          errorMessage={activeMutation.error ? extractApiError(activeMutation.error) : null}
          isPending={activeMutation.isPending}
          onConfirm={handleConfirm}
          onClose={() => setPendingAction(null)}
        />
      ) : null}
    </Box>
  )
}
