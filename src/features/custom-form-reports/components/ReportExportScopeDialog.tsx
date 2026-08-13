import { Box, Button, CloseButton, Dialog, Flex, Stack, Text } from "@chakra-ui/react"
import { Download, FileDown } from "lucide-react"
import { REPORT_EXPORT_SCOPE, type ReportExportScope } from "@/api/customFormReports"

interface ReportExportScopeDialogProps {
  formatLabel: string
  pageRowCount: number
  totalRowCount: number
  isExporting: boolean
  onConfirm: (scope: ReportExportScope) => void
  onClose: () => void
}

function rowLabel(count: number) {
  return count === 1 ? "1 row" : `${count.toLocaleString()} rows`
}

export function ReportExportScopeDialog({
  formatLabel,
  pageRowCount,
  totalRowCount,
  isExporting,
  onConfirm,
  onClose,
}: ReportExportScopeDialogProps) {
  return (
    <Dialog.Root open role="alertdialog" size={{ base: "full", md: "lg" }} onOpenChange={(details) => (details.open ? null : onClose())}>
      <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
      <Dialog.Positioner p={{ base: 0, md: 4 }}>
        <Dialog.Content
          bg="white"
          borderRadius={{ base: "0", md: "24px" }}
          w="full"
          maxW={{ base: "full", md: "560px" }}
          h={{ base: "100dvh", md: "auto" }}
          maxH={{ base: "100dvh", md: "calc(100dvh - 2rem)" }}
          alignSelf="center"
          mx="auto"
          overflow="auto"
        >
          <Box px={{ base: 5, md: 6 }} pt={6} pb={4}>
            <Flex align="flex-start" justify="space-between" gap={4}>
              <Flex align="center" gap={3}>
                <Flex
                  w="44px"
                  h="44px"
                  borderRadius="14px"
                  bg="brand.50"
                  color="brand.600"
                  align="center"
                  justify="center"
                  flexShrink={0}
                >
                  <FileDown size={20} aria-hidden />
                </Flex>
                <Dialog.Title fontSize={{ base: "md", md: "lg" }} fontWeight="800" color="gray.900">
                  Download as {formatLabel}
                </Dialog.Title>
              </Flex>

              <Dialog.CloseTrigger asChild>
                <CloseButton aria-label="Close download options" cursor="pointer" />
              </Dialog.CloseTrigger>
            </Flex>
          </Box>

          <Dialog.Body px={{ base: 5, md: 6 }} pb={6}>
            <Text fontSize="sm" color="gray.700">
              Choose how much of this report to download. Both keep the columns, filters and order you are looking at.
            </Text>

            <Stack gap={3} pt={5}>
              <ScopeChoice
                title="This page only"
                detail={rowLabel(pageRowCount)}
                isExporting={isExporting}
                onSelect={() => onConfirm(REPORT_EXPORT_SCOPE.currentPage)}
              />
              <ScopeChoice
                title="Every row matching the filters"
                detail={rowLabel(totalRowCount)}
                isExporting={isExporting}
                onSelect={() => onConfirm(REPORT_EXPORT_SCOPE.allMatchingRows)}
              />
            </Stack>

            <Flex pt={6} justify="flex-end">
              <Button
                variant="outline"
                colorPalette="gray"
                borderRadius="14px"
                h="44px"
                px={6}
                w={{ base: "full", md: "auto" }}
                minW={{ md: "120px" }}
                cursor={isExporting ? "not-allowed" : "pointer"}
                disabled={isExporting}
                onClick={onClose}
              >
                Cancel
              </Button>
            </Flex>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

interface ScopeChoiceProps {
  title: string
  detail: string
  isExporting: boolean
  onSelect: () => void
}

function ScopeChoice({ title, detail, isExporting, onSelect }: ScopeChoiceProps) {
  return (
    <Button
      variant="outline"
      h="auto"
      minH="11"
      py={4}
      px={5}
      borderRadius="16px"
      justifyContent="space-between"
      textAlign="left"
      whiteSpace="normal"
      cursor={isExporting ? "not-allowed" : "pointer"}
      disabled={isExporting}
      loading={isExporting}
      loadingText="Preparing..."
      onClick={onSelect}
    >
      <Text fontSize="sm" fontWeight="700" color="gray.900">
        {title}
      </Text>
      <Flex align="center" gap={2} color="gray.600">
        <Text fontSize="sm" fontWeight="600">
          {detail}
        </Text>
        <Download size={16} aria-hidden />
      </Flex>
    </Button>
  )
}
