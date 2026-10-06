import type { ReactNode } from "react"
import { Box } from "@chakra-ui/react"
import type { ModuleRow } from "../moduleCatalog"
import { CustomInvoicingModuleRow } from "./CustomInvoicingModuleRow"

interface CustomInvoicingModuleListProps {
  rows: readonly ModuleRow[]
  pendingModuleType: ModuleRow["moduleType"]
  onToggle: (row: ModuleRow, next: boolean) => void
}

export function ModuleListCard({ children }: { children: ReactNode }) {
  return (
    <Box border="1px solid" borderColor="border.subtle" borderRadius="20px" bg="card.bg" boxShadow="card" overflow="hidden">
      {children}
    </Box>
  )
}

export function CustomInvoicingModuleList({ rows, pendingModuleType, onToggle }: CustomInvoicingModuleListProps) {
  return (
    <ModuleListCard>
      {rows.map((row, index) => (
        <Box key={row.key} borderTop={index === 0 ? undefined : "1px solid"} borderColor="border.subtle">
          <CustomInvoicingModuleRow
            name={row.name}
            description={row.description}
            isEnabled={row.isEnabled}
            isComingSoon={row.isComingSoon}
            isPending={row.moduleType !== null && row.moduleType === pendingModuleType}
            changedByName={row.changedByName}
            changedAtUtc={row.changedAtUtc}
            onToggle={(next) => onToggle(row, next)}
          />
        </Box>
      ))}
    </ModuleListCard>
  )
}
