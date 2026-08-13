import { Text } from "@chakra-ui/react"
import { extractApiError } from "@/utils/errors"
import { useDeleteCustomList } from "../hooks/useCustomListMutations"
import { ConfirmDialog } from "@/components/common"
import type { CustomListItem } from "@/api/customLists"

interface DeleteCustomListDialogProps {
  customList: CustomListItem
  onClose: () => void
}

export function DeleteCustomListDialog({ customList, onClose }: DeleteCustomListDialogProps) {
  const deleteMutation = useDeleteCustomList()

  async function handleDelete() {
    await deleteMutation.mutateAsync(customList.uniqueId)
    onClose()
  }

  return (
    <ConfirmDialog
      title="Delete custom list"
      description={
        <Text>
          Delete <strong>{customList.name}</strong>? Its {customList.memberCount} member
          {customList.memberCount === 1 ? "" : "s"} will be removed from the list. The members themselves are not
          deleted.
        </Text>
      }
      confirmLabel="Delete list"
      loadingLabel="Deleting..."
      errorMessage={deleteMutation.error ? extractApiError(deleteMutation.error) : null}
      isPending={deleteMutation.isPending}
      onConfirm={handleDelete}
      onClose={onClose}
    />
  )
}
