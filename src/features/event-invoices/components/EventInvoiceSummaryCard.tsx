import type { ReactNode } from "react"
import { Badge, Box, Flex, HStack, Link, Separator, SimpleGrid, Stack, Table, Text } from "@chakra-ui/react"
import { format } from "date-fns"
import type { EventInvoiceDetail } from "@/api/eventInvoices"
import { APP_ROUTES } from "@/utils/routes"
import { parseUtcDateTime } from "@/utils/utcDates"

interface EventInvoiceSummaryCardProps {
  invoice: EventInvoiceDetail
}

function formatDate(value: string) {
  const parsed = parseUtcDateTime(value)
  return parsed ? format(parsed, "MMM d, yyyy") : "-"
}

function formatMoney(value: number | null | undefined, currencySymbol: string) {
  if (value === null || value === undefined) return "-"
  return `${currencySymbol}${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`
}

function DetailPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box border="1px solid" borderColor="border.subtle" borderRadius="16px" bg="app.bg" p={{ base: 4, md: 5 }}>
      <Text fontSize="xs" fontWeight="800" color="text.secondary" textTransform="uppercase" letterSpacing="0.12em" mb={3}>
        {title}
      </Text>
      <Stack gap={1}>{children}</Stack>
    </Box>
  )
}

function MutedLine({ children }: { children: ReactNode }) {
  return (
    <Text fontSize="sm" color="text.secondary">
      {children}
    </Text>
  )
}

function EventWizardLink({ eventUniqueId, eventName }: { eventUniqueId: string; eventName: string }) {
  return (
    <Link
      href={APP_ROUTES.eventWizard.edit(eventUniqueId)}
      target="_blank"
      rel="noopener noreferrer"
      fontSize="md"
      fontWeight="800"
      color="inherit"
      cursor="pointer"
      display="inline-flex"
      minH="11"
      alignItems="center"
      _hover={{ textDecoration: "underline" }}
    >
      {eventName}
    </Link>
  )
}

function TotalRow({ label, value, isStrong = false }: { label: string; value: string; isStrong?: boolean }) {
  return (
    <Flex justify="space-between" gap={4} py={2}>
      <Text fontSize={isStrong ? "md" : "sm"} fontWeight={isStrong ? "800" : "600"} color={isStrong ? "text.primary" : "text.secondary"}>
        {label}
      </Text>
      <Text fontSize={isStrong ? "md" : "sm"} fontWeight="800" color="text.primary" textAlign="right">
        {value}
      </Text>
    </Flex>
  )
}

function ChargeRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" gap={4} py={1.5} pl={3}>
      <Text fontSize="sm" fontWeight="600" color="text.secondary">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="700" color="text.primary" textAlign="right">
        {value}
      </Text>
    </Flex>
  )
}

export function EventInvoiceSummaryCard({ invoice }: EventInvoiceSummaryCardProps) {
  const charges = [...invoice.charges].sort((left, right) => left.displayOrder - right.displayOrder)

  return (
    <Box border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" boxShadow="card" overflow="hidden">
      <Box bg="brand.700" color="white" px={{ base: 4, md: 7 }} py={{ base: 5, md: 7 }}>
        <Stack direction={{ base: "column", md: "row" }} justify="space-between" gap={5}>
          <Stack gap={2}>
            <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="0.16em" color="whiteAlpha.800">
              Invoice
            </Text>
            <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="900" lineHeight="1.1">
              {invoice.invoiceNo}
            </Text>
            <Text fontSize={{ base: "sm", md: "md" }} color="whiteAlpha.800">
              <EventWizardLink eventUniqueId={invoice.eventUniqueId} eventName={invoice.eventName} />
            </Text>
          </Stack>

          <Stack align={{ base: "flex-start", md: "flex-end" }} gap={2}>
            <Badge colorPalette="brand" bg="white" color="brand.700" borderRadius="full" px={4} py={2} fontSize="sm">
              {invoice.invoiceStatusLabel}
            </Badge>
            <Text fontSize="sm" color="whiteAlpha.800">
              Issued {formatDate(invoice.invoiceDateUtc)}
            </Text>
          </Stack>
        </Stack>
      </Box>

      <Stack gap={{ base: 5, md: 6 }} px={{ base: 4, md: 7 }} py={{ base: 5, md: 7 }}>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <DetailPanel title="Billed to">
            <Text fontSize="md" fontWeight="800" color="text.primary">
              {invoice.buyerName || "-"}
            </Text>
            <MutedLine>{invoice.buyerEmail || "-"}</MutedLine>
            <MutedLine>{invoice.buyerPhone || "-"}</MutedLine>
          </DetailPanel>

          <DetailPanel title="Purchase">
            <EventWizardLink eventUniqueId={invoice.eventUniqueId} eventName={invoice.eventName} />
            <MutedLine>Event invoice</MutedLine>
            {invoice.discountCouponCode ? (
              <MutedLine>
                Coupon <Text as="span" fontWeight="800">{invoice.discountCouponCode}</Text>
              </MutedLine>
            ) : null}
          </DetailPanel>
        </SimpleGrid>

        <Box border="1px solid" borderColor="border.subtle" borderRadius="16px" overflowX="auto">
          <Table.Root variant="line" size="sm" minW="760px">
            <Table.Header>
              <Table.Row bg="app.bg">
                <Table.ColumnHeader px={4} py={3}>Item</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3}>Session</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3} textAlign="center">Qty</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3} textAlign="right">Unit price</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3} textAlign="right">Total</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {invoice.lineItems.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={5} px={4} py={8} textAlign="center" color="text.secondary">
                    No ticket lines on this invoice.
                  </Table.Cell>
                </Table.Row>
              ) : (
                invoice.lineItems.map((item) => (
                  <Table.Row key={item.invoiceItemUniqueId}>
                    <Table.Cell px={4} py={4} fontWeight="800" color="text.primary">
                      {item.ticketTypeName}
                    </Table.Cell>
                    <Table.Cell px={4} py={4} color="text.secondary">
                      {item.sessionName}
                    </Table.Cell>
                    <Table.Cell px={4} py={4} textAlign="center" color="text.primary">
                      {item.quantity}
                    </Table.Cell>
                    <Table.Cell px={4} py={4} textAlign="right" color="text.secondary">
                      {formatMoney(item.unitPrice, invoice.currencySymbol)}
                    </Table.Cell>
                    <Table.Cell px={4} py={4} textAlign="right" fontWeight="800" color="text.primary">
                      {formatMoney(item.lineTotal, invoice.currencySymbol)}
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table.Root>
        </Box>

        <Flex justify="flex-end">
          <Box w={{ base: "full", md: "360px" }}>
            <TotalRow label="Subtotal" value={formatMoney(invoice.subTotal, invoice.currencySymbol)} />
            {charges.length > 0 ? (
              <Stack gap={0} mt={1} mb={2}>
                {charges.map((charge) => (
                  <ChargeRow key={`${charge.displayOrder}-${charge.label}-${charge.amount}`} label={charge.label} value={formatMoney(charge.amount, invoice.currencySymbol)} />
                ))}
              </Stack>
            ) : null}
            <TotalRow label="Discount" value={formatMoney(invoice.discountAmount, invoice.currencySymbol)} />
            <Separator my={2} />
            <TotalRow label="Total" value={formatMoney(invoice.totalAmount, invoice.currencySymbol)} isStrong />
            <HStack justify="space-between" bg="brand.100" color="brand.700" borderRadius="14px" px={4} py={3} mt={2}>
              <Text fontSize="sm" fontWeight="900">
                Balance
              </Text>
              <Text fontSize="lg" fontWeight="900">
                {formatMoney(invoice.balanceAmount, invoice.currencySymbol)}
              </Text>
            </HStack>
          </Box>
        </Flex>
      </Stack>
    </Box>
  )
}
