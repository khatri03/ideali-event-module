import { useCallback, useEffect } from "react"
import { Box, Container, Stack } from "@chakra-ui/react"
import { useLocation, useParams, useSearchParams } from "react-router-dom"
import {
  OrderCompletionActions,
  OrderConfirmationSkeleton,
  OrderInvoiceBreakdown,
  OrderNotFoundCard,
  OrderProcessingActions,
  OrderStateHeader,
  OrderSummaryCard,
  OrderTicketList,
} from "@/features/events/components/order"
import { useEventOrderStatus } from "@/features/events/hooks/useEventOrderStatus"
import { useOrderCheckoutHandoff } from "@/features/events/hooks/useOrderCheckoutHandoff"
import { useOrderCompletionActions } from "@/features/events/hooks/useOrderCompletionActions"
import { clearPendingOrderId } from "@/features/events/utils/registrationOrderCookie"
import { APP_ROUTES } from "@/utils/routes"

/** Carries the cart forward from a redirecting payment method so the confirm fast-path can still run. */
const CART_HANDOFF_PARAM = "cart"

/** Left by the wizard so a buyer who wants a second purchase is sent back to the right event. */
interface OrderLocationState {
  registerPath?: string
}

/**
 * Where every completed registration lands, whether the card settled in place or the buyer came back
 * through a bank redirect. Public and reachable only with the order id, so it survives a refresh, a
 * shared link and a phone that died mid-payment.
 */
export function EventOrderConfirmationPage() {
  const { orderUniqueId = "" } = useParams<{ orderUniqueId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { order, isLoading, isError, isRechecking, hasPollWindowElapsed, recheck } = useEventOrderStatus(orderUniqueId)

  const handoffCartUniqueId = searchParams.get(CART_HANDOFF_PARAM)

  const handleHandoffCompleted = useCallback(() => {
    void recheck()
  }, [recheck])

  const { isHandingOff } = useOrderCheckoutHandoff(handoffCartUniqueId, handleHandoffCompleted)

  // The order itself is the reliable source: a shared link, a refresh and the return leg of a bank
  // redirect all arrive with no router state, and the wizard's hint only survives an in-app navigation.
  const { state } = useLocation()
  const registerPath = order?.eventUniqueId
    ? APP_ROUTES.eventRegister(order.eventUniqueId)
    : ((state as OrderLocationState | null)?.registerPath ?? null)
  const completion = useOrderCompletionActions(registerPath)

  // The buyer made it here, so the in-flight marker the wizard left behind has done its job.
  useEffect(() => {
    clearPendingOrderId()
  }, [])

  // The cart id has done its job and has no business staying in a link the buyer may share.
  useEffect(() => {
    if (isHandingOff || !handoffCartUniqueId) return

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete(CART_HANDOFF_PARAM)
    setSearchParams(nextParams, { replace: true })
  }, [handoffCartUniqueId, isHandingOff, searchParams, setSearchParams])

  const isBusy = isLoading || isHandingOff

  return (
    <Box
      minH="100dvh"
      bg="gray.50"
      py={{ base: 6, md: 10 }}
      px={{ base: 4, md: 6 }}
      display="flex"
      flexDirection="column"
      alignItems="center"
    >
      {/* `my="auto"` rather than `justifyContent`: a receipt taller than the viewport still scrolls to
          its own top, where centring by alignment would cut the first card off. */}
      <Container maxW="3xl" px={0} w="full" my="auto">
        {isBusy ? <OrderConfirmationSkeleton /> : null}

        {!isBusy && (isError || !order) ? <OrderNotFoundCard /> : null}

        {!isBusy && order ? (
          <Stack gap={4}>
            <OrderStateHeader
              orderState={order.orderState}
              hasTickets={order.tickets.length > 0}
              buyerEmailMasked={order.buyerEmailMasked}
            />

            {order.orderState === "Processing" ? (
              <OrderProcessingActions
                hasPollWindowElapsed={hasPollWindowElapsed}
                isRechecking={isRechecking}
                onRecheck={recheck}
              />
            ) : null}

            <OrderSummaryCard order={order} />
            <OrderInvoiceBreakdown order={order} />
            <OrderTicketList tickets={order.tickets} canViewTickets={order.orderState === "Confirmed"} />

            {order.orderState === "Confirmed" ? (
              <OrderCompletionActions
                hasCloseFailed={completion.hasCloseFailed}
                onCloseWindow={completion.closeWindow}
                onNewRegistration={completion.newRegistration}
              />
            ) : null}
          </Stack>
        ) : null}
      </Container>
    </Box>
  )
}
