import { ConfirmDialog, ErrorState } from "@/components/common"
import { useConfirmationRequest } from "@/hooks/useConfirmationRequest"
import { extractApiError } from "@/utils/errors"
import { useCustomInvoicingModules } from "../hooks/useCustomInvoicingModules"
import { useSetCustomInvoicingModule } from "../hooks/useSetCustomInvoicingModule"
import { buildModuleRows, type ModuleRow } from "../moduleCatalog"
import { CustomInvoicingModuleList } from "./CustomInvoicingModuleList"
import { CustomInvoicingModuleListSkeleton } from "./CustomInvoicingModuleList.skeleton"

export function CustomInvoicingModulesManager() {
  const modulesQuery = useCustomInvoicingModules()
  const toggleMutation = useSetCustomInvoicingModule()
  const turnOff = useConfirmationRequest<ModuleRow>()

  function handleToggle(row: ModuleRow, next: boolean) {
    if (!row.moduleType) {
      return
    }
    if (next) {
      toggleMutation.mutate({ moduleType: row.moduleType, isEnabled: true })
      return
    }
    turnOff.open(row)
  }

  function handleConfirmTurnOff() {
    const moduleType = turnOff.request?.moduleType
    if (!moduleType) {
      return
    }
    toggleMutation.mutate({ moduleType, isEnabled: false }, { onSettled: turnOff.close })
  }

  if (modulesQuery.isError) {
    return (
      <ErrorState
        title="Could not load modules"
        message={extractApiError(modulesQuery.error)}
        isRetrying={modulesQuery.isFetching}
        onRetry={() => void modulesQuery.refetch()}
      />
    )
  }

  if (!modulesQuery.data) {
    return <CustomInvoicingModuleListSkeleton />
  }

  const pendingName = turnOff.request?.name ?? ""

  return (
    <>
      <CustomInvoicingModuleList
        rows={buildModuleRows(modulesQuery.data)}
        pendingModuleType={toggleMutation.isPending ? toggleMutation.variables.moduleType : null}
        onToggle={handleToggle}
      />

      {turnOff.request ? (
        <ConfirmDialog
          open={turnOff.isOpen}
          title={`Turn off custom invoicing for ${pendingName}?`}
          description={`Organizers will not be able to create new ${pendingName} custom invoices. Invoices already created stay viewable, payable through their link and settleable.`}
          confirmLabel="Turn off"
          loadingLabel="Turning off..."
          tone="destructive"
          isPending={toggleMutation.isPending}
          onConfirm={handleConfirmTurnOff}
          onClose={turnOff.close}
        />
      ) : null}
    </>
  )
}
