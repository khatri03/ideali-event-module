import { Link as RouterLink } from "react-router-dom"
import { Box, Button, Flex, Link, Stack, Text } from "@chakra-ui/react"
import { ExternalLink, Pencil } from "lucide-react"
import { EMPTY_VALUE } from "@/utils/format"
import { APP_ROUTES } from "@/utils/routes"
import { formatUtcDate } from "@/utils/utcDates"
import { BackToInvoicesButton } from "./BackToInvoicesButton"
import { EventInvoiceStatusBadge } from "./EventInvoiceStatusBadge"
import { PrintInvoiceButton } from "./PrintInvoiceButton"

interface EventInvoiceDetailHeaderProps {
  invoiceNo: string
  invoiceStatus: string
  invoiceStatusLabel: string
  invoiceDateUtc: string
  eventUniqueId: string
  eventName: string
  /** Where the invoice's edit form lives, or undefined when the server says it can no longer be edited. */
  editHref?: string
  onBack: () => void
}

/** The page's one identity band: which order this is and what state it is in. */
export function EventInvoiceDetailHeader({
  invoiceNo,
  invoiceStatus,
  invoiceStatusLabel,
  invoiceDateUtc,
  eventUniqueId,
  eventName,
  editHref,
  onBack,
}: EventInvoiceDetailHeaderProps) {
  return (
    <Box borderRadius="20px" bg="brand.700" color="white" boxShadow="card" overflow="hidden">
      <Stack gap={{ base: 5, md: 6 }} px={{ base: 4, md: 7 }} py={{ base: 5, md: 6 }}>
        <Flex
          data-print-hide
          direction={{ base: "column", sm: "row" }}
          justify="space-between"
          align={{ base: "stretch", sm: "center" }}
          gap={2}
        >
          <BackToInvoicesButton onBack={onBack} tone="onBrand" />
          <Flex direction={{ base: "column", sm: "row" }} gap={2}>
            {editHref ? (
              <Button
                asChild
                variant="ghost"
                color="whiteAlpha.900"
                borderRadius="14px"
                minH="11"
                px={3}
                w={{ base: "full", sm: "auto" }}
                cursor="pointer"
                _hover={{ bg: "whiteAlpha.200" }}
              >
                <RouterLink to={editHref}>
                  <Pencil size={16} aria-hidden="true" />
                  Edit
                </RouterLink>
              </Button>
            ) : null}
            <PrintInvoiceButton tone="onBrand" />
          </Flex>
        </Flex>

        <Stack direction={{ base: "column", md: "row" }} justify="space-between" gap={4}>
          <Stack gap={2} minW={0}>
            <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="0.16em" color="whiteAlpha.700">
              Invoice
            </Text>
            <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="900" lineHeight="1.1" wordBreak="break-word">
              {invoiceNo}
            </Text>
            <Link
              href={APP_ROUTES.eventWizard.edit(eventUniqueId)}
              target="_blank"
              rel="noopener noreferrer"
              color="whiteAlpha.900"
              fontSize={{ base: "sm", md: "md" }}
              fontWeight="700"
              display="inline-flex"
              alignItems="center"
              gap={2}
              minH="11"
              cursor="pointer"
              _hover={{ textDecoration: "underline" }}
            >
              {eventName}
              <ExternalLink size={14} aria-hidden="true" />
            </Link>
          </Stack>

          <Stack align={{ base: "flex-start", md: "flex-end" }} gap={2} flexShrink={0}>
            <EventInvoiceStatusBadge status={invoiceStatus} label={invoiceStatusLabel} />
            <Text fontSize="sm" color="whiteAlpha.800">
              Issued {formatUtcDate(invoiceDateUtc) ?? EMPTY_VALUE}
            </Text>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  )
}
