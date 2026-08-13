import { Box, Stack, Text } from "@chakra-ui/react"
import { extractApiError } from "@/utils/errors"
import { useRemoveCustomListMembers } from "../hooks/useCustomListMutations"
import { ConfirmDialog } from "@/components/common"
import type { CustomListMember } from "@/api/customLists"

const PREVIEW_COUNT = 5

interface RemoveMembersDialogProps {
  customListUniqueId: string
  customListName: string
  members: CustomListMember[]
  onClose: () => void
  onRemoved?: (memberUniqueIds: string[]) => void
}

export function RemoveMembersDialog({
  customListUniqueId,
  customListName,
  members,
  onClose,
  onRemoved,
}: RemoveMembersDialogProps) {
  const removeMutation = useRemoveCustomListMembers()
  const memberUniqueIds = members.map((member) => member.memberUniqueId)
  const isBulk = members.length > 1
  const previewMembers = members.slice(0, PREVIEW_COUNT)
  const hiddenCount = members.length - previewMembers.length

  async function handleRemove() {
    await removeMutation.mutateAsync({ uniqueId: customListUniqueId, memberUniqueIds })
    onRemoved?.(memberUniqueIds)
    onClose()
  }

  return (
    <ConfirmDialog
      title={isBulk ? `Remove ${members.length} members` : "Remove member"}
      description={
        <Stack gap={3}>
          <Text>
            {isBulk ? (
              <>
                Remove these {members.length} members from <strong>{customListName}</strong>?
              </>
            ) : (
              <>
                Remove <strong>{members[0]?.fullName}</strong> from <strong>{customListName}</strong>?
              </>
            )}{" "}
            Their membership records are not affected — only this list changes.
          </Text>

          {isBulk ? (
            <Box
              borderRadius="14px"
              border="1px solid"
              borderColor="border.subtle"
              bg="app.bg"
              px={4}
              py={3}
              maxH="180px"
              overflowY="auto"
            >
              <Stack gap={1}>
                {previewMembers.map((member) => (
                  <Text key={member.memberUniqueId} fontSize="sm" color="text.primary" lineClamp={1}>
                    {member.fullName}
                  </Text>
                ))}
                {hiddenCount > 0 ? (
                  <Text fontSize="sm" fontWeight="700" color="text.secondary">
                    and {hiddenCount} more
                  </Text>
                ) : null}
              </Stack>
            </Box>
          ) : null}
        </Stack>
      }
      confirmLabel={isBulk ? `Remove ${members.length} members` : "Remove member"}
      loadingLabel="Removing..."
      errorMessage={removeMutation.error ? extractApiError(removeMutation.error) : null}
      isPending={removeMutation.isPending}
      onConfirm={handleRemove}
      onClose={onClose}
    />
  )
}
