import { Box, Skeleton, Stack } from "@chakra-ui/react"
import { CUSTOM_INVOICING_MODULE_CATALOG } from "../moduleCatalog"
import { ModuleListCard } from "./CustomInvoicingModuleList"

export function CustomInvoicingModuleListSkeleton() {
  return (
    <ModuleListCard>
      {CUSTOM_INVOICING_MODULE_CATALOG.map((entry, index) => (
        <Stack
          key={entry.key}
          data-testid="module-skeleton-row"
          direction={{ base: "column", md: "row" }}
          align={{ base: "flex-start", md: "center" }}
          gap={{ base: 3, md: 6 }}
          px={{ base: 4, md: 6 }}
          py={4}
          borderTop={index === 0 ? undefined : "1px solid"}
          borderColor="border.subtle"
        >
          <Box flex={1} w="full">
            <Skeleton height="20px" width="40%" borderRadius="6px" />
            <Skeleton mt={2} height="16px" width="80%" borderRadius="6px" />
            <Skeleton mt={2} height="14px" width="30%" borderRadius="6px" />
          </Box>
          <Skeleton height="20px" width="36px" borderRadius="999px" />
        </Stack>
      ))}
    </ModuleListCard>
  )
}
