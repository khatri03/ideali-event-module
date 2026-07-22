import { Text } from "@chakra-ui/react"
import { extractApiError } from "@/utils/errors"
import { useRemoveCustomListMembers } from "../hooks/useCustomListMutations"
import { ConfirmDialog } from "./ConfirmDialog"
import type { CustomListMember } from "@/api/customLists"

interface RemoveMemberDialogProps {
  customListUniqueId: string
  customListName: string
  member: CustomListMember
  onClose: () => void
}

export function RemoveMemberDialog({
  customListUniqueId,
  customListName,
  member,
  onClose,
}: RemoveMemberDialogProps) {
  const removeMutation = useRemoveCustomListMembers()

  async function handleRemove() {
    await removeMutation.mutateAsync({
      uniqueId: customListUniqueId,
      memberUniqueIds: [member.memberUniqueId],
    })
    onClose()
  }

  return (
    <ConfirmDialog
      title="Remove member"
      description={
        <Text>
          Remove <strong>{member.fullName}</strong> from <strong>{customListName}</strong>? Their membership record is
          not affected — only this list changes.
        </Text>
      }
      confirmLabel="Remove member"
      loadingLabel="Removing..."
      errorMessage={removeMutation.error ? extractApiError(removeMutation.error) : null}
      isPending={removeMutation.isPending}
      onConfirm={handleRemove}
      onClose={onClose}
    />
  )
}
